// The Console's control surface, tested through one interface — the pure reducer — rather than by
// driving the DOM. These are the arms `app.test.tsx` reaches only indirectly: the load confirmation,
// the cache gating, the requireMachine guards, and the run loop's resume-skip.

import { describe, expect, it } from 'vitest'
import { assemble } from './assembler'
import {
  advanceOnce,
  type ConsoleModel,
  lineOfPc,
  type ReduceContext,
  reduceCommand,
  stepWithTrace,
} from './console-reducer'
import { PC } from './isa'
import { createMachine } from './machine'
import { PROGRAMS } from './programs'

function modelWith(overrides: Partial<ConsoleModel> = {}): ConsoleModel {
  return {
    source: '',
    machine: null,
    image: null,
    cacheMode: true,
    pendingLoad: null,
    breakpoints: new Set(),
    pausedPc: null,
    cacheSpotlight: null,
    ...overrides,
  }
}

const CTX: ReduceContext = { running: false, rate: 8, traceLength: 0, initialSource: 'STARTER' }

/** Assembles a source and instantiates a Machine over it — the state most commands need. */
function loaded(source: string, cache = true): ConsoleModel {
  const result = assemble(source)
  if (!result.ok) {
    throw new Error(`bad fixture: ${JSON.stringify(result.errors)}`)
  }
  return modelWith({
    source,
    image: result.image,
    machine: createMachine(result.image, { cache }),
  })
}

describe('reduceCommand — the machine guard', () => {
  it('refuses reg, mem and step when no Machine exists', () => {
    for (const command of [
      { kind: 'reg', name: 'r1' },
      { kind: 'mem', start: 0, count: 1, unit: 'words' },
      { kind: 'step' },
    ] as const) {
      const result = reduceCommand(modelWith(), command, CTX)
      expect(result.lines).toContainEqual({ kind: 'error', text: 'no machine — run asm first' })
      expect(result.model.machine).toBeNull()
    }
  })
})

describe('reduceCommand — the cache gate (ADR 0023)', () => {
  it('refuses to toggle the mode while a Machine exists', () => {
    const result = reduceCommand(loaded('int 0'), { kind: 'cache', mode: 'off' }, CTX)
    expect(result.lines).toContainEqual({
      kind: 'error',
      text: 'a machine exists — reset first, then cache on/off',
    })
    expect(result.model.cacheMode).toBe(true)
  })

  it('toggles the mode when none exists', () => {
    const result = reduceCommand(
      modelWith({ cacheMode: true }),
      { kind: 'cache', mode: 'off' },
      CTX,
    )
    expect(result.model.cacheMode).toBe(false)
  })
})

describe('reduceCommand — the load confirmation', () => {
  const program = PROGRAMS[0]
  const ctx: ReduceContext = { ...CTX, initialSource: 'STARTER' }

  it('refuses once on unsaved work, arming the pending confirmation', () => {
    const model = modelWith({ source: 'my own work' })
    const result = reduceCommand(model, { kind: 'load', name: program.name }, ctx)

    expect(result.model.pendingLoad).toBe(program.name)
    expect(result.model.source).toBe('my own work')
    expect(result.lines[0]?.kind).toBe('error')
    expect(result.effects).toEqual([])
  })

  it('loads on the second identical command', () => {
    const model = modelWith({ source: 'my own work', pendingLoad: program.name })
    const result = reduceCommand(model, { kind: 'load', name: program.name }, ctx)

    expect(result.model.source).toBe(program.source)
    expect(result.model.pendingLoad).toBeNull()
    expect(result.effects).toContainEqual({ kind: 'persist-source', source: program.source })
  })

  it('loads a disposable source without ceremony', () => {
    const model = modelWith({ source: 'STARTER' })
    const result = reduceCommand(model, { kind: 'load', name: program.name }, ctx)
    expect(result.model.source).toBe(program.source)
  })
})

describe('reduceCommand — pending load is cancelled by any other command', () => {
  it('clears pendingLoad on a non-load command', () => {
    const result = reduceCommand(modelWith({ pendingLoad: 'watchdog' }), { kind: 'breaks' }, CTX)
    expect(result.model.pendingLoad).toBeNull()
  })
})

describe('reduceCommand — clock effects', () => {
  it('run over a buildable source emits start-clock and instantiates', () => {
    const result = reduceCommand(modelWith({ source: 'int 0' }), { kind: 'run' }, CTX)
    expect(result.model.machine).not.toBeNull()
    expect(result.effects).toContainEqual({ kind: 'start-clock' })
  })

  it('stop reports "not running" when the clock is idle', () => {
    const result = reduceCommand(loaded('int 0'), { kind: 'stop' }, { ...CTX, running: false })
    expect(result.lines).toContainEqual({ kind: 'info', text: 'not running' })
    expect(result.effects).toEqual([])
  })

  it('stop emits stop-clock when running', () => {
    const result = reduceCommand(loaded('int 0'), { kind: 'stop' }, { ...CTX, running: true })
    expect(result.effects).toContainEqual({ kind: 'stop-clock' })
  })

  it('clock emits set-rate', () => {
    const result = reduceCommand(modelWith(), { kind: 'clock', rate: 'max' }, CTX)
    expect(result.effects).toContainEqual({ kind: 'set-rate', rate: 'max' })
  })
})

describe('reduceCommand — export effects', () => {
  it('export hex carries the assembled words as a download', () => {
    const result = reduceCommand(loaded('int 0'), { kind: 'export', what: 'hex' }, CTX)
    const download = result.effects.find((effect) => effect.kind === 'download')
    expect(download).toBeDefined()
    expect(download?.kind === 'download' && download.text.startsWith('0x')).toBe(true)
  })

  it('export trace names the file and reports the trace length from context', () => {
    const result = reduceCommand(
      loaded('int 0'),
      { kind: 'export', what: 'trace' },
      {
        ...CTX,
        traceLength: 42,
      },
    )
    expect(result.effects).toContainEqual({ kind: 'export-trace', filename: 'golem-trace.txt' })
    expect(result.lines.some((line) => line.text.includes('42 instructions'))).toBe(true)
  })
})

describe('reduceCommand — step', () => {
  it('advances the Machine, stops the clock, and reports the new PC', () => {
    const result = reduceCommand(loaded('addi r1, r0, 7\nint 0'), { kind: 'step' }, CTX)
    expect(result.effects).toContainEqual({ kind: 'stop-clock' })
    expect(result.model.machine?.registers[1]).toBe(7)
    expect(result.trace).toHaveLength(1)
    expect(result.lines.some((line) => line.text.startsWith('pc = '))).toBe(true)
  })
})

describe('advanceOnce — the run loop decision', () => {
  it('is idle over no Machine or a halted one', () => {
    expect(advanceOnce(modelWith()).kind).toBe('idle')
    const halted = loaded('int 0')
    const stepped = stepWithTrace(halted.machine as NonNullable<typeof halted.machine>)
    expect(advanceOnce({ ...halted, machine: stepped.machine }).kind).toBe('idle')
  })

  it('pauses at a breakpoint on the entry line, recording the paused PC', () => {
    const base = loaded('addi r1, r0, 7\nint 0')
    const line = lineOfPc(base.machine, base.image)
    const model = { ...base, breakpoints: new Set([line as number]) }

    const result = advanceOnce(model)
    expect(result.kind).toBe('paused')
    if (result.kind === 'paused') {
      expect(result.model.pausedPc).toBe(base.machine?.registers[PC] ?? 0)
    }
  })

  it('skips the paused breakpoint once on resume, then clears it', () => {
    const base = loaded('addi r1, r0, 7\nint 0')
    const line = lineOfPc(base.machine, base.image) as number
    const pc = (base.machine as NonNullable<typeof base.machine>).registers[PC]
    const resumed = { ...base, breakpoints: new Set([line]), pausedPc: pc }

    const result = advanceOnce(resumed)
    expect(result.kind).toBe('stepped')
    if (result.kind === 'stepped') {
      expect(result.model.pausedPc).toBeNull()
      expect(result.model.machine?.registers[1]).toBe(7)
    }
  })

  it('halts with the halt lines when the Step reaches int 0', () => {
    const result = advanceOnce(loaded('int 0'))
    expect(result.kind).toBe('halted')
    if (result.kind === 'halted') {
      expect(result.lines).toContainEqual({ kind: 'info', text: 'halted' })
      expect(result.trace).toHaveLength(1)
    }
  })
})

describe('stepWithTrace', () => {
  it('narrates a dispatch and returns a trace line', () => {
    // enai expands to two words; the second sets IE. A software int then dispatches and is narrated.
    const model = loaded(['addi r1, r0, 64', 'or fr, fr, r1', 'int 2', 'int 0'].join('\n'))
    let machine = model.machine as NonNullable<typeof model.machine>
    // Step past the two setup instructions to the int.
    machine = stepWithTrace(machine).machine
    machine = stepWithTrace(machine).machine
    const result = stepWithTrace(machine)

    expect(result.trace).toContain('int')
    expect(result.lines.some((line) => line.text.includes('software interrupt'))).toBe(true)
  })
})

describe('reduceCommand — clear', () => {
  it('asks the shell to wipe the log and says nothing itself', () => {
    const result = reduceCommand(modelWith(), { kind: 'clear' }, CTX)

    expect(result.effects).toEqual([{ kind: 'clear-console' }])
    expect(result.lines).toEqual([])
  })

  // The log is the tool talking; the Machine and its Terminal are the other side of ADR 0018's
  // line and a wiped Console must not disturb them.
  it('leaves the Machine and the trace untouched', () => {
    const model = loaded('int 0')
    const result = reduceCommand(model, { kind: 'clear' }, CTX)

    expect(result.model.machine).toBe(model.machine)
    expect(result.trace).toEqual([])
  })
})
