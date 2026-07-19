import { describe, expect, it } from 'vitest'
import { createRng, createSeed, deriveSeed } from './rng'

/** The first `count` draws of a Seed's stream — the shape every determinism check compares on. */
function draws(seed: number, count: number): number[] {
  const rng = createRng(seed)
  return Array.from({ length: count }, () => rng())
}

describe('createRng', () => {
  it('draws the same stream for the same Seed', () => {
    expect(draws(42, 16)).toEqual(draws(42, 16))
  })

  it('draws a different stream for a different Seed', () => {
    expect(draws(42, 16)).not.toEqual(draws(43, 16))
  })

  it('keeps every draw in 0..1', () => {
    for (const value of draws(7, 256)) {
      expect(value).toBeGreaterThanOrEqual(0)
      expect(value).toBeLessThan(1)
    }
  })

  it('advances — a stream never repeats one value', () => {
    expect(new Set(draws(7, 64)).size).toBe(64)
  })

  it('gives adjacent Seeds unrelated streams', () => {
    // A weak PRNG seeded on a counter opens with near-identical draws, which would show up as
    // neighbouring Re-rolls arranging the blocks the same way.
    const [first] = draws(1, 1)
    const [second] = draws(2, 1)

    expect(Math.abs(first - second)).toBeGreaterThan(0.01)
  })

  it('spreads its draws across the range', () => {
    const quarters = new Set(draws(99, 200).map((value) => Math.floor(value * 4)))

    expect(quarters).toEqual(new Set([0, 1, 2, 3]))
  })

  it('holds no state between rngs — two rngs on one Seed draw alike', () => {
    const first = createRng(5)
    const second = createRng(5)
    first()

    expect(second()).toBe(createRng(5)())
  })
})

describe('deriveSeed', () => {
  const SEED = 4242

  it('gives every occurrence its own Seed', () => {
    const seeds = Array.from({ length: 12 }, (_, occurrence) => deriveSeed(SEED, occurrence))

    expect(new Set(seeds).size).toBe(seeds.length)
  })

  it('displaces the Seed even at occurrence 0', () => {
    // A first occurrence drawing the raw Seed is linkSeed's explicit branch (chain.ts), not a
    // property of this hash — pinning the displacement keeps that branch from looking removable.
    expect(deriveSeed(SEED, 0)).not.toBe(SEED)
  })

  it('is deterministic', () => {
    expect(deriveSeed(SEED, 3)).toBe(deriveSeed(SEED, 3))
  })

  it('sends two Seeds to unrelated places at the same occurrence', () => {
    expect(deriveSeed(SEED, 3)).not.toBe(deriveSeed(SEED + 1, 3))
  })
})

describe('createSeed', () => {
  it('draws a Seed the rng accepts', () => {
    const seed = createSeed()

    expect(Number.isInteger(seed)).toBe(true)
    expect(createRng(seed)()).toBeGreaterThanOrEqual(0)
  })

  it('draws a fresh Seed each call — the point of a Re-roll', () => {
    const seeds = new Set(Array.from({ length: 32 }, () => createSeed()))

    expect(seeds.size).toBe(32)
  })
})
