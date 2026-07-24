import { describe, expect, it } from 'vitest'
import { assemble } from './assembler'
import { type DeviceReading, devicesOf, flagsOf, formatMemoryDump, formatRegister } from './inspect'
import { EQ, FPU_ERROR, FPU_OPERATIONS, FR, OV, WATCHDOG_ADDRESS, WATCHDOG_ENABLE } from './isa'
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
    // IE joined the list in v2: "interrupts are off" has to be legible at a glance, or a
    // suppressed dispatch looks like the machine ignoring the program.
    expect(flagsOf(null).map((flag) => flag.name)).toEqual([
      'EQ',
      'LT',
      'GT',
      'ZD',
      'OV',
      'IV',
      'IE',
    ])
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

// The byte convention is stated once in isa.ts; these pin it from the display side.
describe('byte order', () => {
  it('reads byte 0 as the most significant of its word', () => {
    const [line] = formatMemoryDump([0x41424300], 0, 4, 'bytes')

    expect(line).toContain('41 42 43 00')
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

describe('devicesOf', () => {
  /** A machine whose watchdog register and FPU hold the given state. */
  function machineWith(watchdog: number, fpu: Partial<Machine['fpu']> = {}): Machine {
    const base = createMachine({ words: [], lineForWord: [] })
    const memory = [...base.memory]
    memory[WATCHDOG_ADDRESS] = watchdog >>> 0
    return { ...base, memory, fpu: { ...base.fpu, ...fpu } }
  }

  const readingFor = (readings: DeviceReading[], label: string) =>
    readings.find((reading) => reading.label === label)

  it('reads the watchdog as an armed countdown, not a hex blob', () => {
    const { watchdog } = devicesOf(machineWith(WATCHDOG_ENABLE | 42))

    expect(readingFor(watchdog, 'enable')?.value).toBe('armed')
    expect(readingFor(watchdog, 'counter')?.value).toBe('42')
  })

  it('says the watchdog is off when the enable bit is clear', () => {
    expect(readingFor(devicesOf(machineWith(42)).watchdog, 'enable')?.value).toBe('off')
  })

  // The whole reason the panel exists: 9.25 should read as 9.25, with the word beside it for
  // anyone who wants the bit pattern.
  it('decodes the FPU registers as floats, keeping the raw word alongside', () => {
    const { fpu } = devicesOf(machineWith(0, { x: 9.25, z: 18.5 }))

    expect(readingFor(fpu, 'x')?.value).toBe('9.25')
    expect(readingFor(fpu, 'x')?.raw).toBe('0x41140000')
    expect(readingFor(fpu, 'z')?.value).toBe('18.5')
  })

  // The raw word follows the machine's value-dependent encoding, so the panel never shows a word
  // a `ldw` of the same register would contradict: 19 reads back as 0x13, not as its IEEE bits.
  it('shows a whole value the word a program would read back', () => {
    const { fpu } = devicesOf(machineWith(0, { z: 19 }))

    expect(readingFor(fpu, 'z')?.value).toBe('19')
    expect(readingFor(fpu, 'z')?.raw).toBe('0x00000013')
  })

  it('names the operation in flight and its remaining cycles', () => {
    const { fpu } = devicesOf(
      machineWith(0, { busy: true, operation: FPU_OPERATIONS.divide, remaining: 3 }),
    )

    expect(readingFor(fpu, 'operation')?.value).toBe('divide')
    expect(readingFor(fpu, 'cycles')?.value).toBe('3')
  })

  it('reads as idle when the FPU has nothing in flight', () => {
    const { fpu } = devicesOf(machineWith(0))

    expect(readingFor(fpu, 'operation')?.value).toBe('idle')
    expect(readingFor(fpu, 'cycles')?.value).toBe('—')
  })

  it('surfaces a faulted operation as an error', () => {
    expect(readingFor(devicesOf(machineWith(0, { control: FPU_ERROR })).fpu, 'status')?.value).toBe(
      'error',
    )
  })

  it('reads as empty rather than crashing when there is no machine', () => {
    const view = devicesOf(null)

    expect(readingFor(view.watchdog, 'enable')?.value).toBe('off')
    expect(readingFor(view.fpu, 'x')?.value).toBe('0')
  })
})
