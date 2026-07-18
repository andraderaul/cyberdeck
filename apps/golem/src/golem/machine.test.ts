import { describe, expect, it } from 'vitest'
import { assemble } from './assembler'
import { FR, PC } from './isa'
import { createMachine, type Machine, OVERFLOW, step } from './machine'

function machineFor(source: string): Machine {
  const result = assemble(source)
  if (!result.ok) {
    throw new Error(`bad fixture source: ${JSON.stringify(result.errors)}`)
  }
  return createMachine(result.image)
}

/** Runs to halt, with a ceiling so a bug produces a failure rather than a hung suite. */
function run(source: string, limit = 100): Machine {
  let machine = machineFor(source)
  for (let i = 0; i < limit && !machine.halted; i++) {
    machine = step(machine)
  }
  return machine
}

describe('createMachine', () => {
  it('loads the image at word 0 with registers cleared', () => {
    const machine = machineFor('addi r1, r0, 7')

    expect(machine.memory[0]).toBe(0x04000420 | (7 << 10))
    expect(machine.registers.every((value) => value === 0)).toBe(true)
    expect(machine.halted).toBe(false)
  })
})

describe('step', () => {
  it('is pure — the machine it is given is not mutated', () => {
    const before = machineFor('addi r1, r0, 7')
    const after = step(before)

    expect(before.registers[1]).toBe(0)
    expect(after.registers[1]).toBe(7)
  })

  it('advances the PC by one word', () => {
    const machine = step(machineFor('addi r1, r0, 1'))

    expect(machine.registers[PC]).toBe(4)
  })

  it('adds two registers into z', () => {
    const machine = run('addi r1, r0, 20\naddi r2, r0, 22\nadd r3, r1, r2\nint 0')

    expect(machine.registers[3]).toBe(42)
  })

  // The MIPS contract, not a bug: writes to R0 are discarded.
  it('keeps R0 at zero after a write', () => {
    const machine = run('addi r0, r0, 99\nint 0')

    expect(machine.registers[0]).toBe(0)
  })

  it('leaves OV clear when an addition fits', () => {
    const machine = run('addi r1, r0, 0x7FFF\nadd r2, r1, r1\nint 0')

    expect(machine.registers[2]).toBe(0xfffe)
    expect(machine.registers[FR] & OVERFLOW).toBe(0)
  })

  it('sets OV when an addition wraps past 32 bits', () => {
    // Immediates cap at 0xFFFF, so the only way to reach the top of the word is to double.
    // Sixteen doublings put 0xFFFF in the high half; one more addition cannot fit.
    const double = Array.from({ length: 16 }, () => 'add r1, r1, r1')
    const source = ['addi r1, r0, 0xFFFF', ...double, 'add r2, r1, r1', 'int 0'].join('\n')

    const machine = run(source, 50)

    expect(machine.registers[1]).toBe(0xffff0000)
    expect(machine.registers[FR] & OVERFLOW).toBe(OVERFLOW)
  })

  // The immediate is unsigned — the reference reads im16 with no sign extension.
  it('reads an immediate as unsigned', () => {
    const machine = run('addi r1, r0, 0xFFFF\nint 0')

    expect(machine.registers[1]).toBe(0xffff)
  })

  it('halts on int 0', () => {
    const machine = run('addi r1, r0, 1\nint 0')

    expect(machine.halted).toBe(true)
    expect(machine.registers[1]).toBe(1)
  })

  it('returns a halted machine unchanged rather than crashing', () => {
    const halted = run('int 0')

    expect(step(halted)).toBe(halted)
  })
})
