import { afterEach, describe, expect, it, vi } from 'vitest'
import { type ChunkType, isDatamoshSupported, moshPlan } from './mosh'

/** `n` chunks with a key every `every`-th — what the encoder is asked to produce during a take. */
function types(n: number, every: number): ChunkType[] {
  return Array.from({ length: n }, (_, i) => (i % every === 0 ? 'key' : 'delta'))
}

describe('moshPlan', () => {
  it('starts on a key chunk — the decoder rejects anything else after configure()', () => {
    const plan = moshPlan(['delta', 'delta', 'key', 'delta'])

    expect(plan[0]).toBe(2)
  })

  it('plans nothing when the take has no key chunk to start from', () => {
    expect(moshPlan(['delta', 'delta'])).toEqual([])
    expect(moshPlan([])).toEqual([])
  })

  // I-frame removal, and its limit: the decoder keeps painting the picture it already has while the
  // next moment's deltas land on it, which is the artifact — but reconstruction error only
  // accumulates, so with nothing let through a take of any length decays to noise and stays there.
  // The keys that survive are the reset, and the melt starts over from each one.
  it('drops every second key chunk and lets the other through', () => {
    const source = types(80, 15)
    const plan = moshPlan(source)
    const keys = source.flatMap((t, i) => (t === 'key' ? [i] : []))

    expect(keys).toEqual([0, 15, 30, 45, 60, 75])
    expect(plan).toEqual(expect.arrayContaining([0, 30, 60]))
    expect(plan).not.toContain(15)
    expect(plan).not.toContain(45)
    expect(plan).not.toContain(75)
  })

  it('keeps every delta chunk, in order', () => {
    const source = types(20, 15)
    const plan = moshPlan(source)
    const deltas = source.flatMap((t, i) => (t === 'delta' ? [i] : []))

    expect([...new Set(plan)].slice(1)).toEqual(deltas)
    expect(plan).not.toContain(15)
    expect(plan).toEqual([...plan].sort((a, b) => a - b))
  })

  // P-frame repetition: a delta fed twice applies the same motion to the picture its own motion
  // just made, which is the bloom half of the look.
  it('repeats every fourth surviving delta', () => {
    const plan = moshPlan(types(10, 15))

    // 1..3 once, 4 twice, 5..8 once, 8 twice
    expect(plan).toEqual([0, 1, 2, 3, 4, 4, 5, 6, 7, 8, 8, 9])
  })

  it('counts deltas across the key chunks it dropped, not from each one', () => {
    // Keys at 0 and 3 — the delta at index 5 is the fourth survivor, so it is the one repeated.
    const plan = moshPlan(['key', 'delta', 'delta', 'key', 'delta', 'delta', 'delta'])

    expect(plan).toEqual([0, 1, 2, 4, 5, 5, 6])
  })
})

describe('isDatamoshSupported', () => {
  afterEach(() => {
    vi.unstubAllGlobals()
  })

  it('is false without WebCodecs — ADR 0007: the control is then absent, not disabled', () => {
    vi.stubGlobal('VideoEncoder', undefined)
    vi.stubGlobal('VideoDecoder', undefined)
    vi.stubGlobal('VideoFrame', undefined)

    expect(isDatamoshSupported()).toBe(false)
  })

  it('needs the decoder too — encoding alone produces no picture to record', () => {
    vi.stubGlobal('VideoEncoder', class {})
    vi.stubGlobal('VideoFrame', class {})
    vi.stubGlobal('VideoDecoder', undefined)

    expect(isDatamoshSupported()).toBe(false)
  })

  it('is true where all three exist', () => {
    vi.stubGlobal('VideoEncoder', class {})
    vi.stubGlobal('VideoDecoder', class {})
    vi.stubGlobal('VideoFrame', class {})

    expect(isDatamoshSupported()).toBe(true)
  })
})
