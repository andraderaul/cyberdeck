import { describe, expect, it } from 'vitest'
import { assemble } from './assembler'
import { flagsOf, formatMemoryDump, formatRegister } from './inspect'
import { EQ, FR, OV } from './isa'
import { createMachine, type Machine } from './machine'

function machineWithFlags(fr: number): Machine {
  const result = assemble('int 0')
  if (!result.ok) {
    throw new Error('bad fixture')
  }
  const machine = createMachine(result.image)
  const registers = [...machine.registers]
  registers[FR] = fr
  return { ...machine, registers }
}

describe('flagsOf', () => {
  it('names every flag rather than returning a hex blob', () => {
    expect(flagsOf(null).map((flag) => flag.name)).toEqual(['EQ', 'LT', 'GT', 'ZD', 'OV', 'IV'])
  })

  it('marks exactly the flags that are set', () => {
    const flags = flagsOf(machineWithFlags(EQ | OV))
    const set = flags.filter((flag) => flag.set).map((flag) => flag.name)

    expect(set).toEqual(['EQ', 'OV'])
  })

  it('reads every flag as clear when there is no machine', () => {
    expect(flagsOf(null).every((flag) => !flag.set)).toBe(true)
  })
})

describe('formatRegister', () => {
  // Hex to read the bit pattern, decimal to read the number — both, because both get asked for.
  it('shows a value in hex and decimal', () => {
    expect(formatRegister(1, 20)).toBe('r1 = 0x00000014  (20)')
  })

  it('names special registers', () => {
    expect(formatRegister(32, 4)).toMatch(/^pc = /)
  })

  it('shows a negative-looking word as its unsigned value', () => {
    expect(formatRegister(1, 0xffffffff)).toBe('r1 = 0xFFFFFFFF  (4294967295)')
  })
})

describe('formatMemoryDump', () => {
  const memory = [0x41424300, 0x00000001, 0xdeadbeef, 0x00000004, 0x00000005]

  it('dumps words four to a line, labelled with the address', () => {
    expect(formatMemoryDump(memory, 0, 4, 'words')).toEqual([
      '0x00000000  0x41424300 0x00000001 0xDEADBEEF 0x00000004',
    ])
  })

  it('wraps onto a second line past four words', () => {
    const lines = formatMemoryDump(memory, 0, 5, 'words')

    expect(lines).toHaveLength(2)
    expect(lines[1]).toBe('0x00000004  0x00000005')
  })

  // Byte 0 of a word is its most significant, so a byte dump reads left to right.
  it('dumps bytes with an ASCII gutter', () => {
    const [line] = formatMemoryDump(memory, 0, 4, 'bytes')

    expect(line).toContain('41 42 43 00')
    expect(line).toContain('|ABC.|')
  })

  it('starts a dump wherever it is asked to', () => {
    expect(formatMemoryDump(memory, 2, 1, 'words')).toEqual(['0x00000002  0xDEADBEEF'])
  })

  it('reads past the end of memory as zero rather than undefined', () => {
    expect(formatMemoryDump([], 0, 1, 'words')).toEqual(['0x00000000  0x00000000'])
  })
})
