// Hand-written tests for what the oracle cannot see. A green diff against the reference traces
// does not mean a correct emulator: the fixtures exercise 9 of 11 branches, and the reference's
// broken `ble` survived precisely because nothing executed it.

import { describe, expect, it } from 'vitest'
import { assemble } from './assembler'
import { floatBits } from './float'
import {
  CAUSE_FPU,
  CAUSE_INVALID_INSTRUCTION,
  CAUSE_WATCHDOG,
  CAUSE_ZERO_DIVISION,
  CR,
  EQ,
  ER,
  FPU_CONTROL,
  FPU_ERROR,
  FPU_OPERATIONS,
  FPU_X,
  FPU_Y,
  FPU_Z,
  FR,
  GT,
  HARDWARE_1_VECTOR,
  IPC,
  IV,
  LT,
  OV,
  PC,
  SOFTWARE_VECTOR,
  TERMINAL_ADDRESS,
  WATCHDOG_ADDRESS,
  WATCHDOG_COUNTER,
  WATCHDOG_ENABLE,
  ZD,
} from './isa'
import { createMachine, type Machine, type StepEvent, step } from './machine'

function machineFor(source: string): Machine {
  const result = assemble(source)
  if (!result.ok) {
    throw new Error(`bad fixture source: ${JSON.stringify(result.errors)}`)
  }
  return createMachine(result.image)
}

/** Runs to halt, with a ceiling so a bug produces a failure rather than a hung suite. */
function run(source: string, limit = 200): Machine {
  let machine = machineFor(source)
  for (let i = 0; i < limit && !machine.halted; i++) {
    machine = step(machine).machine
  }
  return machine
}

/** Every event a run emits, in order — the stream the trace and the Console narration consume. */
function eventsOf(source: string, limit = 200): StepEvent[] {
  let machine = machineFor(source)
  const events: StepEvent[] = []
  for (let i = 0; i < limit && !machine.halted; i++) {
    const result = step(machine)
    events.push(...result.events)
    machine = result.machine
  }
  return events
}

// Written as the two instructions `enai r1` expands to, not as `enai` itself: these are machine
// tests, and the machine has never heard of macros. The expansion is the assembler's to pin.
const ENABLE_INTERRUPTS = ['addi r1, r0, 64', 'or fr, fr, r1']

/**
 * Builds a program that sets flags, takes the branch under test, and records which way it went.
 * r11 means "branched" and r12 "fell through", so a test can tell the two apart rather than
 * merely asserting that something happened.
 */
function branchProgram(setup: string[], branch: string): Machine {
  return run(
    [
      ...setup,
      `${branch} taken`,
      'addi r12, r0, 1',
      'int 0',
      'taken:',
      'addi r11, r0, 1',
      'int 0',
    ].join('\n'),
  )
}

const branched = (machine: Machine) => machine.registers[11] === 1 && machine.registers[12] === 0
const fellThrough = (machine: Machine) => machine.registers[12] === 1 && machine.registers[11] === 0

describe('step', () => {
  it('is pure — the machine it is given is not mutated', () => {
    const before = machineFor('addi r1, r0, 7')
    const after = step(before).machine

    expect(before.registers[1]).toBe(0)
    expect(after.registers[1]).toBe(7)
  })

  it('returns a halted machine unchanged rather than crashing', () => {
    const halted = run('int 0')

    expect(step(halted).machine).toBe(halted)
  })

  it('emits no events for an instruction that interrupts nothing', () => {
    expect(step(machineFor('addi r1, r0, 7')).events).toEqual([])
  })
})

// `int 1` and a division by zero leave *identical* after-states — both set CR to 1 and land on the
// same vector. Nothing downstream could tell them apart from a state diff, which is the whole
// reason `step` reports events rather than the Console inferring them (#205).
describe('int N dispatch', () => {
  const dispatching = (n: number) => [...ENABLE_INTERRUPTS, `int ${n}`, 'int 0'].join('\n')

  it('carries N as the cause and lands on the software vector', () => {
    const machine = run(dispatching(2), 3)

    expect(machine.registers[CR]).toBe(2)
    expect(machine.registers[PC]).toBe(SOFTWARE_VECTOR)
  })

  it('saves the interrupted PC so an ISR can return past the int', () => {
    const machine = run(dispatching(2), 3)

    // The instruction *after* the `int` — two setup words plus the int itself.
    expect(machine.registers[IPC]).toBe(0x0c)
  })

  it('reports the dispatch as an event naming its cause', () => {
    expect(eventsOf(dispatching(2), 3)).toEqual([{ kind: 'software-interrupt', cause: 2 }])
  })

  it('is suppressed entirely while IE is clear', () => {
    const machine = run(['int 2', 'addi r5, r0, 1', 'int 0'].join('\n'))

    // Fell through to the next instruction rather than dispatching, and left CR untouched.
    expect(machine.registers[5]).toBe(1)
    expect(machine.registers[CR]).toBe(0)
    expect(eventsOf(['int 2', 'int 0'].join('\n'))).toEqual([])
  })

  it('still halts on int 0, IE or no IE', () => {
    expect(run('int 0').halted).toBe(true)
    expect(run([...ENABLE_INTERRUPTS, 'int 0'].join('\n')).halted).toBe(true)
    expect(eventsOf([...ENABLE_INTERRUPTS, 'int 0'].join('\n'))).toEqual([])
  })
})

// The fixtures run these paths only with IE set, because every reference program enables
// interrupts before doing anything interesting. The gated half is invisible to the oracle.
describe('faults the oracle only sees one side of', () => {
  it('dispatches a division by zero with cause 1', () => {
    const source = [...ENABLE_INTERRUPTS, 'addi r2, r0, 8', 'div r2, r2, r0', 'int 0'].join('\n')
    const machine = run(source, 4)

    expect(machine.registers[CR]).toBe(CAUSE_ZERO_DIVISION)
    expect(machine.registers[PC]).toBe(SOFTWARE_VECTOR)
    expect(eventsOf(source, 4)).toContainEqual({
      kind: 'software-interrupt',
      cause: CAUSE_ZERO_DIVISION,
    })
  })

  it('raises ZD without dispatching while IE is clear', () => {
    const source = ['addi r2, r0, 8', 'div r2, r2, r0', 'addi r5, r0, 1', 'int 0'].join('\n')
    const machine = run(source)

    expect(machine.registers[FR] & ZD).toBe(ZD)
    expect(machine.registers[5]).toBe(1)
    expect(machine.registers[CR]).toBe(0)
  })

  it('leaves the destination untouched on a divide by zero', () => {
    // Pinned by the reference: `R1 = R1 / R0 = 0x00000020`, the value R1 already held.
    const machine = run(['addi r2, r0, 8', 'div r2, r2, r0', 'int 0'].join('\n'))

    expect(machine.registers[2]).toBe(8)
  })

  it('dispatches an invalid instruction with cause 0x2A, naming its PC', () => {
    const source = [...ENABLE_INTERRUPTS, '0xBADA55E5', 'int 0'].join('\n')
    const machine = run(source, 3)

    expect(machine.registers[CR]).toBe(CAUSE_INVALID_INSTRUCTION)
    expect(eventsOf(source, 3)).toContainEqual({ kind: 'invalid-instruction', pc: 0x08 })
  })

  it('raises IV without dispatching while IE is clear', () => {
    const source = ['0xBADA55E5', 'addi r5, r0, 1', 'int 0'].join('\n')
    const machine = run(source)

    expect(machine.registers[FR] & IV).toBe(IV)
    // Execution carries on past the garbage rather than looping, as it did in v1.
    expect(machine.registers[5]).toBe(1)
    expect(machine.registers[CR]).toBe(0)
  })

  it('reports an invalid instruction even when no dispatch follows', () => {
    expect(eventsOf(['0xBADA55E5', 'int 0'].join('\n'))).toEqual([
      { kind: 'invalid-instruction', pc: 0 },
    ])
  })
})

describe('isr and reti', () => {
  it('captures IPC and CR, then jumps to the handler body', () => {
    const machine = run(
      [
        'bun main',
        'nop',
        'nop',
        'isr r5, r6, handler',
        'handler:',
        'int 0',
        'main:',
        ...ENABLE_INTERRUPTS,
        'int 7',
        'int 0',
      ].join('\n'),
      5,
    )

    // The `int 7` dispatched, and the vector's `isr` captured what it left behind.
    expect(machine.registers[6]).toBe(7)
    expect(machine.registers[5]).toBe(machine.registers[IPC] >>> 2)
    expect(machine.registers[PC]).toBe(0x10)
  })

  it('returns from a handler and carries on past the interrupted instruction', () => {
    const machine = run(
      [
        'bun main',
        'nop',
        'nop',
        'isr r31, r30, handler',
        'handler:',
        'reti r31',
        'main:',
        ...ENABLE_INTERRUPTS,
        'int 7',
        'addi r9, r0, 1',
        'int 0',
      ].join('\n'),
    )

    expect(machine.registers[9]).toBe(1)
    expect(machine.halted).toBe(true)
  })
})

// The one reference program arms the Watchdog once, with interrupts on, and halts three
// instructions after it fires. Everything else about the device is invisible to the oracle.
describe('the Watchdog', () => {
  /**
   * Arms the Watchdog with `count` and spins. The hardware-1 vector parks in its own idle loop
   * rather than falling through, so the machine keeps stepping after a dispatch without ever
   * re-arming — which is what lets a test tell "fired once" from "fires every Step".
   */
  const arming = (count: number, extra: string[] = []) =>
    [
      'bun main',
      'bun idle', // hardware 1
      'nop', // hardware 2
      'nop', // software
      'idle:',
      'bun idle',
      'main:',
      ...extra,
      `addi r1, r0, ${count}`,
      'addi r2, r0, 1',
      'shl r2, r2, 31',
      'or r1, r1, r2',
      `addi r3, r0, ${WATCHDOG_ADDRESS}`,
      'stw r3, 0, r1',
      'spin:',
      'bun spin',
    ].join('\n')

  const register = (machine: Machine) => machine.memory[WATCHDOG_ADDRESS] >>> 0
  const counterOf = (machine: Machine) => register(machine) & WATCHDOG_COUNTER
  const armed = (machine: Machine) => (register(machine) & WATCHDOG_ENABLE) !== 0

  /** The machine as it stood the moment `predicate` first held — no step counting to get wrong. */
  function runUntil(
    source: string,
    predicate: (machine: Machine) => boolean,
    limit = 200,
  ): Machine {
    let machine = machineFor(source)
    for (let i = 0; i < limit && !machine.halted; i++) {
      machine = step(machine).machine
      if (predicate(machine)) {
        return machine
      }
    }
    throw new Error('predicate never held')
  }

  // The Step that arms it ticks too — devices tick every Step, and the store is not exempt. So a
  // countdown written as 10 already reads 9 by the end of that Step, and the program gets ten
  // further Steps before it fires. That off-by-one is exactly what makes the reference program's
  // 100 `bun` instructions come out right.
  it('decrements one per Step once armed, the arming Step included', () => {
    const justArmed = runUntil(arming(10, ENABLE_INTERRUPTS), armed)

    expect(counterOf(justArmed)).toBe(9)
    expect(counterOf(step(justArmed).machine)).toBe(8)
    expect(counterOf(step(step(justArmed).machine).machine)).toBe(7)
  })

  it('fires hardware interrupt 1 when the countdown runs out', () => {
    const events = eventsOf(arming(3, ENABLE_INTERRUPTS), 60)

    expect(events.filter((event) => event.kind === 'hardware-interrupt')).toHaveLength(1)
    expect(events).toContainEqual({
      kind: 'hardware-interrupt',
      line: 1,
      resume: expect.any(Number),
    })
  })

  it('lands on the hardware 1 vector with the watchdog cause', () => {
    const fired = runUntil(arming(3, ENABLE_INTERRUPTS), (machine) => machine.registers[CR] !== 0)

    expect(fired.registers[CR]).toBe(CAUSE_WATCHDOG)
    expect(fired.registers[PC]).toBe(HARDWARE_1_VECTOR)
  })

  // The reference program halts immediately after its ISR runs, so it cannot show whether a spent
  // countdown re-arms itself. It does not: expiry disarms, or the machine would dispatch on every
  // Step from then on. See ISA.md.
  it('fires exactly once and disarms itself', () => {
    const source = arming(3, ENABLE_INTERRUPTS)
    const events = eventsOf(source, 120)

    expect(events.filter((event) => event.kind === 'hardware-interrupt')).toHaveLength(1)
    expect(register(run(source, 120))).toBe(0)
  })

  it('does not dispatch while IE is clear, and still disarms', () => {
    const source = arming(3)
    const machine = run(source, 60)

    expect(eventsOf(source, 60)).toEqual([])
    expect(machine.registers[CR]).toBe(0)
    expect(register(machine)).toBe(0)
  })

  it('does not tick at all while the enable bit is clear', () => {
    // The same store, minus the bit — the counter must sit exactly where it was written.
    const disarmed = [
      'addi r1, r0, 7',
      `addi r3, r0, ${WATCHDOG_ADDRESS}`,
      'stw r3, 0, r1',
      'spin:',
      'bun spin',
    ].join('\n')

    expect(register(run(disarmed, 40))).toBe(7)
  })

  it('stops counting when the program disarms it mid-countdown', () => {
    const machine = run(
      [
        ...ENABLE_INTERRUPTS,
        'addi r1, r0, 50',
        'addi r2, r0, 1',
        'shl r2, r2, 31',
        'or r1, r1, r2',
        `addi r3, r0, ${WATCHDOG_ADDRESS}`,
        'stw r3, 0, r1',
        'stw r3, 0, r0',
        'spin:',
        'bun spin',
      ].join('\n'),
      80,
    )

    expect(register(machine)).toBe(0)
    expect(machine.registers[CR]).toBe(0)
  })

  // A Device tick and an instruction that dispatches on its own can land on the same Step. Both
  // must be reported, and the hardware one wins the PC because it happens last.
  it('reports both when a tick coincides with a software dispatch', () => {
    const source = [
      'bun main',
      'bun idle',
      'nop',
      'bun idle',
      'idle:',
      'bun idle',
      'main:',
      ...ENABLE_INTERRUPTS,
      'addi r1, r0, 2',
      'addi r2, r0, 1',
      'shl r2, r2, 31',
      'or r1, r1, r2',
      `addi r3, r0, ${WATCHDOG_ADDRESS}`,
      'stw r3, 0, r1',
      'nop',
      'int 5',
      'spin:',
      'bun spin',
    ].join('\n')

    const coinciding = eventsOf(source, 60)

    expect(coinciding).toContainEqual({ kind: 'software-interrupt', cause: 5 })
    expect(coinciding.some((event) => event.kind === 'hardware-interrupt')).toBe(true)
  })
})

// One reference program drives the FPU, and it uses five of its ten operations. Everything below
// is either untouched by it or invisible in its trace.
describe('the FPU', () => {
  /**
   * Writes `x` and `y`, then each control word in turn, spinning between them. The waits are
   * generous: every operation costs far fewer cycles than the gap, so the sequence is
   * timing-independent except where a test looks at the timing on purpose.
   */
  function fpuProgram(x: number, y: number, controls: number[], interrupts = true): string {
    const wait = Array.from({ length: 12 }, () => 'nop')
    return [
      'bun main',
      'bun idle',
      // Hardware 2 must *return*, or the first FPU interrupt parks the program and every later
      // operation in the sequence never happens.
      'isr r31, r30, resume',
      'nop',
      'resume:',
      'reti r31',
      'idle:',
      'bun idle',
      'main:',
      ...(interrupts ? ENABLE_INTERRUPTS : []),
      `addi r1, r0, ${FPU_X}`,
      `addi r2, r0, ${FPU_Y}`,
      `addi r4, r0, ${FPU_CONTROL}`,
      `addi r5, r0, ${x}`,
      'stw r1, 0, r5',
      `addi r6, r0, ${y}`,
      'stw r2, 0, r6',
      ...controls.flatMap((control) => [`addi r7, r0, ${control}`, 'stw r4, 0, r7', ...wait]),
      'spin:',
      'bun spin',
    ].join('\n')
  }

  /** The FPU as it stands once the whole sequence has run. */
  const fpuAfter = (x: number, y: number, controls: number[], interrupts = true) =>
    run(fpuProgram(x, y, controls, interrupts), 400).fpu

  const { add, subtract, multiply, divide, assignX, ceiling, floor, round } = FPU_OPERATIONS

  it('divides as IEEE-754 singles, not as integers', () => {
    // The reference's own trick: the program writes 74 and 8, and gets 9.25 back.
    const fpu = fpuAfter(74, 8, [divide])

    expect(fpu.z).toBe(9.25)
    expect(floatBits(fpu.z)).toBe(0x41140000)
  })

  it('adds, subtracts and multiplies', () => {
    expect(fpuAfter(10, 4, [add]).z).toBe(14)
    expect(fpuAfter(10, 4, [subtract]).z).toBe(6)
    expect(fpuAfter(10, 4, [multiply]).z).toBe(40)
  })

  it('assigns z back into x', () => {
    expect(fpuAfter(10, 4, [add, assignX]).x).toBe(14)
  })

  // `2_fpu` uses round; ceiling and floor are reachable and no fixture ever exercises them.
  it('rounds, ceils and floors', () => {
    // 37 / 8 = 4.625.
    expect(fpuAfter(37, 8, [divide, round]).z).toBe(5)
    expect(fpuAfter(37, 8, [divide, ceiling]).z).toBe(5)
    expect(fpuAfter(37, 8, [divide, floor]).z).toBe(4)
  })

  it('raises the error bit on a divide by zero, leaving z alone', () => {
    const fpu = fpuAfter(10, 0, [divide])

    expect(fpu.control).toBe(FPU_ERROR)
    expect(fpu.z).toBe(0)
  })

  it('raises the error bit on an undefined operation', () => {
    expect(fpuAfter(1, 1, [15]).control).toBe(FPU_ERROR)
  })

  it('clears the error bit once a good operation follows', () => {
    expect(fpuAfter(10, 4, [15, add]).control).toBe(0)
  })

  it('goes idle again once the operation lands', () => {
    const fpu = fpuAfter(10, 4, [add])

    expect(fpu.busy).toBe(false)
    expect(fpu.operation).toBe(0)
  })

  it('fires hardware interrupt 2 exactly once per operation', () => {
    const events = eventsOf(fpuProgram(10, 4, [add]), 400)

    expect(events.filter((event) => event.kind === 'hardware-interrupt')).toHaveLength(1)
    expect(events).toContainEqual({
      kind: 'hardware-interrupt',
      line: 2,
      resume: expect.any(Number),
    })
  })

  it('lands on the hardware 2 vector with the FPU cause', () => {
    expect(run(fpuProgram(10, 4, [add]), 400).registers[CR]).toBe(CAUSE_FPU)
  })

  it('completes the work but dispatches nothing while IE is clear', () => {
    const source = fpuProgram(10, 4, [add], false)

    expect(run(source, 400).fpu.z).toBe(14)
    expect(run(source, 400).registers[CR]).toBe(0)
    expect(eventsOf(source, 400)).toEqual([])
  })

  // The strangest thing inherited from the reference: what a read yields depends on the *value*.
  // `2_fpu` reads back both kinds and would go red on either one alone.
  it('reads a fractional register as IEEE-754 bits and a whole one as an integer', () => {
    const readZ = (x: number, y: number) =>
      run(
        [
          'bun main',
          'bun idle',
          'isr r31, r30, resume',
          'nop',
          'resume:',
          'reti r31',
          'idle:',
          'bun idle',
          'main:',
          ...ENABLE_INTERRUPTS,
          `addi r1, r0, ${FPU_X}`,
          `addi r2, r0, ${FPU_Y}`,
          `addi r3, r0, ${FPU_Z}`,
          `addi r4, r0, ${FPU_CONTROL}`,
          `addi r5, r0, ${x}`,
          'stw r1, 0, r5',
          `addi r6, r0, ${y}`,
          'stw r2, 0, r6',
          `addi r7, r0, ${divide}`,
          'stw r4, 0, r7',
          ...Array.from({ length: 12 }, () => 'nop'),
          'ldw r8, r3, 0',
          'spin:',
          'bun spin',
        ].join('\n'),
        400,
      ).registers[8]

    expect(readZ(37, 8)).toBe(0x40940000) // 4.625, as bits
    expect(readZ(40, 8)).toBe(5) // exactly 5, as an integer
  })
})

describe('branches the oracle does not reach', () => {
  it('ble branches on less-than as well as equal', () => {
    // The reference tests (FR & 0x02) == 0x20 — a typo that never fires on LT. GOLEM diverges.
    expect(branched(branchProgram(['addi r1, r0, 1', 'addi r2, r0, 2', 'cmp r1, r2'], 'ble'))).toBe(
      true,
    )
    expect(branched(branchProgram(['addi r1, r0, 2', 'cmp r1, r1'], 'ble'))).toBe(true)
  })

  it('ble does not branch on greater-than', () => {
    expect(
      fellThrough(branchProgram(['addi r1, r0, 2', 'addi r2, r0, 1', 'cmp r1, r2'], 'ble')),
    ).toBe(true)
  })

  it('blt branches on less-than only', () => {
    expect(branched(branchProgram(['addi r1, r0, 1', 'addi r2, r0, 2', 'cmp r1, r2'], 'blt'))).toBe(
      true,
    )
    expect(
      fellThrough(branchProgram(['addi r1, r0, 2', 'addi r2, r0, 1', 'cmp r1, r2'], 'blt')),
    ).toBe(true)
  })

  it('bnz branches while ZD is clear', () => {
    expect(branched(branchProgram(['addi r1, r0, 10', 'divi r2, r1, 2'], 'bnz'))).toBe(true)
    expect(fellThrough(branchProgram(['addi r1, r0, 10', 'divi r2, r1, 0'], 'bnz'))).toBe(true)
  })

  it('bni branches while IV is clear', () => {
    expect(branched(branchProgram(['addi r1, r0, 1'], 'bni'))).toBe(true)
  })

  it('bni does not branch once an invalid instruction has set IV', () => {
    // 0x3E is unassigned. The reference cannot reach this state at all — it loops instead.
    const machine = run(
      [
        '0xF8000000',
        'bni taken',
        'addi r12, r0, 1',
        'int 0',
        'taken:',
        'addi r11, r0, 1',
        'int 0',
      ].join('\n'),
    )

    expect(machine.registers[FR] & IV).toBe(IV)
    expect(fellThrough(machine)).toBe(true)
  })

  it('biv branches once IV is set', () => {
    const machine = run(
      [
        '0xF8000000',
        'biv taken',
        'addi r12, r0, 1',
        'int 0',
        'taken:',
        'addi r11, r0, 1',
        'int 0',
      ].join('\n'),
    )

    expect(branched(machine)).toBe(true)
  })

  it('bzd branches on a divide by zero', () => {
    expect(branched(branchProgram(['addi r1, r0, 10', 'divi r2, r1, 0'], 'bzd'))).toBe(true)
  })
})

// The encoding traps ISA.md calls out — each independent of the oracle.
describe('encoding traps', () => {
  it('keeps R0 at zero after a write', () => {
    expect(run('addi r0, r0, 99\nint 0').registers[0]).toBe(0)
  })

  it('shifts N+1 places, so there is no shift of zero', () => {
    expect(run('addi r1, r0, 3\nshl r2, r1, 1\nint 0').registers[2]).toBe(6)
    expect(run('addi r1, r0, 3\nshl r2, r1, 4\nint 0').registers[2]).toBe(48)
  })

  it('puts the bits a shift displaces past the word into ER', () => {
    const machine = run('addi r1, r0, 0xFFFF\nshl r2, r1, 32\nint 0')

    expect(machine.registers[2]).toBe(0)
    expect(machine.registers[ER]).toBe(0xffff)
  })

  it('addresses words for ldw and bytes for ldb', () => {
    // 0x41424300 sits at word 8; byte 0 of it is 0x41 and byte 2 is 0x43.
    const source = [
      'addi r1, r0, 8',
      'ldw r2, r1, 0',
      'shl r3, r1, 2', // word index -> byte address
      'ldb r4, r3, 0',
      'ldb r5, r3, 2',
      'int 0',
      'nop',
      'nop',
      '0x41424300',
    ].join('\n')

    const machine = run(source)

    expect(machine.registers[2]).toBe(0x41424300)
    expect(machine.registers[4]).toBe(0x41)
    expect(machine.registers[5]).toBe(0x43)
  })

  it('stores a byte without disturbing the rest of its word', () => {
    const source = [
      'addi r1, r0, 8',
      'shl r2, r1, 2',
      'addi r3, r0, 0xFF',
      'stb r2, 1, r3',
      'ldw r4, r1, 0',
      'int 0',
      'nop',
      'nop',
      '0x41424300',
    ].join('\n')

    expect(run(source).registers[4]).toBe(0x41ff4300)
  })

  it('stores call’s return address as a word index, which ret shifts back', () => {
    const machine = run(['call r1, r0, target', 'int 0', 'target:', 'ret r1'].join('\n'))

    expect(machine.halted).toBe(true)
    // `call` sits at word 0, so it returns to word 1 — the `int 0`.
    expect(machine.registers[1]).toBe(1)
  })

  it('addresses special registers through the six-bit type U fields', () => {
    const machine = run('addi r1, r0, 5\nadd r2, r0, fr\nint 0')

    expect(machine.registers[2]).toBe(machine.registers[FR])
  })
})

describe('flags', () => {
  it('clears the three comparison bits before writing them', () => {
    const machine = run('addi r1, r0, 1\naddi r2, r0, 2\ncmp r1, r2\ncmp r2, r1\nint 0')

    expect(machine.registers[FR] & LT).toBe(0)
    expect(machine.registers[FR] & GT).toBe(GT)
    expect(machine.registers[FR] & EQ).toBe(0)
  })

  it('sets OV when an addition wraps past 32 bits', () => {
    const double = Array.from({ length: 16 }, () => 'add r1, r1, r1')
    const machine = run(['addi r1, r0, 0xFFFF', ...double, 'add r2, r1, r1', 'int 0'].join('\n'))

    expect(machine.registers[1]).toBe(0xffff0000)
    expect(machine.registers[FR] & OV).toBe(OV)
  })

  it('sets ZD on a divide by zero and leaves the destination alone', () => {
    const machine = run('addi r1, r0, 10\naddi r2, r0, 7\ndivi r2, r1, 0\nint 0')

    expect(machine.registers[FR] & ZD).toBe(ZD)
    expect(machine.registers[2]).toBe(7)
  })

  // Settled in ISA.md: the committed oracle preserves OV across a divide.
  it('leaves OV untouched through a divide', () => {
    const double = Array.from({ length: 16 }, () => 'add r1, r1, r1')
    const machine = run(
      ['addi r1, r0, 0xFFFF', ...double, 'add r2, r1, r1', 'divi r3, r1, 0', 'int 0'].join('\n'),
    )

    expect(machine.registers[FR] & OV).toBe(OV)
    expect(machine.registers[FR] & ZD).toBe(ZD)
  })

  it('puts the remainder of a divide in ER', () => {
    const machine = run('addi r1, r0, 17\ndivi r2, r1, 5\nint 0')

    expect(machine.registers[2]).toBe(3)
    expect(machine.registers[ER]).toBe(2)
  })

  it('puts the high half of a product in ER', () => {
    const machine = run('addi r1, r0, 0xFFFF\nmuli r2, r1, 0xFFFF\nint 0')

    // 0xFFFF * 0xFFFF still fits in a word, so ER stays zero.
    expect(machine.registers[2]).toBe(0xfffe0001)
    expect(machine.registers[ER]).toBe(0)
  })

  it('sets IV on an unassigned opcode rather than executing it', () => {
    expect(run('0xF8000000\nint 0').registers[FR] & IV).toBe(IV)
  })
})

describe('the stack', () => {
  it('round-trips through push and pop, last in first out', () => {
    const source = [
      'addi r3, r0, 200',
      'addi r1, r0, 42',
      'addi r2, r0, 7',
      'push r3, r1',
      'push r3, r2',
      'pop r4, r3',
      'pop r5, r3',
      'int 0',
    ].join('\n')

    const machine = run(source)

    expect(machine.registers[4]).toBe(7)
    expect(machine.registers[5]).toBe(42)
    expect(machine.registers[3]).toBe(200)
  })
})

describe('the Terminal', () => {
  it('emits a byte written to the memory-mapped address as a character', () => {
    const source = [
      `addi r1, r0, ${TERMINAL_ADDRESS >>> 2}`,
      'shl r1, r1, 2',
      `addi r1, r1, ${TERMINAL_ADDRESS & 3}`,
      'addi r2, r0, 72',
      'stb r1, 0, r2',
      'addi r2, r0, 105',
      'stb r1, 0, r2',
      'int 0',
    ].join('\n')

    expect(run(source).terminal).toBe('Hi')
  })

  // Unit 2's smallest behavior, and what `2_hello_world` needs: the Terminal is a device *and*
  // an address. The byte stays readable where it was written, so a program can `ldb` back what
  // it printed — which is how that program checks its own output.
  it('keeps a written byte readable at its address', () => {
    const source = [
      `addi r1, r0, ${TERMINAL_ADDRESS >>> 2}`,
      'shl r1, r1, 2',
      `addi r1, r1, ${TERMINAL_ADDRESS & 3}`,
      'addi r2, r0, 65',
      'stb r1, 0, r2',
      'ldb r3, r1, 0',
      'int 0',
    ].join('\n')

    const machine = run(source)
    expect(machine.registers[3]).toBe(65)
    // Still echoed — readback is an addition, not a replacement.
    expect(machine.terminal).toBe('A')
  })

  it('reads back only the most recent byte written', () => {
    const source = [
      `addi r1, r0, ${TERMINAL_ADDRESS >>> 2}`,
      'shl r1, r1, 2',
      `addi r1, r1, ${TERMINAL_ADDRESS & 3}`,
      'addi r2, r0, 72',
      'stb r1, 0, r2',
      'addi r2, r0, 105',
      'stb r1, 0, r2',
      'ldb r3, r1, 0',
      'int 0',
    ].join('\n')

    const machine = run(source)
    expect(machine.registers[3]).toBe(105)
    expect(machine.terminal).toBe('Hi')
  })

  it('leaves the Terminal empty when nothing writes to it', () => {
    expect(run('addi r1, r0, 1\nint 0').terminal).toBe('')
  })

  // The whole path: a string written in source, walked byte by byte, printed through the device.
  // This is what the assembler's byte order has to agree with — pack it the other way and the
  // characters come out reversed within each word.
  it('prints a string from source, stopping at the NUL the assembler appended', () => {
    const source = [
      'addi r1, r0, message', // word index of the string
      'shl r1, r1, 2', // -> byte address
      `addi r2, r0, ${TERMINAL_ADDRESS >>> 2}`,
      'shl r2, r2, 2',
      `addi r2, r2, ${TERMINAL_ADDRESS & 3}`,
      'loop:',
      'ldb r3, r1, 0',
      'cmpi r3, 0',
      'beq done',
      'stb r2, 0, r3',
      'addi r1, r1, 1',
      'bun loop',
      'done:',
      'int 0',
      'message:',
      '"Hello from GOLEM\\n"',
    ].join('\n')

    expect(run(source, 400).terminal).toBe('Hello from GOLEM\n')
  })
})
