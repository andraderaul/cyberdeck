// Source → Image. The deepest module here, and the half that never existed in the reference
// material. Two passes: the first fixes every label to a word index, the second encodes.

import {
  byteShift,
  canonicalMnemonic,
  INSTRUCTIONS,
  type Operand,
  packU,
  registerIndex,
  type Spec,
} from './isa'

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
const IM26_MAX = 0x3ffffff

// A shift is stored as `N - 1` in a six-bit field, so it displaces 1..64 and never zero.
const SHIFT_MIN = 1
const SHIFT_MAX = 64

/** One source line, already classified by the first pass. */
type Piece =
  | { kind: 'instruction'; line: number; mnemonic: string; spec: Spec; operands: string[] }
  | { kind: 'data'; line: number; words: number[] }
  | { kind: 'error'; line: number; message: string }

/**
 * Assembles source into an Image, or returns every error found rather than the first — a program
 * with three typos should take one pass to fix, not three. Never throws.
 */
export function assemble(source: string): AssembleResult {
  const errors: AssembleError[] = []
  const labels = new Map<string, number>()
  const pieces: Piece[] = []

  // Pass 1 — classify each line and fix every label to the word index it sits at, so a jump
  // forward resolves as readily as a jump back.
  let wordIndex = 0
  source.split('\n').forEach((rawLine, index) => {
    const line = index + 1
    let text = stripComment(rawLine).trim()

    let label = /^([A-Za-z_]\w*)\s*:/.exec(text)
    while (label) {
      const name = label[1].toLowerCase()
      if (labels.has(name)) {
        errors.push({ line, message: `Label "${label[1]}" is defined twice` })
      }
      labels.set(name, wordIndex)
      text = text.slice(label[0].length).trim()
      label = /^([A-Za-z_]\w*)\s*:/.exec(text)
    }

    if (text === '') {
      return
    }

    const piece = classify(text, line)
    pieces.push(piece)
    wordIndex += pieceWidth(piece)
  })

  // Pass 2 — encode, now that every label has a value.
  const words: number[] = []
  const lineForWord: number[] = []

  for (const piece of pieces) {
    if (piece.kind === 'error') {
      errors.push({ line: piece.line, message: piece.message })
      continue
    }

    if (piece.kind === 'data') {
      for (const word of piece.words) {
        words.push(word)
        lineForWord.push(piece.line)
      }
      continue
    }

    const word = encode(piece, labels, errors)
    if (word === null) {
      continue
    }
    words.push(word)
    lineForWord.push(piece.line)
  }

  if (errors.length > 0) {
    return { ok: false, errors }
  }
  return { ok: true, image: { words, lineForWord } }
}

/** Maps each source line to the first word index it assembles to — breakpoints resolve through it. */
export function wordIndexForLine(image: Image): Map<number, number> {
  const map = new Map<number, number>()
  image.lineForWord.forEach((line, index) => {
    if (!map.has(line)) {
      map.set(line, index)
    }
  })
  return map
}

function stripComment(line: string): string {
  const comment = line.indexOf('//')
  return comment === -1 ? line : line.slice(0, comment)
}

function pieceWidth(piece: Piece): number {
  if (piece.kind === 'data') {
    return piece.words.length
  }
  return piece.kind === 'instruction' ? 1 : 0
}

function classify(text: string, line: number): Piece {
  // `nop` is a pseudo-instruction for the zero word, not an opcode of its own.
  if (text.toLowerCase() === 'nop') {
    return { kind: 'data', line, words: [0] }
  }

  const [rawMnemonic, ...rest] = text.split(/\s+/)
  const spec = INSTRUCTIONS[canonicalMnemonic(rawMnemonic)]

  if (spec) {
    const operands = rest
      .join(' ')
      .split(',')
      .map((operand) => operand.trim())
      .filter((operand) => operand !== '')
    return {
      kind: 'instruction',
      line,
      mnemonic: canonicalMnemonic(rawMnemonic),
      spec,
      operands,
    }
  }

  return classifyData(text, line)
}

// Data is written bare, one word per line: decimal, hex, or a quoted string packed into bytes.
function classifyData(text: string, line: number): Piece {
  if (text.startsWith('"')) {
    const bytes = parseString(text)
    return typeof bytes === 'string'
      ? { kind: 'error', line, message: bytes }
      : { kind: 'data', line, words: packBytes(bytes) }
  }

  const value = parseNumber(text)
  if (value === null) {
    return { kind: 'error', line, message: `Unknown instruction "${text.split(/\s+/)[0]}"` }
  }
  return { kind: 'data', line, words: [value >>> 0] }
}

const ESCAPES: Record<string, string> = {
  n: '\n',
  t: '\t',
  r: '\r',
  '0': '\0',
  '\\': '\\',
  '"': '"',
}

/** Parses a quoted string to its bytes, NUL terminator included. Returns a message on failure. */
function parseString(text: string): number[] | string {
  const bytes: number[] = []
  let index = 1
  let closed = false

  while (index < text.length) {
    const char = text[index]

    if (char === '"') {
      closed = true
      index++
      break
    }

    if (char === '\\') {
      const escaped = text[index + 1]
      if (escaped === undefined) {
        return 'String ends in a dangling backslash'
      }
      const decoded = ESCAPES[escaped]
      if (decoded === undefined) {
        return `Unknown escape "\\${escaped}" in string`
      }
      bytes.push(decoded.charCodeAt(0))
      index += 2
      continue
    }

    const code = char.codePointAt(0) ?? 0
    if (code > 0xff) {
      return `Character "${char}" does not fit in a byte`
    }
    bytes.push(code)
    index++
  }

  if (!closed) {
    return 'String is missing its closing quote'
  }

  const trailing = text.slice(index).trim()
  if (trailing !== '') {
    return `Unexpected "${trailing}" after string`
  }

  bytes.push(0)
  return bytes
}

// Packed by the same convention the machine reads bytes with, so a string comes back out of `ldb`
// in the order it was written.
function packBytes(bytes: number[]): number[] {
  const words: number[] = []
  for (let index = 0; index < bytes.length; index += 4) {
    let word = 0
    for (let offset = 0; offset < 4; offset++) {
      word |= (bytes[index + offset] ?? 0) << byteShift(offset)
    }
    words.push(word >>> 0)
  }
  return words
}

function parseNumber(text: string): number | null {
  if (/^-?0x[0-9a-f]+$/i.test(text)) {
    return Number.parseInt(text, 16)
  }
  if (/^-?\d+$/.test(text)) {
    return Number.parseInt(text, 10)
  }
  return null
}

/** What every encoder needs: the label table, the line to blame, and where errors accumulate. */
interface EncodeContext {
  labels: Map<string, number>
  line: number
  errors: AssembleError[]
}

function encode(
  piece: Extract<Piece, { kind: 'instruction' }>,
  labels: Map<string, number>,
  errors: AssembleError[],
): number | null {
  const { spec, operands, mnemonic, line } = piece
  const context: EncodeContext = { labels, line, errors }

  if (operands.length !== spec.operands.length) {
    const expected = spec.operands.length
    errors.push({
      line,
      message: `"${mnemonic}" takes ${expected} operand${expected === 1 ? '' : 's'}, got ${operands.length}`,
    })
    return null
  }

  let word = (spec.opcode << 26) >>> 0
  let failed = false

  spec.operands.forEach((slot, index) => {
    const encoded = encodeOperand(slot, operands[index], spec, mnemonic, context)
    if (encoded === null) {
      failed = true
      return
    }
    word = (word | encoded) >>> 0
  })

  return failed ? null : word
}

function encodeOperand(
  slot: Operand,
  written: string,
  spec: Spec,
  mnemonic: string,
  context: EncodeContext,
): number | null {
  const { line, errors } = context

  if (slot === 'shift') {
    const amount = resolveValue(written, context)
    if (amount === null) {
      return null
    }
    if (amount < SHIFT_MIN || amount > SHIFT_MAX) {
      errors.push({
        line,
        message: `Shift of ${written} is out of range (${SHIFT_MIN}..${SHIFT_MAX})`,
      })
      return null
    }
    // Stored as N-1: there is no shift of zero, so the field starts counting at one.
    return packU('y', amount - 1)
  }

  if (slot === 'imm') {
    return encodeImmediate(written, spec, context)
  }

  const index = registerIndex(written)
  if (index === null) {
    errors.push({ line, message: `"${written}" is not a register` })
    return null
  }

  if (spec.form === 'U') {
    return packU(slot, index)
  }

  // Type F has no room for a sixth register bit — im16 occupies bits 25–10.
  if (index > 31) {
    errors.push({
      line,
      message: `"${written}" is a special register, and "${mnemonic}" has no field wide enough for one`,
    })
    return null
  }
  return (index << (slot === 'x' ? 5 : 0)) >>> 0
}

function encodeImmediate(written: string, spec: Spec, context: EncodeContext): number | null {
  const { line, errors } = context

  const value = resolveValue(written, context)
  if (value === null) {
    return null
  }

  if (value < 0) {
    errors.push({
      line,
      message: `Immediate ${written} is negative — immediates are unsigned here, use subi instead`,
    })
    return null
  }

  if (spec.form === 'S') {
    if (value > IM26_MAX) {
      errors.push({ line, message: `Immediate ${written} does not fit in 26 bits` })
      return null
    }
    return value >>> 0
  }

  if (value > IMMEDIATE_MAX) {
    errors.push({
      line,
      message: `Immediate ${written} does not fit in 16 bits (0..${IMMEDIATE_MAX})`,
    })
    return null
  }
  return ((value & 0xffff) << 10) >>> 0
}

/** A written value is either a literal or a label, and a label evaluates to its word index. */
function resolveValue(written: string, context: EncodeContext): number | null {
  const literal = parseNumber(written)
  if (literal !== null) {
    return literal
  }

  const label = context.labels.get(written.toLowerCase())
  if (label !== undefined) {
    return label
  }

  context.errors.push({ line: context.line, message: `Undefined label "${written}"` })
  return null
}
