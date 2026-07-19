// Hand-written tests for what the oracle cannot see. A green diff against the reference traces
// does not mean a correct emulator: the fixtures exercise 9 of 11 branches, and the reference's
// broken `ble` survived precisely because nothing executed it.

import { describe, expect, it } from 'vitest'
import { assemble } from './assembler'
import {
  CR,
  EQ,
  ER,
  FR,
  GT,
  IPC,
  IV,
  LT,
  OV,
  PC,
  SOFTWARE_VECTOR,
  TERMINAL_ADDRESS,
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

// `enai` is #208's; until then a program enables interrupts the way the macro will expand.
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
