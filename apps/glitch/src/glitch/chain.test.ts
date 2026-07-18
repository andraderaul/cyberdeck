import { describe, expect, it } from 'vitest'
import {
  applyChain,
  applyPipeline,
  type Chain,
  chainFromSettings,
  EFFECT_REGISTRY,
  type EffectType,
} from './chain'
import {
  blockDisplacement,
  channelShift,
  chromaticAberration,
  noise,
  pixelSort,
  scanlines,
} from './pipeline'
import { DEFAULT_PRESET, PRESETS } from './presets'
import { deriveSeed } from './rng'
import type { BlockDisplacementParams, GlitchSettings, PixelBuffer, Seed } from './types'

/** An arbitrary fixed Seed — every test that isn't about the Seed itself rolls this one. */
const SEED = 4242

/**
 * A buffer with structure on both axes and no flat regions, so any Effect that moves or tints
 * pixels leaves a visible trace — a flat fill would hide a displacement entirely.
 *
 * Deliberately **not** a smooth ramp. Luminance has to rise and fall along a row or Pixel Sort finds
 * every run already ordered and quietly becomes the identity, which would let an order-sensitivity
 * test pass while proving nothing. The coprime strides keep it non-monotonic on both axes.
 */
function gradient(width: number, height: number): PixelBuffer {
  const data = new Uint8ClampedArray(width * height * 4)
  for (let y = 0; y < height; y++) {
    for (let x = 0; x < width; x++) {
      const offset = (y * width + x) * 4
      data[offset] = (x * 53) % 256
      data[offset + 1] = (y * 97) % 256
      data[offset + 2] = (x * 29 + y * 71) % 256
      data[offset + 3] = 255
    }
  }
  return { data, width, height }
}

function bytesOf(buffer: PixelBuffer): number[] {
  return Array.from(buffer.data)
}

const SORT: Chain[number] = {
  type: 'pixelSort',
  params: { enabled: true, direction: 'horizontal', threshold: 0.2, runLength: 8 },
}

const SHIFT: Chain[number] = { type: 'channelShift', params: { channel: 'r', amount: 5 } }

const BLOCKS: Chain[number] = {
  type: 'blockDisplacement',
  params: { density: 0.8, amount: 0.6 },
}

const GRAIN: Chain[number] = { type: 'noise', params: { amount: 0.4, tint: 'color' } }

describe('EFFECT_REGISTRY', () => {
  // The registry is the single source of the Effect set (ADR 0017) — the Slice 4 palette builds
  // itself from these keys, so a missing entry silently drops an Effect out of the editor.
  it.each([
    'blockDisplacement',
    'pixelSort',
    'channelShift',
    'chromaticAberration',
    'scanlines',
    'noise',
  ] satisfies EffectType[])('carries a definition for %s', (type) => {
    expect(EFFECT_REGISTRY[type].apply).toBeTypeOf('function')
    expect(EFFECT_REGISTRY[type].defaults).toBeDefined()
  })
})

describe('applyChain', () => {
  it('returns the input untouched for an empty Chain', () => {
    const pixels = gradient(16, 12)

    const out = applyChain(pixels, [], SEED)

    expect(bytesOf(out)).toEqual(bytesOf(pixels))
  })

  it('never mutates the input buffer', () => {
    const pixels = gradient(16, 12)
    const before = bytesOf(pixels)

    applyChain(pixels, [BLOCKS, SORT, GRAIN], SEED)

    expect(bytesOf(pixels)).toEqual(before)
  })

  it('is order-sensitive — the same Links in a different order render differently', () => {
    // The property that makes this a Chain rather than a set: the PixelBuffer flows through each
    // Link into the next, so sorting a shifted image is not the same as shifting a sorted one.
    const pixels = gradient(16, 12)

    const sortedFirst = applyChain(pixels, [SORT, SHIFT], SEED)
    const shiftedFirst = applyChain(pixels, [SHIFT, SORT], SEED)

    // Guards the fixture, not the fold: on a buffer whose rows are already ordered, Pixel Sort is
    // the identity and the two Chains agree for a reason that has nothing to do with order.
    expect(bytesOf(applyChain(pixels, [SORT], SEED))).not.toEqual(bytesOf(pixels))
    expect(bytesOf(sortedFirst)).not.toEqual(bytesOf(shiftedFirst))
  })

  it('gives two Links of the same type distinct randomness', () => {
    // The headline capability ADR 0017 exists for: the same Effect twice. Were both Links handed
    // the global Seed, the second would redraw the first's exact arrangement — the repeat would
    // collapse into a no-op and "two Pixel Sorts" would look like one.
    const pixels = gradient(24, 18)

    const twice = applyChain(pixels, [BLOCKS, BLOCKS], SEED)
    const once = applyChain(pixels, [BLOCKS], SEED)
    const onceThenAgain = applyChain(once, [BLOCKS], SEED)

    expect(bytesOf(twice)).not.toEqual(bytesOf(onceThenAgain))
  })

  it('reproduces its output exactly for a fixed Chain and Seed', () => {
    const pixels = gradient(16, 12)
    const chain: Chain = [BLOCKS, SORT, SHIFT, GRAIN]

    expect(bytesOf(applyChain(pixels, chain, SEED))).toEqual(
      bytesOf(applyChain(pixels, chain, SEED)),
    )
  })

  it('arranges the same Chain differently under a new Seed', () => {
    const pixels = gradient(16, 12)
    const chain: Chain = [BLOCKS, GRAIN]

    const first = applyChain(pixels, chain, SEED)
    const second = applyChain(pixels, chain, SEED + 1)

    expect(bytesOf(first)).not.toEqual(bytesOf(second))
  })

  it('keeps Noise positional within a Link — predecessors never shift its grain', () => {
    // Noise hashes a pixel's own position, not a running draw count, so what ran *before* it in the
    // Chain cannot move its grain. Both Chains put an identity Link at index 0 and Noise at index 1:
    // same index, same incoming pixels, therefore byte-identical grain. A Link that streamed its
    // randomness would fail this the moment the predecessor changed.
    const pixels = gradient(16, 12)
    const identityShift: Chain[number] = {
      type: 'channelShift',
      params: { channel: 'r', amount: 0 },
    }
    const identityFringe: Chain[number] = {
      type: 'chromaticAberration',
      params: { strength: 0 },
    }

    const afterShift = applyChain(pixels, [identityShift, GRAIN], SEED)
    const afterFringe = applyChain(pixels, [identityFringe, GRAIN], SEED)

    expect(bytesOf(afterShift)).toEqual(bytesOf(afterFringe))
  })

  it('keeps a Link’s arrangement when its index changes', () => {
    // The property the occurrence sub-seed buys (ADR 0017, amended in #125): position is not an
    // input, so putting a Link somewhere else leaves its draw alone. An index-keyed sub-seed would
    // fail this, and with it Slice 2's migration — dropping a Preset's off-Links shifts every later
    // Link's index and would silently re-roll the whole look.
    const pixels = gradient(24, 18)
    const identity: Chain[number] = { type: 'channelShift', params: { channel: 'r', amount: 0 } }

    const alone = applyChain(pixels, [BLOCKS], SEED)
    const behindAnIdentity = applyChain(pixels, [identity, BLOCKS], SEED)

    expect(bytesOf(alone)).toEqual(bytesOf(behindAnIdentity))
  })

  it('hands the first Link of a type the global Seed untouched', () => {
    // What makes a one-of-each Chain reproduce the fixed Pipeline exactly: every Link in it is the
    // first of its type, so every Link draws on the Seed the old Pipeline handed it.
    const pixels = gradient(24, 18)

    const throughTheChain = applyChain(pixels, [BLOCKS], SEED)
    const direct = blockDisplacement(pixels, BLOCKS.params as BlockDisplacementParams, SEED)

    expect(bytesOf(throughTheChain)).toEqual(bytesOf(direct))
  })
})

describe('chainFromSettings', () => {
  it('lays the six Effects out in the canonical order', () => {
    expect(chainFromSettings(DEFAULT_PRESET.settings).map((link) => link.type)).toEqual([
      'blockDisplacement',
      'pixelSort',
      'channelShift',
      'chromaticAberration',
      'scanlines',
      'noise',
    ])
  })

  it.each(PRESETS)('carries $name’s params through unchanged', ({ settings }) => {
    const chain = chainFromSettings(settings)

    expect(chain.map((link) => link.params)).toEqual([
      settings.blockDisplacement,
      settings.pixelSort,
      settings.channelShift,
      settings.chromaticAberration,
      settings.scanlines,
      settings.noise,
    ])
  })
})

describe('the Chain reproduces the fixed Pipeline', () => {
  /**
   * The Effect order as it stood before the Chain existed, with the global Seed handed to both
   * seeded Effects — a verbatim copy of the old `applyPipeline` body, kept here as the golden
   * reference #125 asks the Chain to match. It is deliberately *not* built from `chainFromSettings`:
   * a reference derived from the thing under test would pass no matter what either one did.
   */
  function legacyPipeline(pixels: PixelBuffer, settings: GlitchSettings, seed: Seed): PixelBuffer {
    const displaced = blockDisplacement(pixels, settings.blockDisplacement, seed)
    const sorted = pixelSort(displaced, settings.pixelSort)
    const shifted = channelShift(sorted, settings.channelShift)
    const fringed = chromaticAberration(shifted, settings.chromaticAberration)
    const rastered = scanlines(fringed, settings.scanlines)
    return noise(rastered, settings.noise, seed)
  }

  it.each(PRESETS)('renders $name byte-for-byte as the old Pipeline did', ({ settings }) => {
    const pixels = gradient(40, 30)

    expect(bytesOf(applyPipeline(pixels, settings, SEED))).toEqual(
      bytesOf(legacyPipeline(pixels, settings, SEED)),
    )
  })
})

describe('deriveSeed', () => {
  it('gives every index its own Seed', () => {
    const seeds = Array.from({ length: 12 }, (_, index) => deriveSeed(SEED, index))

    expect(new Set(seeds).size).toBe(seeds.length)
  })

  it('displaces the Seed even at index 0', () => {
    // Without the golden-ratio displacement the first Link would hash toward the global Seed, and
    // Link 0 would share an arrangement with an unchained call to the same Effect.
    expect(deriveSeed(SEED, 0)).not.toBe(SEED)
  })

  it('is deterministic', () => {
    expect(deriveSeed(SEED, 3)).toBe(deriveSeed(SEED, 3))
  })

  it('sends two Seeds to unrelated places at the same index', () => {
    expect(deriveSeed(SEED, 3)).not.toBe(deriveSeed(SEED + 1, 3))
  })
})
