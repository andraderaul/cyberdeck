// Source → Image. The tracer bullet's slice: `add`, `addi` and `int`, with no labels, data or
// strings — #137 widens this against the same structure and the same error vocabulary.

import { canonicalMnemonic, INSTRUCTIONS, registerIndex } from './isa'

/** An assemble failure, carrying the 1-based source line so the Console can point at it. */
export interface AssembleError {
  line: number
  message: string
}

/**
 * Assembled program. `lineForWord` maps each word back to the source line that produced it —
 * the current-line marker (#145) and breakpoints read it, so it is built here rather than
 * reconstructed later.
 */
export interface Image {
  words: number[]
  lineForWord: number[]
}

export type AssembleResult = { ok: true; image: Image } | { ok: false; errors: AssembleError[] }

// Immediates are unsigned: the machine reads im16 with no sign extension, which is why the ISA
// carries `subi` rather than negative immediates. Writing -1 here would silently mean 65535.
const IMMEDIATE_MAX = 0xffff

/**
 * Assembles source into an Image, or returns every error found rather than the first — a program
 * with three typos should take one pass to fix, not three. Never throws.
 */
export function assemble(source: string): AssembleResult {
  const errors: AssembleError[] = []
  const words: number[] = []
  const lineForWord: number[] = []

  source.split('\n').forEach((rawLine, index) => {
    const line = index + 1
    const text = stripComment(rawLine).trim()
    if (text === '') {
      return
    }

    const word = encodeInstruction(text, line, errors)
    if (word === null) {
      return
    }

    words.push(word)
    lineForWord.push(line)
  })

  if (errors.length > 0) {
    return { ok: false, errors }
  }
  return { ok: true, image: { words, lineForWord } }
}

function stripComment(line: string): string {
  const comment = line.indexOf('//')
  return comment === -1 ? line : line.slice(0, comment)
}

function encodeInstruction(text: string, line: number, errors: AssembleError[]): number | null {
  const [rawMnemonic, ...rest] = text.split(/\s+/)
  const mnemonic = canonicalMnemonic(rawMnemonic)
  const spec = INSTRUCTIONS[mnemonic]

  if (!spec) {
    errors.push({ line, message: `Unknown instruction "${rawMnemonic}"` })
    return null
  }

  const operands = rest
    .join(' ')
    .split(',')
    .map((operand) => operand.trim())
    .filter((operand) => operand !== '')

  switch (spec.form) {
    case 'U':
      return encodeU(spec.opcode, operands, mnemonic, line, errors)
    case 'F':
      return encodeF(spec.opcode, operands, mnemonic, line, errors)
    case 'S':
      return encodeS(spec.opcode, operands, mnemonic, line, errors)
  }
}

// `z` is the destination in type U — the trap ISA.md calls out. `add rz, rx, ry`.
function encodeU(
  opcode: number,
  operands: string[],
  mnemonic: string,
  line: number,
  errors: AssembleError[],
): number | null {
  if (!expectArity(operands, 3, mnemonic, line, errors)) {
    return null
  }

  const z = parseRegister(operands[0], line, errors)
  const x = parseRegister(operands[1], line, errors)
  const y = parseRegister(operands[2], line, errors)
  if (z === null || x === null || y === null) {
    return null
  }

  return ((opcode << 26) | (z << 10) | (x << 5) | y) >>> 0
}

// `addi rx, ry, N` — the destination is `x` and the immediate rides in bits 25–10.
function encodeF(
  opcode: number,
  operands: string[],
  mnemonic: string,
  line: number,
  errors: AssembleError[],
): number | null {
  if (!expectArity(operands, 3, mnemonic, line, errors)) {
    return null
  }

  const x = parseRegister(operands[0], line, errors)
  const y = parseRegister(operands[1], line, errors)
  const immediate = parseImmediate(operands[2], line, errors)
  if (x === null || y === null || immediate === null) {
    return null
  }

  return ((opcode << 26) | ((immediate & 0xffff) << 10) | (x << 5) | y) >>> 0
}

function encodeS(
  opcode: number,
  operands: string[],
  mnemonic: string,
  line: number,
  errors: AssembleError[],
): number | null {
  if (!expectArity(operands, 1, mnemonic, line, errors)) {
    return null
  }

  const immediate = parseImmediate(operands[0], line, errors)
  if (immediate === null) {
    return null
  }

  return ((opcode << 26) | (immediate & 0x3ffffff)) >>> 0
}

function expectArity(
  operands: string[],
  arity: number,
  mnemonic: string,
  line: number,
  errors: AssembleError[],
): boolean {
  if (operands.length === arity) {
    return true
  }
  errors.push({
    line,
    message: `"${mnemonic}" takes ${arity} operand${arity === 1 ? '' : 's'}, got ${operands.length}`,
  })
  return false
}

function parseRegister(operand: string, line: number, errors: AssembleError[]): number | null {
  const index = registerIndex(operand)
  if (index === null) {
    errors.push({ line, message: `"${operand}" is not a register` })
    return null
  }
  return index
}

// Rejected here rather than truncated silently, so nobody debugs a value that shrank at runtime.
function parseImmediate(operand: string, line: number, errors: AssembleError[]): number | null {
  const value = /^-?0x[0-9a-f]+$/i.test(operand)
    ? Number.parseInt(operand, 16)
    : /^-?\d+$/.test(operand)
      ? Number.parseInt(operand, 10)
      : Number.NaN

  if (Number.isNaN(value)) {
    errors.push({ line, message: `"${operand}" is not a number` })
    return null
  }

  if (value < 0) {
    errors.push({
      line,
      message: `Immediate ${operand} is negative — immediates are unsigned here, use subi instead`,
    })
    return null
  }

  if (value > IMMEDIATE_MAX) {
    errors.push({
      line,
      message: `Immediate ${operand} does not fit in 16 bits (0..${IMMEDIATE_MAX})`,
    })
    return null
  }

  return value
}
