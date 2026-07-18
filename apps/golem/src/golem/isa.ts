// The encoding tables, shared by the assembler and the machine so an opcode is spelled once.
// docs/ISA.md is the source of truth for every value here.

/** Instruction shape — decides which operand fields an encoding carries. */
export type Form = 'U' | 'F' | 'S'

export interface Spec {
  opcode: number
  form: Form
}

/**
 * The narrow slice the tracer bullet supports: enough to add numbers and stop. #137 fills in the
 * remaining instructions against this same table.
 */
export const INSTRUCTIONS: Record<string, Spec> = {
  add: { opcode: 0x00, form: 'U' },
  addi: { opcode: 0x01, form: 'F' },
  int: { opcode: 0x3f, form: 'S' },
}

/** Readable mnemonics accepted anywhere the canonical one is (ISA.md, "Sintaxe do assembler"). */
export const ALIASES: Record<string, string> = {
  halt: 'int',
}

export const GENERAL_REGISTERS = 32

/** Special registers live at 32+ in the same 5-bit register fields. */
export const SPECIAL_REGISTERS = ['pc', 'ir', 'er', 'fr', 'cr', 'ipc'] as const

export const REGISTER_COUNT = GENERAL_REGISTERS + SPECIAL_REGISTERS.length

export const PC = 32
export const IR = 33
export const ER = 34
export const FR = 35
export const CR = 36
export const IPC = 37

/** Words of addressable memory. Must span the Terminal at byte `0x0000888B` (word 0x222A). */
export const MEMORY_WORDS = 0x4000

/** Terminal device, memory-mapped at a *byte* address — writing a byte emits a character. */
export const TERMINAL_ADDRESS = 0x0000888b

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
