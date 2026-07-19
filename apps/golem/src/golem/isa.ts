// The encoding tables, shared by the assembler and the machine so an opcode is spelled once.
// docs/ISA.md is the source of truth for every value here.

/** Instruction shape — decides which operand fields an encoding carries. */
export type Form = 'U' | 'F' | 'S'

/**
 * Where a written operand lands. `z`/`x`/`y` are register fields, `imm` the immediate, and
 * `shift` a shift amount, which occupies `y` but is stored as `N - 1` (there is no shift of zero).
 * Listing them in *source* order is what encodes the inherited asymmetries — `stw rx, N, ry`
 * puts its immediate in the middle, while `ldw rx, ry, N` does not.
 */
export type Operand = 'z' | 'x' | 'y' | 'imm' | 'shift'

export interface Spec {
  opcode: number
  form: Form
  operands: Operand[]
}

const u = (opcode: number, operands: Operand[]): Spec => ({ opcode, form: 'U', operands })
const f = (opcode: number, operands: Operand[]): Spec => ({ opcode, form: 'F', operands })
const s = (opcode: number, operands: Operand[]): Spec => ({ opcode, form: 'S', operands })

const BRANCH_OPCODES: Record<string, number> = {
  bun: 0x1a,
  beq: 0x1b,
  blt: 0x1c,
  bgt: 0x1d,
  bne: 0x1e,
  ble: 0x1f,
  bge: 0x20,
  bzd: 0x21,
  bnz: 0x22,
  biv: 0x23,
  bni: 0x24,
}

/** All 42 instructions, in the three encoding forms. */
export const INSTRUCTIONS: Record<string, Spec> = {
  // Arithmetic
  add: u(0x00, ['z', 'x', 'y']),
  addi: f(0x01, ['x', 'y', 'imm']),
  sub: u(0x02, ['z', 'x', 'y']),
  subi: f(0x03, ['x', 'y', 'imm']),
  mul: u(0x04, ['z', 'x', 'y']),
  muli: f(0x05, ['x', 'y', 'imm']),
  div: u(0x06, ['z', 'x', 'y']),
  divi: f(0x07, ['x', 'y', 'imm']),
  cmp: u(0x08, ['x', 'y']),
  cmpi: f(0x09, ['x', 'imm']),

  // Logic and shifts
  shl: u(0x0a, ['z', 'x', 'shift']),
  shr: u(0x0b, ['z', 'x', 'shift']),
  and: u(0x0c, ['z', 'x', 'y']),
  andi: f(0x0d, ['x', 'y', 'imm']),
  not: u(0x0e, ['x', 'y']),
  noti: f(0x0f, ['x', 'imm']),
  or: u(0x10, ['z', 'x', 'y']),
  ori: f(0x11, ['x', 'y', 'imm']),
  xor: u(0x12, ['z', 'x', 'y']),
  xori: f(0x13, ['x', 'y', 'imm']),

  // Memory — note the inherited asymmetry: stores put the immediate in the middle.
  ldw: f(0x14, ['x', 'y', 'imm']),
  ldb: f(0x15, ['x', 'y', 'imm']),
  stw: f(0x16, ['x', 'imm', 'y']),
  stb: f(0x17, ['x', 'imm', 'y']),
  push: u(0x18, ['x', 'y']),
  pop: u(0x19, ['x', 'y']),

  // Control flow
  ...Object.fromEntries(
    Object.entries(BRANCH_OPCODES).map(([name, opcode]) => [name, s(opcode, ['imm'])]),
  ),
  call: f(0x25, ['x', 'y', 'imm']),
  ret: f(0x26, ['x']),
  isr: f(0x27, ['x', 'y', 'imm']),
  reti: f(0x28, ['x']),
  int: s(0x3f, ['imm']),
}

/** Readable mnemonics accepted anywhere the canonical one is (ISA.md, "Sintaxe do assembler"). */
export const ALIASES: Record<string, string> = {
  lsl: 'shl',
  lsr: 'shr',
  load: 'ldw',
  loadb: 'ldb',
  store: 'stw',
  storeb: 'stb',
  jmp: 'bun',
  jeq: 'beq',
  jlt: 'blt',
  jgt: 'bgt',
  jne: 'bne',
  jle: 'ble',
  jge: 'bge',
  jzd: 'bzd',
  jnz: 'bnz',
  jiv: 'biv',
  jni: 'bni',
  halt: 'int',
}

export const GENERAL_REGISTERS = 32

/** Special registers live at 32+ in the same register fields. */
export const SPECIAL_REGISTERS = ['pc', 'ir', 'er', 'fr', 'cr', 'ipc'] as const

export const REGISTER_COUNT = GENERAL_REGISTERS + SPECIAL_REGISTERS.length

export const PC = 32
export const IR = 33
export const ER = 34
export const FR = 35
export const CR = 36
export const IPC = 37

export const EQ = 0x01
export const LT = 0x02
export const GT = 0x04
export const ZD = 0x08
export const OV = 0x10
export const IV = 0x20
/** Interrupt enable. A software interrupt is dispatched only while this is set. */
export const IE = 0x40

/**
 * Interrupt vectors, at the head of memory as *byte* addresses. Word 0 is the entry point, so a
 * program's first instruction is the `call` that jumps past the three handlers.
 */
export const HARDWARE_1_VECTOR = 0x04
export const HARDWARE_2_VECTOR = 0x08
export const SOFTWARE_VECTOR = 0x0c

/** Cause codes the machine raises itself, as opposed to the `N` an `int N` carries. */
export const CAUSE_ZERO_DIVISION = 0x01
export const CAUSE_INVALID_INSTRUCTION = 0x2a

/**
 * Mnemonics the assembler expands into **more than one** instruction — which is exactly what
 * separates a Macro from an Alias (`CONTEXT.md`): an alias is 1:1, a macro is not.
 *
 * `enai` is the only one, and it is here because the reference Sources use it, not for
 * convenience. The expansion is pinned by the `.hex` fixtures word for word, scratch register
 * included: the operand register is clobbered with the IE mask on the way through.
 */
export const MACROS: Record<string, (operand: string) => string[]> = {
  enai: (register) => [`addi ${register}, r0, ${IE}`, `or fr, fr, ${register}`],
}

/** Words of addressable memory. Must span the Terminal at byte `0x0000888B`. */
export const MEMORY_WORDS = 0x4000

/** Terminal device, memory-mapped at a *byte* address — writing a byte emits a character. */
export const TERMINAL_ADDRESS = 0x0000888b

/**
 * Register fields are **six** bits wide in type U, not five: the sixth bit of each sits apart
 * from the rest, at bits 17 (`z`), 16 (`x`) and 15 (`y`). That is how a special register — index
 * 32 and up — is named at all, and it is why `cmp pc, pc` assembles.
 *
 * Type F has no room for them: its `im16` occupies bits 25–10, which swallows all three. So a
 * type F instruction addresses only `r0`–`r31`.
 */
export const FIELD_U = {
  z: { low: 10, high: 17 },
  x: { low: 5, high: 16 },
  y: { low: 0, high: 15 },
} as const

/** Packs a 6-bit register index into a type U field: five contiguous bits plus a detached sixth. */
export function packU(field: keyof typeof FIELD_U, index: number): number {
  const { low, high } = FIELD_U[field]
  return (((index & 0x1f) << low) | (((index >>> 5) & 1) << high)) >>> 0
}

/** Reads a 6-bit register index back out of a type U field. */
export function unpackU(field: keyof typeof FIELD_U, word: number): number {
  const { low, high } = FIELD_U[field]
  return (((word >>> low) & 0x1f) | (((word >>> high) & 1) << 5)) >>> 0
}

/**
 * How far to shift a word to reach the byte at `address`. Byte 0 of a word is its **most
 * significant** — big-endian within the word — which `1_limits` pins: the word 0x41424300 yields
 * 0x41 at offset 0 and 0x43 at offset 2.
 *
 * Stated once here because the assembler packs strings by it, the machine reads and writes bytes
 * by it, and a memory dump displays by it. Three copies of `8 * (3 - (address & 3))` would be
 * three chances to disagree.
 */
export function byteShift(address: number): number {
  return 8 * (3 - (address & 3))
}

/**
 * Resolves a register name to its index, or `null` if it names nothing. Accepts `r0`–`r31` and
 * the special registers by name, which is how they are written in the reference sources.
 */
export function registerIndex(name: string): number | null {
  const normalised = name.trim().toLowerCase()

  const special = SPECIAL_REGISTERS.indexOf(normalised as (typeof SPECIAL_REGISTERS)[number])
  if (special !== -1) {
    return GENERAL_REGISTERS + special
  }

  const general = /^r(\d{1,2})$/.exec(normalised)
  if (!general) {
    return null
  }

  const index = Number(general[1])
  return index < GENERAL_REGISTERS ? index : null
}

/** The display name of a register index — `registerIndex`'s inverse, for panels and traces. */
export function registerName(index: number): string {
  if (index >= GENERAL_REGISTERS) {
    return SPECIAL_REGISTERS[index - GENERAL_REGISTERS] ?? `?${index}`
  }
  return `r${index}`
}

/** Resolves an alias to its canonical mnemonic, leaving canonical names untouched. */
export function canonicalMnemonic(mnemonic: string): string {
  const lowered = mnemonic.toLowerCase()
  return ALIASES[lowered] ?? lowered
}
