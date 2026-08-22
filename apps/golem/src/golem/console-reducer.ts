// The Console's pure core. Every decision a typed command makes — which lines it prints, which
// state it moves, which impure act it asks the shell to perform — lives here as a function over a
// model, so the whole control surface is testable without a DOM (ADR 0018). `use-console.ts` is the
// thin shell that holds the refs, drives the clock, and runs the Effects this returns.

import { outputFilename } from '../export/output'
import { assemble, type Image, wordIndexForLine } from './assembler'
import type { CacheAccess, CacheState } from './cache'
import { spotlightOf } from './cache-view'
import { type Command, nearest } from './command'
import { helpFor, helpLines } from './help'
import { formatMemoryDump, formatRegister, hex32 } from './inspect'
import { HARDWARE_1_VECTOR, HARDWARE_2_VECTOR, PC, registerIndex, SOFTWARE_VECTOR } from './isa'
import { createMachine, type Machine, type StepEvent, step } from './machine'
import { PROGRAM_NAMES, PROGRAMS, programNamed } from './programs'
import { formatCacheStatisticsPair, formatHex, formatStep, frameTrace } from './trace'

/** The clock rate — a plain step-count, or `max` for as-fast-as-the-frame. Owned by `useClock`. */
export type ClockRate = number | 'max'

/** A Console log entry before the shell assigns it an id. */
export interface ConsoleEntry {
  kind: 'echo' | 'info' | 'error'
  text: string
}

/**
 * Everything a command reads or writes, consolidated. It is the machine of record the shell holds
 * in a ref (the clock steps far faster than React should re-render) and mirrors into state for the
 * panels. The trace and the clock are *not* here: the trace is a mutable accumulator the shell
 * appends to per Step (immutable growth would be quadratic under `clock max`), and the clock is
 * owned by `useClock` — this reads its rate/running through the context and steers it by Effect.
 */
export interface ConsoleModel {
  source: string
  machine: Machine | null
  image: Image | null
  /** The cache mode the next `run` bakes into its Machine. Settable only while none exists (ADR 0023). */
  cacheMode: boolean
  /** The program `load` awaits a second confirmation on, or null. Cleared by any other command. */
  pendingLoad: string | null
  breakpoints: ReadonlySet<number>
  /** The PC a run paused at, skipped once on resume. Cleared whenever the Machine is stepped or replaced. */
  pausedPc: number | null
  cacheSpotlight: CacheAccess | null
}

/** An impure act the reducer asks the shell to perform. The shell's `runEffects` is the interpreter. */
export type Effect =
  | { kind: 'start-clock' }
  | { kind: 'stop-clock' }
  | { kind: 'set-rate'; rate: ClockRate }
  | { kind: 'download'; filename: string; text: string }
  /** The trace lives in the shell's accumulator, so the effect names the file and the shell fills it. */
  | { kind: 'export-trace'; filename: string }
  | { kind: 'share'; source: string }
  | { kind: 'persist-source'; source: string }
  | { kind: 'reset-trace' }
  /** The Console log lives in the shell's state, not the model, so wiping it is an act, not a value. */
  | { kind: 'clear-console' }

/** The read-only snapshot a command needs but the model does not own: the clock, and the trace length. */
export interface ReduceContext {
  running: boolean
  rate: ClockRate
  traceLength: number
  initialSource: string
}

export interface CommandResult {
  model: ConsoleModel
  lines: ConsoleEntry[]
  /** New trace lines this command produced (0–1), appended by the shell under its own limit. */
  trace: string[]
  effects: Effect[]
}

// All five reference programs run in under 400 instructions; generous enough that a real program is
// never truncated, bounded so `clock max` on an endless loop cannot exhaust memory.
export const TRACE_LIMIT = 100_000

/** The source line the PC sits on, or null when it points outside the assembled program. */
export function lineOfPc(machine: Machine | null, image: Image | null): number | null {
  if (machine === null || image === null) {
    return null
  }
  return image.lineForWord[machine.registers[PC] >>> 2] ?? null
}

/**
 * One Console line per dispatch, naming the cause and the vector it landed on — otherwise a dispatch
 * mid-`run` is invisible, the PC simply somewhere else with nothing saying who moved it.
 */
function narrate(event: Exclude<StepEvent, { kind: 'cache' }>): string {
  switch (event.kind) {
    case 'software-interrupt':
      return `software interrupt — cause ${hex32(event.cause)}, vector ${hex32(SOFTWARE_VECTOR)}`
    // Narrated even when IE is clear and no dispatch follows: "there is garbage at this address"
    // is the more useful half of the news either way.
    case 'invalid-instruction':
      return `invalid instruction at ${hex32(event.pc)}`
    // Names the device, not just the line number: "who interrupted my program" is the question
    // the narration exists to answer.
    case 'hardware-interrupt':
      return event.line === 1
        ? `hardware interrupt 1 — the watchdog, vector ${hex32(HARDWARE_1_VECTOR)}`
        : `hardware interrupt 2 — the fpu, vector ${hex32(HARDWARE_2_VECTOR)}`
  }
}

/**
 * What a halt puts on the Console: `halted`, and — the one per-run cache moment — one boletim line
 * per cache. The panel carries the per-access flow, so the Console stays silent on it until the end.
 */
function haltLines(machine: Machine): ConsoleEntry[] {
  const lines: ConsoleEntry[] = [{ kind: 'info', text: 'halted' }]
  if (machine.cache !== undefined) {
    lines.push(
      ...formatCacheStatisticsPair(machine.cache).map((text) => ({ kind: 'info' as const, text })),
    )
  }
  return lines
}

/** Frames the recorded lines for export, marking truncation when the limit was hit. */
export function wrapTrace(lines: string[], terminal: string, cache?: CacheState): string {
  const body =
    lines.length < TRACE_LIMIT ? lines : [...lines, `[TRACE TRUNCATED AT ${TRACE_LIMIT}]`]
  // The cache stats footer rides along when the mode is on; with it off, `cache` is undefined and
  // the export is byte-identical to the v2 trace.
  return frameTrace(body, terminal, cache)
}

/**
 * Whether replacing this Source would destroy anything. The starter example and a program that was
 * itself loaded are not the operator's work, so `load` overwrites them without ceremony.
 */
function isDisposable(current: string, initialSource: string): boolean {
  return (
    current.trim() === '' ||
    current === initialSource ||
    PROGRAMS.some((program) => program.source === current)
  )
}

/**
 * Advances one instruction, formats its trace entry, and narrates anything that happened *to* the
 * program. Pure — the shell appends the returned trace line to its accumulator and mirrors the
 * Machine. Shared by the `step` command and the run loop's `advanceOnce`, so both step the same way.
 */
export function stepWithTrace(current: Machine): {
  machine: Machine
  trace: string
  lines: ConsoleEntry[]
  spotlight: CacheAccess | null
} {
  const { machine: next, events } = step(current)
  const trace = formatStep(current, next, events)
  // Cache accesses happen every Step; narrating each would drown the Console (the panel carries the
  // per-access flow). Only dispatches are narrated — one line per event.
  const dispatches = events.filter(
    (event): event is Exclude<StepEvent, { kind: 'cache' }> => event.kind !== 'cache',
  )
  const lines = dispatches.map((event) => ({ kind: 'info' as const, text: narrate(event) }))
  return { machine: next, trace, lines, spotlight: spotlightOf(events) }
}

/** The model after a Step lands: the new Machine, the paused PC cleared, the spotlight advanced. */
function applyStep(
  model: ConsoleModel,
  stepped: { machine: Machine; spotlight: CacheAccess | null },
): ConsoleModel {
  return {
    ...model,
    machine: stepped.machine,
    // Stepping clears the paused PC, so a later pause on the same line trips fresh.
    pausedPc: null,
    // Absent only when the cache is off — leave the last spotlight standing rather than blanking.
    cacheSpotlight: stepped.spotlight ?? model.cacheSpotlight,
  }
}

export type AdvanceResult =
  | { kind: 'idle' }
  | { kind: 'paused'; model: ConsoleModel; lines: ConsoleEntry[] }
  | { kind: 'stepped'; model: ConsoleModel; lines: ConsoleEntry[]; trace: string[] }
  | { kind: 'halted'; model: ConsoleModel; lines: ConsoleEntry[]; trace: string[] }

/**
 * One tick of a `run`: the pure decision the imperative rAF loop wraps. The breakpoint is checked
 * *before* stepping, so a breakpoint on the starting line pauses a fresh run; resuming is the
 * exception — the PC the run paused at is remembered in the model and its breakpoint skipped once,
 * then cleared by the step that moves off it. Returns `idle` when there is nothing left to run.
 */
export function advanceOnce(model: ConsoleModel): AdvanceResult {
  const current = model.machine
  if (current === null || current.halted) {
    return { kind: 'idle' }
  }

  const line = lineOfPc(current, model.image)
  const pc = current.registers[PC]
  if (line !== null && model.breakpoints.has(line) && model.pausedPc !== pc) {
    return {
      kind: 'paused',
      model: { ...model, pausedPc: pc },
      lines: [{ kind: 'info', text: `paused at line ${line}` }],
    }
  }

  const stepped = stepWithTrace(current)
  const next = applyStep(model, stepped)
  if (stepped.machine.halted) {
    return {
      kind: 'halted',
      model: next,
      lines: [...stepped.lines, ...haltLines(stepped.machine)],
      trace: [stepped.trace],
    }
  }
  return { kind: 'stepped', model: next, lines: stepped.lines, trace: [stepped.trace] }
}

/** Assembles and instantiates, reporting either way. Pure: `assemble` and `createMachine` are pure. */
function tryBuild(model: ConsoleModel): {
  model: ConsoleModel
  lines: ConsoleEntry[]
  effects: Effect[]
  ok: boolean
} {
  if (model.machine !== null) {
    return {
      model,
      lines: [{ kind: 'info', text: 'already assembled — reset to edit and assemble again' }],
      effects: [],
      ok: true,
    }
  }

  const result = assemble(model.source)
  if (!result.ok) {
    return {
      model,
      lines: result.errors.map((error) => ({
        kind: 'error' as const,
        text: `line ${error.line}: ${error.message}`,
      })),
      effects: [],
      ok: false,
    }
  }

  // Blank lines and comments assemble to zero words without error, and a machine over an empty image
  // never halts — every fetch reads 0, an implicit nop, and no `int 0` ever arrives.
  if (result.image.words.length === 0) {
    return {
      model,
      lines: [{ kind: 'error', text: 'nothing to assemble — the Source has no instructions' }],
      effects: [],
      ok: false,
    }
  }

  return {
    model: {
      ...model,
      image: result.image,
      machine: createMachine(result.image, { cache: model.cacheMode }),
      cacheSpotlight: null,
      pausedPc: null,
    },
    lines: [
      {
        kind: 'info',
        text: `assembled ${result.image.words.length} words — editor locked, reset to edit`,
      },
    ],
    effects: [{ kind: 'reset-trace' }],
    ok: true,
  }
}

/**
 * The whole Console control surface, as one pure function. Given the model, a parsed command and the
 * read-only context (clock, trace length), returns the next model plus the lines, trace delta and
 * Effects the command produced. The shell applies them.
 */
export function reduceCommand(
  model: ConsoleModel,
  command: Command,
  ctx: ReduceContext,
): CommandResult {
  // Any command other than `load` cancels a pending load confirmation, so it cannot be answered by
  // something typed minutes later.
  let m: ConsoleModel = command.kind === 'load' ? model : { ...model, pendingLoad: null }
  const lines: ConsoleEntry[] = []
  const trace: string[] = []
  const effects: Effect[] = []

  const done = (): CommandResult => ({ model: m, lines, trace, effects })
  const noMachine = (): CommandResult => {
    lines.push({ kind: 'error', text: 'no machine — run asm first' })
    return done()
  }

  switch (command.kind) {
    case 'asm': {
      const built = tryBuild(m)
      m = built.model
      lines.push(...built.lines)
      effects.push(...built.effects)
      return done()
    }

    case 'run': {
      const built = tryBuild(m)
      m = built.model
      lines.push(...built.lines)
      effects.push(...built.effects)
      if (!built.ok) {
        return done()
      }
      if (m.machine?.halted) {
        lines.push({ kind: 'info', text: 'machine halted — reset to run again' })
        return done()
      }
      effects.push({ kind: 'start-clock' })
      lines.push({
        kind: 'info',
        text: `running at ${ctx.rate === 'max' ? 'max' : `${ctx.rate}/s`} — stop to pause`,
      })
      return done()
    }

    case 'stop':
      if (!ctx.running) {
        lines.push({ kind: 'info', text: 'not running' })
        return done()
      }
      effects.push({ kind: 'stop-clock' })
      lines.push({ kind: 'info', text: 'stopped' })
      return done()

    case 'clock':
      effects.push({ kind: 'set-rate', rate: command.rate })
      lines.push({
        kind: 'info',
        text: `clock set to ${command.rate === 'max' ? 'max' : `${command.rate} steps/s`}`,
      })
      return done()

    case 'cache': {
      // Bare `cache` inspects: a live Machine's statistics, or the mode the next run will use.
      if (command.mode === null) {
        if (m.machine === null) {
          lines.push({
            kind: 'info',
            text: `cache is ${m.cacheMode ? 'on' : 'off'} — the next run ${m.cacheMode ? 'will classify each access' : 'runs without the lens'}`,
          })
          return done()
        }
        if (m.machine.cache === undefined) {
          lines.push({ kind: 'info', text: 'cache is off for this machine' })
          return done()
        }
        lines.push(
          ...formatCacheStatisticsPair(m.machine.cache).map((text) => ({
            kind: 'info' as const,
            text,
          })),
        )
        return done()
      }

      // Toggling is gated on there being no Machine — the same three-state rule that freezes the
      // editor and gates `load`, so a trace is never half-wrapped (ADR 0023).
      if (m.machine !== null) {
        lines.push({ kind: 'error', text: 'a machine exists — reset first, then cache on/off' })
        return done()
      }
      const on = command.mode === 'on'
      m = { ...m, cacheMode: on }
      lines.push({
        kind: 'info',
        text: on
          ? 'cache on — the next run will classify each access'
          : 'cache off — the next run runs without the lens',
      })
      return done()
    }

    case 'step': {
      effects.push({ kind: 'stop-clock' })
      if (m.machine === null) {
        return noMachine()
      }
      if (m.machine.halted) {
        lines.push({ kind: 'info', text: 'machine halted — reset to run again' })
        return done()
      }
      const stepped = stepWithTrace(m.machine)
      m = applyStep(m, stepped)
      trace.push(stepped.trace)
      lines.push(...stepped.lines)
      if (stepped.machine.halted) {
        lines.push(...haltLines(stepped.machine))
      } else {
        lines.push({ kind: 'info', text: `pc = ${hex32(stepped.machine.registers[PC])}` })
      }
      return done()
    }

    case 'export': {
      if (command.what === 'hex') {
        if (m.image === null) {
          lines.push({ kind: 'error', text: 'no image — run asm first' })
          return done()
        }
        const filename = outputFilename('hex-export')
        effects.push({ kind: 'download', filename, text: formatHex(m.image.words) })
        lines.push({ kind: 'info', text: `wrote ${filename}` })
        return done()
      }

      if (m.machine === null) {
        return noMachine()
      }
      const filename = outputFilename('trace-export')
      effects.push({ kind: 'export-trace', filename })
      lines.push({
        kind: 'info',
        text: `wrote ${filename} — ${ctx.traceLength} instructions`,
      })
      return done()
    }

    case 'load': {
      if (command.name === null) {
        lines.push({ kind: 'info', text: 'programs:' })
        lines.push(
          ...PROGRAMS.map((program) => ({
            kind: 'info' as const,
            text: `  ${program.name.padEnd(14)}${program.summary}`,
          })),
        )
        return done()
      }

      // The three-state model holds by construction: with a Machine alive the editor is locked, so
      // there is nothing to load into.
      if (m.machine !== null) {
        lines.push({ kind: 'error', text: 'a machine is running — reset first, then load' })
        return done()
      }

      const program = programNamed(command.name)
      if (program === null) {
        const suggestion = nearest(command.name, PROGRAM_NAMES)
        lines.push({
          kind: 'error',
          text: suggestion
            ? `no program called "${command.name}" — did you mean "${suggestion}"?`
            : `no program called "${command.name}" — try "load" to list them`,
        })
        return done()
      }

      // Loading destroys the editor. Work the operator typed earns one refusal first; the starter
      // example and an already-loaded program are not work, so `load watchdog`, `run` stays one step.
      if (!isDisposable(m.source, ctx.initialSource) && m.pendingLoad !== program.name) {
        m = { ...m, pendingLoad: program.name }
        lines.push({
          kind: 'error',
          text: `"load ${program.name}" would replace what you have written — run it again to confirm, or "share" first to keep a link to it`,
        })
        return done()
      }

      m = { ...m, pendingLoad: null, source: program.source }
      effects.push({ kind: 'persist-source', source: program.source })
      lines.push({ kind: 'info', text: `loaded ${program.name} — ${program.summary}` })
      return done()
    }

    case 'reset':
      effects.push({ kind: 'stop-clock' }, { kind: 'reset-trace' })
      m = { ...m, machine: null, image: null, cacheSpotlight: null, pausedPc: null }
      lines.push({ kind: 'info', text: 'machine destroyed — editor unlocked' })
      return done()

    case 'reg': {
      if (m.machine === null) {
        return noMachine()
      }
      const index = registerIndex(command.name)
      if (index === null) {
        lines.push({
          kind: 'error',
          text: `no register called "${command.name}" — try r0..r31, or pc, ir, er, fr, cr, ipc`,
        })
        return done()
      }
      lines.push({ kind: 'info', text: formatRegister(index, m.machine.registers[index]) })
      return done()
    }

    case 'mem': {
      if (m.machine === null) {
        return noMachine()
      }
      lines.push(
        ...formatMemoryDump(m.machine.memory, command.start, command.count, command.unit).map(
          (text) => ({ kind: 'info' as const, text }),
        ),
      )
      return done()
    }

    case 'share':
      effects.push({ kind: 'share', source: m.source })
      return done()

    case 'help':
      lines.push(
        ...(command.topic === null ? helpLines() : helpFor(command.topic)).map((text) => ({
          kind: 'info' as const,
          text,
        })),
      )
      return done()

    case 'break': {
      if (m.image !== null && !wordIndexForLine(m.image).has(command.line)) {
        lines.push({ kind: 'error', text: `line ${command.line} has no instruction to stop at` })
        return done()
      }
      const next = new Set(m.breakpoints)
      next.add(command.line)
      m = { ...m, breakpoints: next }
      lines.push({
        kind: 'info',
        text:
          m.image === null
            ? `breakpoint at line ${command.line} — unchecked until you assemble`
            : `breakpoint at line ${command.line}`,
      })
      return done()
    }

    case 'breaks': {
      const set = [...m.breakpoints].sort((a, b) => a - b)
      lines.push({
        kind: 'info',
        text: set.length === 0 ? 'no breakpoints' : `breakpoints: ${set.join(', ')}`,
      })
      return done()
    }

    case 'unbreak': {
      if (command.line === 'all') {
        m = { ...m, breakpoints: new Set() }
        lines.push({ kind: 'info', text: 'all breakpoints cleared' })
        return done()
      }
      const next = new Set(m.breakpoints)
      const removed = next.delete(command.line)
      m = { ...m, breakpoints: next }
      lines.push({
        kind: removed ? 'info' : 'error',
        text: removed
          ? `breakpoint at line ${command.line} cleared`
          : `no breakpoint at line ${command.line}`,
      })
      return done()
    }

    case 'bad-usage':
      lines.push({ kind: 'error', text: command.message })
      return done()

    case 'unknown':
      lines.push({
        kind: 'error',
        text: command.suggestion
          ? `unknown command "${command.input}" — did you mean "${command.suggestion}"?`
          : `unknown command "${command.input}"`,
      })
      return done()

    // Prints nothing: a line saying "cleared" is the one thing that would survive the clearing.
    case 'clear':
      effects.push({ kind: 'clear-console' })
      return done()

    // Filtered out in the shell before dispatch; handled for exhaustiveness.
    case 'empty':
      return done()
  }
}
