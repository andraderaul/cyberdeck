// The trace formatter, deliberately **outside** `step`. Keeping it separate is exactly what lets
// the log be diffed against the reference emulator without the log's format becoming part of the
// machine's semantics — if this lived in `step`, changing how a line reads would change what the
// machine is.
//
// The shapes here are the reference emulator's own `fprintf` formats, reproduced so a GOLEM trace
// and a reference trace can be diffed line for line.

import { hex } from './hex'
import { CR, ER, FR, PC, registerName, unpackU } from './isa'
import type { Machine, StepEvent } from './machine'

// The disassembly line names registers in lower case, the effects line in upper.
const lower = (index: number) => registerName(index)
const upper = (index: number) => registerName(index).toUpperCase()

export const TRACE_START = '[START OF SIMULATION]'
export const TRACE_END = '[END OF SIMULATION]'

/** Type U operators that read as `Rz = Rx <op> Ry`, and which extra registers they report. */
const BINARY_U: Record<number, { mnemonic: string; symbol: string; fr: boolean; er: boolean }> = {
  0: { mnemonic: 'add', symbol: '+', fr: true, er: false },
  2: { mnemonic: 'sub', symbol: '-', fr: true, er: false },
  4: { mnemonic: 'mul', symbol: '*', fr: true, er: true },
  6: { mnemonic: 'div', symbol: '/', fr: true, er: true },
  12: { mnemonic: 'and', symbol: '&', fr: false, er: false },
  16: { mnemonic: 'or', symbol: '|', fr: false, er: false },
  18: { mnemonic: 'xor', symbol: '^', fr: false, er: false },
}

/** Type F operators that read as `Rx = Ry <op> N`. */
const BINARY_F: Record<number, { mnemonic: string; symbol: string; fr: boolean; er: boolean }> = {
  1: { mnemonic: 'addi', symbol: '+', fr: true, er: false },
  3: { mnemonic: 'subi', symbol: '-', fr: true, er: false },
  5: { mnemonic: 'muli', symbol: '*', fr: true, er: true },
  7: { mnemonic: 'divi', symbol: '/', fr: true, er: true },
  13: { mnemonic: 'andi', symbol: '&', fr: false, er: false },
  17: { mnemonic: 'ori', symbol: '|', fr: false, er: false },
  19: { mnemonic: 'xori', symbol: '^', fr: false, er: false },
}

const BRANCHES: Record<number, string> = {
  26: 'bun',
  27: 'beq',
  28: 'blt',
  29: 'bgt',
  30: 'bne',
  31: 'ble',
  32: 'bge',
  33: 'bzd',
  34: 'bnz',
  35: 'biv',
  36: 'bni',
}

/**
 * The reference emulator's marker for a dispatch, emitted *after* the lines of the instruction
 * that caused it — the order the reference writes them, and therefore the order a diff expects.
 */
export function formatEvent(event: StepEvent): string {
  switch (event.kind) {
    case 'software-interrupt':
      return '[SOFTWARE INTERRUPTION]'
  }
}

/**
 * Renders the instruction that took `before` to `after` as the two lines a trace entry is: the
 * disassembly, then the effects it had — followed by a marker line per event the Step raised.
 * Pure, and reads only what it is given.
 */
export function formatStep(
  before: Machine,
  after: Machine,
  events: readonly StepEvent[] = [],
): string {
  const entry = formatInstruction(before, after)
  return [entry, ...events.map(formatEvent)].join('\n')
}

function formatInstruction(before: Machine, after: Machine): string {
  const instruction = (before.memory[before.registers[PC] >>> 2] ?? 0) >>> 0
  const opcode = instruction >>> 26

  const z = unpackU('z', instruction)
  const ux = unpackU('x', instruction)
  const uy = unpackU('y', instruction)
  const fx = (instruction >>> 5) & 0x1f
  const fy = instruction & 0x1f
  const im16 = (instruction >>> 10) & 0xffff
  const im26 = instruction & 0x3ffffff

  // Reported after the instruction ran, which is why both states are needed.
  const flags = () => `FR = 0x${hex(after.registers[FR])}, `
  const extension = () => `ER = 0x${hex(after.registers[ER])}, `

  const binaryU = BINARY_U[opcode]
  if (binaryU) {
    const { mnemonic, symbol, fr, er } = binaryU
    return [
      `${mnemonic} ${lower(z)}, ${lower(ux)}, ${lower(uy)}`,
      `[U] ${fr ? flags() : ''}${er ? extension() : ''}${upper(z)} = ${upper(ux)} ${symbol} ${upper(uy)} = 0x${hex(after.registers[z])}`,
    ].join('\n')
  }

  const binaryF = BINARY_F[opcode]
  if (binaryF) {
    const { mnemonic, symbol, fr, er } = binaryF
    return [
      `${mnemonic} ${lower(fx)}, ${lower(fy)}, ${im16}`,
      `[F] ${fr ? flags() : ''}${er ? extension() : ''}${upper(fx)} = ${upper(fy)} ${symbol} 0x${hex(im16, 4)} = 0x${hex(after.registers[fx])}`,
    ].join('\n')
  }

  if (opcode in BRANCHES) {
    return [`${BRANCHES[opcode]} 0x${hex(im26)}`, `[S] PC = 0x${hex(after.registers[PC])}`].join(
      '\n',
    )
  }

  switch (opcode) {
    case 0x08:
      return [`cmp ${lower(ux)}, ${lower(uy)}`, `[U] FR = 0x${hex(after.registers[FR])}`].join('\n')

    case 0x09:
      return [`cmpi ${lower(fx)}, ${im16}`, `[F] FR = 0x${hex(after.registers[FR])}`].join('\n')

    // The field holds N-1, and the reference prints the field, then the places actually displaced.
    case 0x0a:
      return [
        `shl ${lower(z)}, ${lower(ux)}, ${uy}`,
        `[U] ER = 0x${hex(after.registers[ER])}, ${upper(z)} = ${upper(ux)} << ${uy + 1} = 0x${hex(after.registers[z])}`,
      ].join('\n')
    case 0x0b:
      return [
        `shr ${lower(z)}, ${lower(ux)}, ${uy}`,
        `[U] ER = 0x${hex(after.registers[ER])}, ${upper(z)} = ${upper(ux)} >> ${uy + 1} = 0x${hex(after.registers[z])}`,
      ].join('\n')

    case 0x0e:
      return [
        `not ${lower(ux)}, ${lower(uy)}`,
        `[U] ${upper(ux)} = ~${upper(uy)} = 0x${hex(after.registers[ux])}`,
      ].join('\n')
    case 0x0f:
      return [
        `noti ${lower(fx)}, ${im16}`,
        `[F] ${upper(fx)} = ~0x${hex(im16, 4)} = 0x${hex(after.registers[fx])}`,
      ].join('\n')

    case 0x14:
      return [
        `ldw ${lower(fx)}, ${lower(fy)}, 0x${hex(im16, 4)}`,
        `[F] ${upper(fx)} = MEM[(${upper(fy)} + 0x${hex(im16, 4)}) << 2] = 0x${hex(after.registers[fx])}`,
      ].join('\n')
    case 0x15:
      return [
        `ldb ${lower(fx)}, ${lower(fy)}, 0x${hex(im16, 4)}`,
        `[F] ${upper(fx)} = MEM[${upper(fy)} + 0x${hex(im16, 4)}] = 0x${hex(after.registers[fx], 2)}`,
      ].join('\n')
    case 0x16:
      return [
        `stw ${lower(fx)}, 0x${hex(im16, 4)}, ${lower(fy)}`,
        `[F] MEM[(${upper(fx)} + 0x${hex(im16, 4)}) << 2] = ${upper(fy)} = 0x${hex(before.registers[fy])}`,
      ].join('\n')
    case 0x17:
      return [
        `stb ${lower(fx)}, 0x${hex(im16, 4)}, ${lower(fy)}`,
        `[F] MEM[${upper(fx)} + 0x${hex(im16, 4)}] = ${upper(fy)} = 0x${hex(before.registers[fy] & 0xff, 2)}`,
      ].join('\n')

    case 0x18:
      return [
        `push ${lower(ux)}, ${lower(uy)}`,
        `[U] MEM[${upper(ux)}--] = ${upper(uy)} = 0x${hex(before.registers[uy])}`,
      ].join('\n')
    case 0x19:
      return [
        `pop ${lower(ux)}, ${lower(uy)}`,
        `[U] ${upper(ux)} = MEM[++${upper(uy)}] = 0x${hex(after.registers[ux])}`,
      ].join('\n')

    case 0x25:
      return [
        `call ${lower(fx)}, ${lower(fy)}, 0x${hex(im16, 4)}`,
        `[F] ${upper(fx)} = (PC + 4) >> 2 = 0x${hex(after.registers[fx])}, PC = (${upper(fy)} + 0x${hex(im16, 4)}) << 2 = 0x${hex(after.registers[PC])}`,
      ].join('\n')
    case 0x26:
      return [
        `ret ${lower(fx)}`,
        `[F] PC = ${upper(fx)} << 2 = 0x${hex(after.registers[PC])}`,
      ].join('\n')

    case 0x3f:
      return [
        `int ${im26}`,
        `[S] CR = 0x${hex(after.registers[CR])}, PC = 0x${hex(after.registers[PC])}`,
      ].join('\n')

    default:
      return [`?? 0x${hex(instruction)}`, `[?] FR = 0x${hex(after.registers[FR])}`].join('\n')
  }
}

/** Frames already-formatted trace lines the way the reference emulator frames a run. */
export function frameTrace(lines: readonly string[]): string {
  return [TRACE_START, ...lines, TRACE_END].join('\n')
}

/** The whole log for collected steps, framed so it can be diffed directly against the reference. */
export function formatTrace(
  steps: { before: Machine; after: Machine; events?: readonly StepEvent[] }[],
): string {
  return frameTrace(steps.map(({ before, after, events }) => formatStep(before, after, events)))
}

/** The Image in the reference `.hex` format: one `0x`-prefixed word per line. */
export function formatHex(words: readonly number[]): string {
  return `${words.map((word) => `0x${hex(word)}`).join('\n')}\n`
}
