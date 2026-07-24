import { describe, expect, it } from 'vitest'
import {
  type CacheFixture,
  loadCacheFixture,
  parseHex,
  UNIT_3_CACHE_PROGRAMS,
} from './__fixtures__/load'
import type { Image } from './assembler'
import { createMachine, step } from './machine'
import { formatTrace } from './trace'

// The unit-3 oracle seam: assemble (via the vendored `.hex`), run the cache-on Machine to the end,
// format the whole trace — cache event lines, per-access Set dumps, statistics footer — and diff
// it string-for-string against the `_cache.out`. One seam exercises the Machine, the cache layer
// and the formatter together, exactly as `machine.fixtures.test.ts` does for the register trace.

// The reference emitter ends without the trailing blank line the fixtures carry — the same
// divergence already documented for the unit-1/2 `.out` files. Compare with it normalised away.
function lines(trace: string): string[] {
  return trace.replace(/\n+$/, '').split('\n')
}

function runCacheOn(fixture: CacheFixture): string {
  const image: Image = { words: parseHex(fixture.hex), lineForWord: [] }
  let machine = createMachine(image, { cache: true })

  const steps: { before: typeof machine; after: typeof machine; events: readonly unknown[] }[] = []
  // A generous bound: the longest cache fixture is ~1200 steps. A runaway means a real bug, not a
  // slow program, so failing loudly beats hanging the suite.
  for (let guard = 0; guard < 100_000 && !machine.halted; guard++) {
    const before = machine
    const result = step(machine)
    steps.push({ before, after: result.machine, events: result.events })
    machine = result.machine
  }

  expect(machine.halted).toBe(true)
  return formatTrace(steps as Parameters<typeof formatTrace>[0])
}

describe.each(UNIT_3_CACHE_PROGRAMS)('$name', (entry) => {
  it('traces bit-for-bit against the unit-3 cache oracle', () => {
    const fixture = loadCacheFixture(entry)
    const actual = lines(runCacheOn(fixture))
    const expected = lines(fixture.out)

    // Report the first divergence with its line number — a raw diff of a 1000-line trace is
    // unreadable, and the first wrong line is almost always the whole story.
    const firstDiff = expected.findIndex((line, index) => line !== actual[index])
    if (firstDiff !== -1 || actual.length !== expected.length) {
      const at = firstDiff === -1 ? Math.min(actual.length, expected.length) : firstDiff
      expect({
        line: at + 1,
        actual: actual[at],
        expected: expected[at],
      }).toEqual({ line: at + 1, actual: expected[at], expected: expected[at] })
    }
    expect(actual).toEqual(expected)
  })
})
