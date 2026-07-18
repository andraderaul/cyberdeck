// Test-only. Reads fixtures through Node's fs rather than a Vite `?raw` import so the oracle
// programs never reach the app bundle — nothing outside a test has any use for them.

import { readFileSync } from 'node:fs'
import { dirname, join } from 'node:path'
import { fileURLToPath } from 'node:url'

const FIXTURE_DIR = dirname(fileURLToPath(import.meta.url))

/**
 * The five programs inherited from the reference material (`INHERITED`) and the ones generated
 * here to cover branches no reference program executes (`GENERATED`). The distinction matters:
 * only an inherited `.hex` is an independent oracle for the assembler — see PROVENANCE.md.
 */
export const INHERITED_PROGRAMS = [
  '1_fibonacci',
  '1_factorial',
  '1_recursive_factorial',
  '1_recursive_fibonacci',
  '1_limits',
] as const

// `bni` is absent: setting IV needs an invalid instruction, and that sends the reference emulator
// into a non-terminating loop rather than raising the flag. It stays hand-written, like `ble`.
export const GENERATED_PROGRAMS = ['2_blt', '2_bnz'] as const

export type FixtureName = (typeof INHERITED_PROGRAMS)[number] | (typeof GENERATED_PROGRAMS)[number]

/** A program in its three forms: source, assembled words, and reference execution trace. */
export interface Fixture {
  name: FixtureName
  /** Assembly source — the assembler's input. */
  source: string
  /** Assembled words, one `0x`-prefixed literal per line — the assembler's expected output. */
  hex: string
  /** Reference execution trace — the machine's expected output. */
  out: string
}

/**
 * Reads one fixture's three files. Throws if any is missing or empty, so a fixture that failed
 * to commit fails the suite loudly instead of silently comparing nothing against nothing.
 */
export function loadFixture(name: FixtureName): Fixture {
  return {
    name,
    source: readPart(name, 's'),
    hex: readPart(name, 'hex'),
    out: readPart(name, 'out'),
  }
}

function readPart(name: FixtureName, extension: 's' | 'hex' | 'out'): string {
  const path = join(FIXTURE_DIR, `${name}.${extension}`)

  let contents: string
  try {
    contents = readFileSync(path, 'utf8')
  } catch {
    throw new Error(`Missing fixture ${name}.${extension} at ${path}`)
  }

  if (contents.trim() === '') {
    throw new Error(`Fixture ${name}.${extension} is empty — it is not a usable oracle`)
  }

  return contents
}

/**
 * Parses a `.hex` fixture into words. Tolerates blank lines and trailing whitespace, which the
 * inherited files carry and which must not be normalised away on disk.
 */
export function parseHex(hex: string): number[] {
  return hex
    .split('\n')
    .map((line) => line.trim())
    .filter((line) => line !== '')
    .map((line, index) => {
      const word = Number.parseInt(line, 16)
      if (!Number.isInteger(word)) {
        throw new Error(`Malformed word at line ${index + 1} of a .hex fixture: ${line}`)
      }
      return word >>> 0
    })
}
