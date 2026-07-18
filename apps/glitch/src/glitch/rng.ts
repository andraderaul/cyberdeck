import type { Seed } from './types'

/** A stream of pseudo-random draws in 0..1, advancing on every call. */
export type Rng = () => number

const MULBERRY32_INCREMENT = 0x6d2b79f5

const UINT32_RANGE = 0x100000000

/**
 * A Seed's own stream of draws — mulberry32, small enough to read and strong enough that adjacent
 * Seeds open on unrelated draws, which is what keeps one Re-roll from arranging the blocks like the
 * last one. Hand-rolled rather than pulled in: the Pipeline needs a Seed-to-stream function it can
 * pin in a test, not a general-purpose PRNG.
 *
 * The Effects call this instead of `Math.random`, which is how the Pipeline keeps its promise that
 * all randomness derives from the Seed and none of it is hidden (ADR 0005).
 */
export function createRng(seed: Seed): Rng {
  let state = seed | 0
  return () => {
    // The shifts and multipliers here are mulberry32's own: the algorithm is a fixed recipe rather
    // than a set of tunables, and nudging one makes this a different, unvalidated generator.
    state = (state + MULBERRY32_INCREMENT) | 0
    let drawn = Math.imul(state ^ (state >>> 15), 1 | state)
    drawn = (drawn + Math.imul(drawn ^ (drawn >>> 7), 61 | drawn)) ^ drawn
    return ((drawn ^ (drawn >>> 14)) >>> 0) / UINT32_RANGE
  }
}

const HASH_MIX = 0x45d9f3b

/** Golden-ratio constant, so index 0 still displaces the Seed instead of hashing it toward itself. */
const HASH_DISPLACEMENT = 0x9e3779b9

/**
 * The Seed one Link in the Chain draws on — the global Seed mixed with the Link's own position
 * (ADR 0017). Two Links of the same type therefore get unrelated draws, which is what lets a Chain
 * carry the same Effect twice without the repeats collapsing into an identical arrangement.
 *
 * Derived from the *index* rather than drawn from a stream running along the Chain: a stream would
 * make every Link's arrangement depend on how many draws the Links before it happened to make, so
 * inserting or reordering one Link would scramble every Link downstream. ADR 0017 rejected that
 * explicitly, for the same reason Noise hashes a pixel's position instead of streaming.
 *
 * The accepted cost, recorded in the ADR: moving a Link to a new index gives it a new arrangement.
 * A reorder is already a deliberate edit to the look, so the reshuffle rides along with it.
 */
export function deriveSeed(seed: Seed, index: number): Seed {
  let hash = (seed ^ Math.imul(index + 1, HASH_DISPLACEMENT)) | 0
  hash = Math.imul(hash ^ (hash >>> 16), HASH_MIX)
  hash = Math.imul(hash ^ (hash >>> 13), HASH_MIX)
  return (hash ^ (hash >>> 16)) | 0
}

/**
 * Impure: draws a fresh Seed. The one place the app reaches for real randomness — every draw
 * downstream of it derives from the Seed it returns, so the Pipeline stays pure and a render can
 * always be reproduced from the Seed that produced it.
 */
export function createSeed(): Seed {
  return Math.floor(Math.random() * UINT32_RANGE) | 0
}
