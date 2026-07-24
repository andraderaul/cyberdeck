import { describe, expect, it } from 'vitest'
import {
  type CacheFixture,
  GENERATED_PROGRAMS,
  INHERITED_PROGRAMS,
  loadCacheFixture,
  loadFixture,
  parseHex,
  UNIT_2_PROGRAMS,
  UNIT_3_CACHE_PROGRAMS,
} from './__fixtures__/load'
import type { Image } from './assembler'
import { createMachine, step } from './machine'
import { formatCacheStatistics, formatTrace } from './trace'

// The unit-3 oracle seam: assemble (via the vendored `.hex`), run the cache-on Machine to the end,
// format the whole trace — cache event lines, per-access Set dumps, statistics footer — and diff
// it string-for-string against the `_cache.out`. One seam exercises the Machine, the cache layer
// and the formatter together, exactly as `machine.fixtures.test.ts` does for the register trace.

// The reference emitter ends without the trailing blank line the fixtures carry — the same
// divergence already documented for the unit-1/2 `.out` files. Compare with it normalised away.
function lines(trace: string): string[] {
  return trace.replace(/\n+$/, '').split('\n')
}

function runTrace(hex: string, cache: boolean): string {
  const image: Image = { words: parseHex(hex), lineForWord: [] }
  let machine = createMachine(image, { cache })

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

const runCacheOn = (fixture: CacheFixture): string => runTrace(fixture.hex, true)

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

// The two hand-written guards the fixture diff cannot pin on its own (in the spirit of v1's `ble`).

describe('statistics rounding', () => {
  // The reference formats percentages with `%.f` — round to nearest, ties to even. Math.round
  // would round .5 up and disagree on exactly these cases, so the boletim would drift a point.
  const stats = (hits: number, misses: number) =>
    formatCacheStatistics('D', { lines: [], hits, misses })

  it('reproduces the reference percentages from the fixtures', () => {
    // 3_memory_access's data cache: 158 hit / 34 miss of 192.
    expect(stats(158, 34)).toBe('[CACHE D STATISTICS] #Hit = 158 (82%), #Miss = 34 (18%)')
    // 3_memory_access's instruction cache: 513 hit / 4 miss of 517.
    expect(stats(513, 4)).toBe('[CACHE D STATISTICS] #Hit = 513 (99%), #Miss = 4 (1%)')
  })

  it('rounds a .5 to even, not up', () => {
    // 1/8 = 12.5% → 12 (even), not 13; 7/8 = 87.5% → 88 (even). Round-half-up would give 13/88.
    expect(stats(1, 7)).toBe('[CACHE D STATISTICS] #Hit = 1 (12%), #Miss = 7 (88%)')
    // 3/8 = 37.5% → 38 (even); 5/8 = 62.5% → 62 (even).
    expect(stats(3, 5)).toBe('[CACHE D STATISTICS] #Hit = 3 (38%), #Miss = 5 (62%)')
  })
})

const OFF_INVARIANT_PROGRAMS = [
  ...INHERITED_PROGRAMS,
  ...UNIT_2_PROGRAMS,
  ...GENERATED_PROGRAMS,
] as const

describe.each(OFF_INVARIANT_PROGRAMS)('cache-off %s', (name) => {
  it('traces byte-identical to the v1/v2 fixture — the toggle is additive, never retroactive', () => {
    const fixture = loadFixture(name)
    // With the mode off the Machine carries no cache, emits no cache events, and the formatter
    // appends no footer — so the whole trace must match the pre-v3 `.out` exactly.
    expect(lines(runTrace(fixture.hex, false))).toEqual(lines(fixture.out))
  })
})
