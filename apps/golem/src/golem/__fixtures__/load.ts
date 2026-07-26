// Test-only. Reads fixtures through Node's fs rather than a Vite `?raw` import so the oracle
// programs never reach the app bundle — nothing outside a test has any use for them.

import { readFileSync } from 'node:fs'
import { dirname, join } from 'node:path'
import { fileURLToPath } from 'node:url'

const FIXTURE_DIR = dirname(fileURLToPath(import.meta.url))

/**
 * The programs inherited from the reference material (`INHERITED`) and the ones generated
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

/**
 * Unit 2's four reference programs — interrupts, ISRs, watchdog, FPU and Terminal readback.
 * Inherited on the same statute as `INHERITED_PROGRAMS`; kept separate because each one goes
 * green on a different v2 slice, and a suite that ran them all from day one would be red by
 * design rather than by regression.
 */
export const UNIT_2_PROGRAMS = ['2_hello_world', '2_interruption', '2_watchdog', '2_fpu'] as const

// `bni` is absent: setting IV needs an invalid instruction, and that sends the reference emulator
// into a non-terminating loop rather than raising the flag. It stays hand-written, like `ble`.
export const GENERATED_PROGRAMS = ['gen_blt', 'gen_bnz'] as const

/**
 * Unit 3's cache oracle: the units 1 and 2 programs (and one new program written to stress the
 * hierarchy) re-executed through the cache lens, each annotating Hit/Miss per access. Only the
 * `.out` differs from the base program — the assembled `.hex` is the base's, so each entry names
 * the base whose words it runs. `3_memory_access` is the new unit-3 showpiece and its own base.
 *
 * Grown one slice at a time: a program joins the list on the ticket that turns it green, so the
 * suite is never red by design (the same discipline as `UNIT_2_PROGRAMS`).
 */
export const UNIT_3_CACHE_PROGRAMS = [
  { name: '3_factorial_cache', base: '1_factorial' },
  // The two writing programs: `3_memory_access` walks a 64-element array with `stw`/`ldw` (the
  // showpiece, D at 82% hit), `3_hello_world` writes the Terminal with `stb`.
  { name: '3_memory_access_cache', base: '3_memory_access' },
  { name: '3_hello_world_cache', base: '2_hello_world' },
  // The rest of the unit-1/2 programs re-run through the lens — LRU eviction (AGE into the
  // thousands), recursion's stack churn, and the device programs all classify unchanged.
  { name: '3_fibonacci_cache', base: '1_fibonacci' },
  { name: '3_recursive_factorial_cache', base: '1_recursive_factorial' },
  { name: '3_recursive_fibonacci_cache', base: '1_recursive_fibonacci' },
  { name: '3_limits_cache', base: '1_limits' },
  { name: '3_interruption_cache', base: '2_interruption' },
  { name: '3_watchdog_cache', base: '2_watchdog' },
  { name: '3_fpu_cache', base: '2_fpu' },
] as const

/** A cache fixture: the base program's assembled words, and the cache-on reference trace. */
export interface CacheFixture {
  name: string
  hex: string
  out: string
}

/** Reads a cache fixture — the base's `.hex` for input, the `_cache.out` for the expected trace. */
export function loadCacheFixture(entry: { name: string; base: string }): CacheFixture {
  return {
    name: entry.name,
    hex: readPart(entry.base, 'hex'),
    out: readPart(entry.name, 'out'),
  }
}

export type FixtureName =
  | (typeof INHERITED_PROGRAMS)[number]
  | (typeof UNIT_2_PROGRAMS)[number]
  | (typeof GENERATED_PROGRAMS)[number]

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

function readPart(name: string, extension: 's' | 'hex' | 'out'): string {
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
