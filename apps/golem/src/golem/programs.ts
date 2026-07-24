// The reference programs, as Sources the editor can hold. GOLEM's equivalent of the deck's
// presets, expressed in the grammar this program chose (ADR 0018).
//
// These are the same files `__fixtures__/load.ts` reads, reached a different way on purpose: the
// fixture loader goes through Node's `fs` so oracle data stays out of the bundle, but a program
// the operator can *load* has to ship with the app. Only the `.s` sources are imported here —
// the `.hex` and `.out` oracles remain test-only.

import fpu from './__fixtures__/2_fpu.s?raw'
import helloWorld from './__fixtures__/2_hello_world.s?raw'
import interruption from './__fixtures__/2_interruption.s?raw'
import watchdog from './__fixtures__/2_watchdog.s?raw'
import memoryAccess from './__fixtures__/3_memory_access.s?raw'

export interface Program {
  name: string
  /** One line, lower case — this is what `load` with no argument lists. */
  summary: string
  source: string
}

/**
 * Named without the fixtures' `2_` prefix: the operator types `load watchdog`, and the unit a
 * program came from is provenance, not part of its name.
 */
export const PROGRAMS: readonly Program[] = [
  {
    name: 'hello_world',
    summary: 'writes a message to the Terminal, then reads its own output back',
    source: helloWorld,
  },
  {
    name: 'interruption',
    summary: 'ISRs, system calls, and faults travelling from instruction to handler',
    source: interruption,
  },
  {
    name: 'watchdog',
    summary: 'an infinite loop losing to a countdown',
    source: watchdog,
  },
  {
    name: 'fpu',
    summary: 'floating-point work that costs cycles and interrupts when it lands',
    source: fpu,
  },
  // The unit-3 showpiece: its label names what it demonstrates, so the cache demo is discoverable
  // and not just another program. `load memory_access`, `run` is the whole signature scene.
  {
    name: 'memory_access',
    summary: 'walks a 64-element array to stress the cache — watch it warm, hit, and evict',
    source: memoryAccess,
  },
]

export const PROGRAM_NAMES = PROGRAMS.map((program) => program.name)

/** The program by that exact name, or `null` — the caller decides what to suggest instead. */
export function programNamed(name: string): Program | null {
  return PROGRAMS.find((program) => program.name === name.trim().toLowerCase()) ?? null
}
