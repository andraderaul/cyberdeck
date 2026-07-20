// Pure rendering of machine state for the Console and the panels. Kept out of the components so
// "what a dump looks like" is a testable function rather than something only a DOM assertion can
// reach, and so both surfaces format a value the same way.

import { hex } from './hex'
import {
  byteShift,
  EQ,
  FPU_OPERATIONS,
  FR,
  GT,
  IE,
  IV,
  LT,
  OV,
  registerName,
  WATCHDOG_ADDRESS,
  WATCHDOG_COUNTER,
  WATCHDOG_ENABLE,
  ZD,
} from './isa'
import { fpuWord, type Machine } from './machine'

export type MemoryUnit = 'words' | 'bytes'

/** A flag, by name, with whether it is currently set — never a hex blob to decode. */
export interface Flag {
  name: string
  set: boolean
  /** What it means, for the panel's title text. */
  meaning: string
}

const FLAGS: { name: string; bit: number; meaning: string }[] = [
  { name: 'EQ', bit: EQ, meaning: 'the last comparison was equal' },
  { name: 'LT', bit: LT, meaning: 'the last comparison was less than' },
  { name: 'GT', bit: GT, meaning: 'the last comparison was greater than' },
  { name: 'ZD', bit: ZD, meaning: 'a divide by zero happened' },
  { name: 'OV', bit: OV, meaning: 'an arithmetic result overflowed' },
  { name: 'IV', bit: IV, meaning: 'an invalid instruction was executed' },
  { name: 'IE', bit: IE, meaning: 'interrupts are enabled' },
]

const OPERATION_NAMES: Record<number, string> = {
  [FPU_OPERATIONS.add]: 'add',
  [FPU_OPERATIONS.subtract]: 'subtract',
  [FPU_OPERATIONS.multiply]: 'multiply',
  [FPU_OPERATIONS.divide]: 'divide',
  [FPU_OPERATIONS.assignX]: 'x = z',
  [FPU_OPERATIONS.assignY]: 'y = z',
  [FPU_OPERATIONS.ceiling]: 'ceiling',
  [FPU_OPERATIONS.floor]: 'floor',
  [FPU_OPERATIONS.round]: 'round',
}

/** One readable row in the DEVICES panel: a label, its value, and an optional raw word beside it. */
export interface DeviceReading {
  label: string
  value: string
  /** The underlying word, where seeing the bit pattern is the point. */
  raw?: string
}

export interface DeviceView {
  watchdog: DeviceReading[]
  fpu: DeviceReading[]
}

/**
 * What the DEVICES panel shows, derived rather than stored — so "9.25 reads as 9.25 and not as
 * 0x41140000" is a pure function with a test, not something only a DOM assertion could reach.
 */
export function devicesOf(machine: Machine | null): DeviceView {
  const register = machine?.memory[WATCHDOG_ADDRESS] ?? 0
  const enabled = (register & WATCHDOG_ENABLE) !== 0
  const fpu = machine?.fpu

  return {
    watchdog: [
      { label: 'enable', value: enabled ? 'armed' : 'off' },
      {
        label: 'counter',
        value: String(register & WATCHDOG_COUNTER),
        raw: hex32(register),
      },
    ],
    // The raw word is the one a program would read back, not the IEEE-754 bits: the encoding is
    // value-dependent (see ISA.md), so z = 19 shows 0x00000013 while z = 9.25 shows 0x41140000.
    fpu: [
      { label: 'x', value: decimal(fpu?.x ?? 0), raw: hex32(fpuWord(fpu?.x ?? 0)) },
      { label: 'y', value: decimal(fpu?.y ?? 0), raw: hex32(fpuWord(fpu?.y ?? 0)) },
      { label: 'z', value: decimal(fpu?.z ?? 0), raw: hex32(fpuWord(fpu?.z ?? 0)) },
      {
        label: 'operation',
        value: fpu?.busy ? (OPERATION_NAMES[fpu.operation] ?? 'undefined') : 'idle',
      },
      { label: 'cycles', value: fpu?.busy ? String(fpu.remaining) : '—' },
      { label: 'status', value: (fpu?.control ?? 0) === 0 ? 'ok' : 'error' },
    ],
  }
}

// Trailing zeros dropped, so a whole number reads as one — the panel exists to make a float
// legible, and `18.5` says more than `18.500000`.
function decimal(value: number): string {
  return Number.isInteger(value) ? String(value) : String(Number(value.toFixed(6)))
}

export const hex32 = (value: number) => `0x${hex(value)}`
export const hex8 = (value: number) => hex(value & 0xff, 2)

/** Reads `FR` as named flags. */
export function flagsOf(machine: Machine | null): Flag[] {
  const fr = machine?.registers[FR] ?? 0
  return FLAGS.map(({ name, bit, meaning }) => ({ name, meaning, set: (fr & bit) !== 0 }))
}

/** One register, in both bases — hex to read the bit pattern, decimal to read the number. */
export function formatRegister(index: number, value: number): string {
  return `${registerName(index)} = ${hex32(value)}  (${value >>> 0})`
}

/**
 * A memory dump, one line per row. Words are shown four to a line and bytes sixteen, each line
 * labelled with the address it starts at — in the unit being dumped, so the label matches the
 * instruction that wrote the region.
 */
export function formatMemoryDump(
  memory: readonly number[],
  start: number,
  count: number,
  unit: MemoryUnit,
): string[] {
  return unit === 'words' ? dumpWords(memory, start, count) : dumpBytes(memory, start, count)
}

function dumpWords(memory: readonly number[], start: number, count: number): string[] {
  const lines: string[] = []
  const perLine = 4

  for (let offset = 0; offset < count; offset += perLine) {
    const address = start + offset
    const cells: string[] = []
    for (let index = 0; index < perLine && offset + index < count; index++) {
      cells.push(hex32(memory[address + index] ?? 0))
    }
    lines.push(`${hex32(address)}  ${cells.join(' ')}`)
  }

  return lines
}

function byteAt(memory: readonly number[], address: number): number {
  return ((memory[address >>> 2] ?? 0) >>> byteShift(address)) & 0xff
}

function dumpBytes(memory: readonly number[], start: number, count: number): string[] {
  const lines: string[] = []
  const perLine = 16

  for (let offset = 0; offset < count; offset += perLine) {
    const address = start + offset
    const cells: string[] = []
    const glyphs: string[] = []

    for (let index = 0; index < perLine && offset + index < count; index++) {
      const byte = byteAt(memory, address + index)
      cells.push(hex8(byte))
      glyphs.push(byte >= 0x20 && byte < 0x7f ? String.fromCharCode(byte) : '.')
    }

    lines.push(
      `${hex32(address)}  ${cells.join(' ').padEnd(perLine * 3 - 1)}  |${glyphs.join('')}|`,
    )
  }

  return lines
}
