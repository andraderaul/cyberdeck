// The impure shell. Owns `Source → Image → Machine` and nothing else — every decision it makes
// is delegated to a pure function in `src/golem/`.

import { useCallback, useRef, useState } from 'react'
import { downloadText, outputFilename } from '../export/output'
import { assemble, type Image, wordIndexForLine } from '../golem/assembler'
import { type Command, nearest, parseCommand } from '../golem/command'
import { GREETING, helpFor, helpLines } from '../golem/help'
import { formatMemoryDump, formatRegister, hex32 } from '../golem/inspect'
import {
  HARDWARE_1_VECTOR,
  HARDWARE_2_VECTOR,
  PC,
  registerIndex,
  SOFTWARE_VECTOR,
} from '../golem/isa'
import { createMachine, type Machine, type StepEvent, step } from '../golem/machine'
import { PROGRAM_NAMES, PROGRAMS, programNamed } from '../golem/programs'
import { encode } from '../golem/share'
import { formatHex, formatStep, frameTrace } from '../golem/trace'
import { type ClockRate, useClock } from './use-clock'
import { clearShareFragment, saveSource } from './use-source-loading'

/** A line in the Console log. `echo` is what the operator typed, the rest is the tool answering. */
export interface ConsoleLine {
  id: number
  kind: 'echo' | 'info' | 'error'
  text: string
}

export interface ConsoleState {
  source: string
  machine: Machine | null
  image: Image | null
  lines: ConsoleLine[]
  running: boolean
  rate: ClockRate
  /** Commands already entered, oldest first — the Console walks these with the arrow keys. */
  history: string[]
  /** Source lines carrying a breakpoint. Presentation state: they outlive the Machine. */
  breakpoints: ReadonlySet<number>
  /** The source line the PC currently sits on, or null when nothing is loaded. */
  currentLine: number | null
  /**
   * The editor is writable exactly while no Machine exists. Divergence between the source on
   * screen and the code executing is impossible by construction, not prevented by syncing.
   */
  editable: boolean
  setSource: (source: string) => void
  /** Replaces the Source wholesale — used when a share link or saved work resolves. */
  replaceSource: (source: string) => void
  /** Writes a line to the Console without it having been typed. */
  note: (text: string, kind?: 'info' | 'error') => void
  submit: (input: string) => void
}

// All five reference programs run in under 400 instructions; this is generous enough that a real
// program is never truncated, and bounded so `clock max` on an endless loop cannot exhaust memory.
const TRACE_LIMIT = 100_000

/** The source line the PC is sitting on, or null when it points outside the assembled program. */
function lineOfPc(machine: Machine | null, image: Image | null): number | null {
  if (machine === null || image === null) {
    return null
  }
  return image.lineForWord[machine.registers[PC] >>> 2] ?? null
}

/**
 * One Console line per dispatch, naming the cause and the vector it landed on. Per dispatch and
 * not per Step, which is what bounds the narration on a program that interrupts in a loop.
 *
 * This exists because a dispatch mid-`run` is otherwise invisible: the PC simply is somewhere
 * else, with nothing on screen saying who moved it.
 */
function narrate(event: StepEvent): string {
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
 * Frames the recorded lines for export, marking truncation when the limit was hit. The Terminal
 * output rides along so an exported trace still diffs clean against the reference `.out`, which
 * ends with what the program printed.
 */
function wrapTrace(lines: string[], terminal: string): string {
  const body =
    lines.length < TRACE_LIMIT ? lines : [...lines, `[TRACE TRUNCATED AT ${TRACE_LIMIT}]`]
  return frameTrace(body, terminal)
}

/**
 * Builds the share URL and puts it on the clipboard, reporting either way. The URL is printed
 * whether or not the copy works, so a browser that blocks clipboard access still leaves something
 * to select by hand.
 */
async function shareSource(
  source: string,
  append: (entries: Omit<ConsoleLine, 'id'>[]) => void,
): Promise<void> {
  try {
    const fragment = await encode(source)
    const url = `${window.location.origin}${window.location.pathname}#${fragment}`
    window.history.replaceState(null, '', `#${fragment}`)

    let copied = false
    try {
      await navigator.clipboard.writeText(url)
      copied = true
    } catch {
      // Clipboard blocked, or no permission — the URL below is still usable.
    }

    append([
      { kind: 'info', text: copied ? 'link copied to the clipboard:' : 'link (copy it by hand):' },
      { kind: 'info', text: url },
    ])
  } catch {
    append([{ kind: 'error', text: 'could not build a share link for this program' }])
  }
}

export function useConsole(initialSource: string): ConsoleState {
  /**
   * Whether replacing this Source would destroy anything. The starter example and a program that
   * was itself loaded are not the operator's work, so `load` overwrites them without ceremony;
   * anything else earns one refusal first.
   */
  const isDisposable = useCallback(
    (current: string): boolean =>
      current.trim() === '' ||
      current === initialSource ||
      PROGRAMS.some((program) => program.source === current),
    [initialSource],
  )

  const [source, setSourceState] = useState(initialSource)
  const [machine, setMachineState] = useState<Machine | null>(null)
  const [image, setImage] = useState<Image | null>(null)
  // The reference itself, not just a pointer to it: the Console is the only control grammar, so
  // a visitor has to be able to discover the commands without going looking (#140, PRD story 2).
  const [lines, setLines] = useState<ConsoleLine[]>(() =>
    [GREETING, ...helpLines()].map((text, id) => ({ id, kind: 'info' as const, text })),
  )

  // The clock steps far faster than React should re-render, so the ref is the machine of record
  // and the state is a mirror for the panels. React batches the mirror updates within a frame.
  const machineRef = useRef<Machine | null>(null)

  // Formatted as it happens rather than by retaining every intermediate Machine: each one carries
  // a full memory array, so keeping them would cost megabytes a second under `clock max`.
  const traceRef = useRef<string[]>([])
  const imageRef = useRef<Image | null>(null)

  // What the operator has typed, oldest first — `step`, `reg r1`, `step` is the real rhythm here.
  const historyRef = useRef<string[]>([])
  const [history, setHistory] = useState<string[]>([])

  // Presentation state, like the clock rate: repeated debugging runs are the normal case, so
  // re-entering breakpoints after every `reset` would make the feature useless.
  const breakpointsRef = useRef<Set<number>>(new Set())
  const [breakpoints, setBreakpoints] = useState<ReadonlySet<number>>(new Set())

  const syncBreakpoints = useCallback(() => {
    setBreakpoints(new Set(breakpointsRef.current))
  }, [])

  // The program `load` is waiting for a second confirmation on. Cleared by any other command, so
  // the confirmation cannot be answered by something typed minutes later.
  const pendingLoadRef = useRef<string | null>(null)

  // The PC a run paused at, so resuming skips that one breakpoint instead of tripping it again.
  // Any step or machine replacement invalidates it — see setMachine.
  const pausedPcRef = useRef<number | null>(null)

  const setMachine = useCallback((next: Machine | null) => {
    pausedPcRef.current = null
    machineRef.current = next
    setMachineState(next)
  }, [])

  const append = useCallback((entries: Omit<ConsoleLine, 'id'>[]) => {
    setLines((previous) => [
      ...previous,
      ...entries.map((entry, offset) => ({ ...entry, id: previous.length + offset })),
    ])
  }, [])

  /**
   * Advances one instruction, records the trace entry, and narrates anything that happened *to*
   * the program. The narration is a Console line, never a Terminal one: the Terminal is the
   * program's own output and a dispatch is not something the program printed.
   */
  const stepRecording = useCallback(
    (current: Machine): Machine => {
      const { machine: next, events } = step(current)
      if (traceRef.current.length < TRACE_LIMIT) {
        traceRef.current.push(formatStep(current, next, events))
      }
      if (events.length > 0) {
        append(events.map((event) => ({ kind: 'info' as const, text: narrate(event) })))
      }
      setMachine(next)
      return next
    },
    [append, setMachine],
  )

  // One instruction. Returns false when there is nothing left to run, which stops the clock.
  //
  // The breakpoint is checked *before* stepping, so a breakpoint on the line the PC starts at can
  // pause a fresh run (PRD story 19). Resuming is the exception: the PC the run paused at is
  // remembered, and its breakpoint is skipped once so `run` moves off the line it stopped on.
  const advance = useCallback((): boolean => {
    const current = machineRef.current
    if (current === null || current.halted) {
      return false
    }

    const line = lineOfPc(current, imageRef.current)
    const pc = current.registers[PC]
    if (line !== null && breakpointsRef.current.has(line) && pausedPcRef.current !== pc) {
      pausedPcRef.current = pc
      append([{ kind: 'info', text: `paused at line ${line}` }])
      return false
    }

    const next = stepRecording(current)
    if (next.halted) {
      // A run that reaches `int 0` should say so; silence reads as the clock having stalled.
      append([{ kind: 'info', text: 'halted' }])
      return false
    }
    return true
  }, [append, stepRecording])

  const clock = useClock(advance)

  const setSource = useCallback((next: string) => {
    // Guarded rather than merely disabled in the DOM: the lock is the invariant, not the styling.
    if (machineRef.current !== null) {
      return
    }
    setSourceState(next)
    saveSource(next)
    clearShareFragment()
  }, [])

  // A Source arriving from a share link or from storage lands after the first render, since
  // decoding is asynchronous.
  const replaceSource = useCallback((next: string) => {
    setSourceState(next)
  }, [])

  const note = useCallback(
    (text: string, kind: 'info' | 'error' = 'info') => append([{ kind, text }]),
    [append],
  )

  /** Assembles and instantiates, reporting either way. Returns whether a Machine now exists. */
  const build = useCallback(
    (output: Omit<ConsoleLine, 'id'>[]): boolean => {
      if (machineRef.current !== null) {
        output.push({ kind: 'info', text: 'already assembled — reset to edit and assemble again' })
        return true
      }

      const result = assemble(source)
      if (!result.ok) {
        output.push(
          ...result.errors.map((error) => ({
            kind: 'error' as const,
            text: `line ${error.line}: ${error.message}`,
          })),
        )
        return false
      }

      imageRef.current = result.image
      traceRef.current = []
      setImage(result.image)
      setMachine(createMachine(result.image))
      output.push({
        kind: 'info',
        text: `assembled ${result.image.words.length} words — editor locked, reset to edit`,
      })
      return true
    },
    [setMachine, source],
  )

  /** The Machine, or null having already said why there isn't one — four commands need both. */
  const requireMachine = useCallback((output: Omit<ConsoleLine, 'id'>[]): Machine | null => {
    if (machineRef.current === null) {
      output.push({ kind: 'error', text: 'no machine — run asm first' })
      return null
    }
    return machineRef.current
  }, [])

  const dispatch = useCallback(
    (command: Command, output: Omit<ConsoleLine, 'id'>[]): void => {
      if (command.kind !== 'load') {
        pendingLoadRef.current = null
      }

      switch (command.kind) {
        case 'asm':
          build(output)
          break

        case 'run': {
          if (!build(output)) {
            break
          }
          if (machineRef.current?.halted) {
            output.push({ kind: 'info', text: 'machine halted — reset to run again' })
            break
          }
          clock.start()
          output.push({
            kind: 'info',
            text: `running at ${clock.rate === 'max' ? 'max' : `${clock.rate}/s`} — stop to pause`,
          })
          break
        }

        case 'stop':
          if (!clock.running) {
            output.push({ kind: 'info', text: 'not running' })
            break
          }
          clock.stop()
          output.push({ kind: 'info', text: 'stopped' })
          break

        case 'clock':
          clock.setRate(command.rate)
          output.push({
            kind: 'info',
            text: `clock set to ${command.rate === 'max' ? 'max' : `${command.rate} steps/s`}`,
          })
          break

        case 'step': {
          clock.stop()
          const current = requireMachine(output)
          if (current === null) {
            break
          }
          if (current.halted) {
            output.push({ kind: 'info', text: 'machine halted — reset to run again' })
            break
          }
          const next = stepRecording(current)
          output.push({
            kind: 'info',
            text: next.halted ? 'halted' : `pc = ${hex32(next.registers[PC])}`,
          })
          break
        }

        case 'export': {
          if (command.what === 'hex') {
            const current = imageRef.current
            if (current === null) {
              output.push({ kind: 'error', text: 'no image — run asm first' })
              break
            }
            const filename = outputFilename('hex-export')
            downloadText(filename, formatHex(current.words))
            output.push({ kind: 'info', text: `wrote ${filename}` })
            break
          }

          const current = requireMachine(output)
          if (current === null) {
            break
          }
          const filename = outputFilename('trace-export')
          downloadText(filename, `${wrapTrace(traceRef.current, current.terminal)}\n`)
          output.push({
            kind: 'info',
            text: `wrote ${filename} — ${traceRef.current.length} instructions`,
          })
          break
        }

        case 'load': {
          if (command.name === null) {
            output.push({ kind: 'info', text: 'programs:' })
            output.push(
              ...PROGRAMS.map((program) => ({
                kind: 'info' as const,
                text: `  ${program.name.padEnd(14)}${program.summary}`,
              })),
            )
            break
          }

          // The three-state model holds by construction rather than by warning: with a Machine
          // alive the editor is locked, so there is nothing to load into.
          if (machineRef.current !== null) {
            output.push({
              kind: 'error',
              text: 'a machine is running — reset first, then load',
            })
            break
          }

          const program = programNamed(command.name)
          if (program === null) {
            const suggestion = nearest(command.name, PROGRAM_NAMES)
            output.push({
              kind: 'error',
              text: suggestion
                ? `no program called "${command.name}" — did you mean "${suggestion}"?`
                : `no program called "${command.name}" — try "load" to list them`,
            })
            break
          }

          // Loading destroys whatever is in the editor. Work the operator typed gets one refusal
          // first; the starter example and an already-loaded program are not work, so the
          // signature scene — `load watchdog`, `run` — stays a single command.
          if (!isDisposable(source) && pendingLoadRef.current !== program.name) {
            pendingLoadRef.current = program.name
            output.push({
              kind: 'error',
              text: `"load ${program.name}" would replace what you have written — run it again to confirm, or "share" first to keep a link to it`,
            })
            break
          }

          pendingLoadRef.current = null
          setSourceState(program.source)
          saveSource(program.source)
          clearShareFragment()
          output.push({ kind: 'info', text: `loaded ${program.name} — ${program.summary}` })
          break
        }

        case 'reset':
          // The Clock is presentation state, not part of the Machine — its rate survives a reset.
          clock.stop()
          imageRef.current = null
          traceRef.current = []
          setMachine(null)
          setImage(null)
          output.push({ kind: 'info', text: 'machine destroyed — editor unlocked' })
          break

        case 'reg': {
          const current = requireMachine(output)
          if (current === null) {
            break
          }
          const index = registerIndex(command.name)
          if (index === null) {
            output.push({
              kind: 'error',
              text: `no register called "${command.name}" — try r0..r31, or pc, ir, er, fr, cr, ipc`,
            })
            break
          }
          output.push({ kind: 'info', text: formatRegister(index, current.registers[index]) })
          break
        }

        case 'mem': {
          const current = requireMachine(output)
          if (current === null) {
            break
          }
          const lines = formatMemoryDump(current.memory, command.start, command.count, command.unit)
          output.push(...lines.map((text) => ({ kind: 'info' as const, text })))
          break
        }

        // Asynchronous, so it appends its own line when the codec finishes rather than joining
        // this command's output.
        case 'share':
          void shareSource(source, append)
          break

        case 'help':
          output.push(
            ...(command.topic === null ? helpLines() : helpFor(command.topic)).map((text) => ({
              kind: 'info' as const,
              text,
            })),
          )
          break

        case 'break': {
          const image = imageRef.current
          if (image !== null && !wordIndexForLine(image).has(command.line)) {
            output.push({
              kind: 'error',
              text: `line ${command.line} has no instruction to stop at`,
            })
            break
          }
          breakpointsRef.current.add(command.line)
          syncBreakpoints()
          output.push({
            kind: 'info',
            text:
              image === null
                ? `breakpoint at line ${command.line} — unchecked until you assemble`
                : `breakpoint at line ${command.line}`,
          })
          break
        }

        case 'breaks': {
          const lines = [...breakpointsRef.current].sort((a, b) => a - b)
          output.push({
            kind: 'info',
            text: lines.length === 0 ? 'no breakpoints' : `breakpoints: ${lines.join(', ')}`,
          })
          break
        }

        case 'unbreak': {
          if (command.line === 'all') {
            breakpointsRef.current.clear()
            syncBreakpoints()
            output.push({ kind: 'info', text: 'all breakpoints cleared' })
            break
          }
          const removed = breakpointsRef.current.delete(command.line)
          syncBreakpoints()
          output.push({
            kind: removed ? 'info' : 'error',
            text: removed
              ? `breakpoint at line ${command.line} cleared`
              : `no breakpoint at line ${command.line}`,
          })
          break
        }

        case 'bad-usage':
          output.push({ kind: 'error', text: command.message })
          break

        case 'unknown':
          output.push({
            kind: 'error',
            text: command.suggestion
              ? `unknown command "${command.input}" — did you mean "${command.suggestion}"?`
              : `unknown command "${command.input}"`,
          })
          break
      }
    },
    [
      append,
      build,
      clock,
      isDisposable,
      requireMachine,
      setMachine,
      source,
      stepRecording,
      syncBreakpoints,
    ],
  )

  const submit = useCallback(
    (input: string) => {
      const command = parseCommand(input)
      if (command.kind === 'empty') {
        return
      }

      historyRef.current = [
        ...historyRef.current.filter((entry) => entry !== input.trim()),
        input.trim(),
      ]
      setHistory(historyRef.current)

      const output: Omit<ConsoleLine, 'id'>[] = [{ kind: 'echo', text: `> ${input.trim()}` }]
      dispatch(command, output)
      append(output)
    },
    [append, dispatch],
  )

  return {
    source,
    machine,
    image,
    lines,
    history,
    breakpoints,
    currentLine: lineOfPc(machine, image),
    running: clock.running,
    rate: clock.rate,
    editable: machine === null,
    setSource,
    replaceSource,
    note,
    submit,
  }
}
