// Pure rendering of machine state for the Console and the panels. Kept out of the components so
// "what a dump looks like" is a testable function rather than something only a DOM assertion can
// reach, and so both surfaces format a value the same way.

import { hex } from './hex'
import { byteShift, EQ, FR, GT, IV, LT, OV, registerName, ZD } from './isa'
import type { Machine } from './machine'

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
]

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
