import { describe, expect, it } from 'vitest'
import { applyChain, type Chain, createLink, type Link } from './chain'
import {
  blockDisplacement,
  channelShift,
  chromaticAberration,
  noise,
  pixelSort,
  scanlines,
} from './pipeline'
import { chainMatch, DEFAULT_PRESET, PRESETS, randomizeChain } from './presets'
import { structuredBuffer } from './test-pixels'
import {
  CHANNEL_SHIFT_AMOUNT_RANGE,
  type ChannelName,
  type NoiseTint,
  PIXEL_SORT_RUN_LENGTH_RANGE,
  type PixelBuffer,
  SCANLINES_DENSITY_STEP,
  type Seed,
  type SortDirection,
} from './types'

// 0.5 is the one draw that perturbs nothing: the spread is applied signed, around the base.
const NO_JITTER = 0.5

/**
 * Hands randomizeChain a pinned stream instead of real randomness: its first draw — the one that
 * picks the base Preset — lands on `index`, and every draw after it, one per jittered param, hands
 * back `draw`. So a whole look can be pulled to one extreme at once.
 */
function basedOn(index: number, draw: number) {
  let picked = false
  return () => {
    if (picked) {
      return draw
    }
    picked = true
    return index / PRESETS.length
  }
}

describe('PRESETS', () => {
  it('offers the six curated looks the front door is built on', () => {
    expect(PRESETS).toHaveLength(6)
  })

  it('gives every Preset its own id', () => {
    expect(new Set(PRESETS.map((p) => p.id)).size).toBe(PRESETS.length)
  })

  it('opens on a Preset that is one of the six', () => {
    expect(PRESETS).toContain(DEFAULT_PRESET)
  })

  it.each(PRESETS)('gives every Link in $name its own id', ({ chain }) => {
    // Ids key the rendered list, and a Chain may legally hold the same Effect twice — a collision
    // would make React reuse one row's state for the other.
    expect(new Set(chain.map((link) => link.id)).size).toBe(chain.length)
  })

  it('carries only the Links each look actually uses', () => {
    // The migration ADR 0017 asks for: off is the Link's absence, so the Effects a v1 Preset
    // switched off in its params are simply gone.
    const typesOf = (id: string) => PRESETS.find((p) => p.id === id)?.chain.map((link) => link.type)

    expect(typesOf('vhs')).not.toContain('pixelSort')
    expect(typesOf('signal-loss')).not.toContain('pixelSort')
    expect(typesOf('neon-rain')).not.toContain('scanlines')
    expect(typesOf('corrupted')).not.toContain('scanlines')
    expect(typesOf('vaporwave')).toContain('chromaticAberration')
    expect(
      PRESETS.filter((p) => p.chain.some((l) => l.type === 'chromaticAberration')),
    ).toHaveLength(1)
  })
})

describe('the migrated Presets preserve the v1 looks', () => {
  // The flat GlitchSettings each Preset carried before the Chain, verbatim. Frozen here as the
  // golden reference: it is the only remaining record of what these looks rendered, and the whole
  // point of the migration is that it did not move a pixel.
  interface LegacySettings {
    blockDisplacement: { density: number; amount: number }
    pixelSort: {
      enabled: boolean
      direction: SortDirection
      threshold: number
      runLength: number
    }
    channelShift: { channel: ChannelName; amount: number }
    chromaticAberration: { strength: number }
    scanlines: { enabled: boolean; density: number; intensity: number }
    noise: { amount: number; tint: NoiseTint }
  }

  const notched = (notches: number) => notches * SCANLINES_DENSITY_STEP

  const LEGACY: Record<string, LegacySettings> = {
    vaporwave: {
      blockDisplacement: { density: 0.1, amount: 0.2 },
      pixelSort: { enabled: true, direction: 'horizontal', threshold: 0.65, runLength: 70 },
      channelShift: { channel: 'b', amount: 14 },
      chromaticAberration: { strength: 0.3 },
      scanlines: { enabled: true, density: notched(4), intensity: 0.25 },
      noise: { amount: 0.08, tint: 'color' },
    },
    vhs: {
      blockDisplacement: { density: 0.15, amount: 0.3 },
      pixelSort: { enabled: false, direction: 'horizontal', threshold: 0.6, runLength: 40 },
      channelShift: { channel: 'r', amount: 6 },
      chromaticAberration: { strength: 0 },
      scanlines: { enabled: true, density: notched(9), intensity: 0.4 },
      noise: { amount: 0.18, tint: 'mono' },
    },
    'neon-rain': {
      blockDisplacement: { density: 0.05, amount: 0.4 },
      pixelSort: { enabled: true, direction: 'vertical', threshold: 0.25, runLength: 160 },
      channelShift: { channel: 'b', amount: -8 },
      chromaticAberration: { strength: 0 },
      scanlines: { enabled: false, density: notched(7), intensity: 0.3 },
      noise: { amount: 0.15, tint: 'color' },
    },
    corrupted: {
      blockDisplacement: { density: 0.7, amount: 0.65 },
      pixelSort: { enabled: true, direction: 'horizontal', threshold: 0.7, runLength: 25 },
      channelShift: { channel: 'g', amount: -10 },
      chromaticAberration: { strength: 0 },
      scanlines: { enabled: false, density: notched(7), intensity: 0.3 },
      noise: { amount: 0.12, tint: 'color' },
    },
    'signal-loss': {
      blockDisplacement: { density: 0.5, amount: 0.9 },
      pixelSort: { enabled: false, direction: 'horizontal', threshold: 0.5, runLength: 60 },
      channelShift: { channel: 'r', amount: 3 },
      chromaticAberration: { strength: 0 },
      scanlines: { enabled: true, density: notched(12), intensity: 0.5 },
      noise: { amount: 0.6, tint: 'mono' },
    },
    'kernel-panic': {
      blockDisplacement: { density: 0.85, amount: 0.75 },
      pixelSort: { enabled: true, direction: 'vertical', threshold: 0.35, runLength: 120 },
      channelShift: { channel: 'r', amount: -22 },
      chromaticAberration: { strength: 0 },
      scanlines: { enabled: true, density: notched(13), intensity: 0.25 },
      noise: { amount: 0.3, tint: 'color' },
    },
  }

  /**
   * The v1 renderer: the fixed order, the global Seed handed to both seeded Effects, and the two
   * ways v1 spelled "off" — the `enabled` flags and the encoded zero — applied as gates here since
   * the Effects themselves no longer carry them.
   */
  function legacyRender(pixels: PixelBuffer, s: LegacySettings, seed: Seed): PixelBuffer {
    let buffer = pixels
    if (s.blockDisplacement.density > 0 && s.blockDisplacement.amount > 0) {
      buffer = blockDisplacement(buffer, s.blockDisplacement, seed)
    }
    if (s.pixelSort.enabled) {
      buffer = pixelSort(buffer, s.pixelSort)
    }
    if (s.channelShift.amount !== 0) {
      buffer = channelShift(buffer, s.channelShift)
    }
    if (s.chromaticAberration.strength > 0) {
      buffer = chromaticAberration(buffer, s.chromaticAberration)
    }
    if (s.scanlines.enabled && s.scanlines.intensity > 0) {
      buffer = scanlines(buffer, s.scanlines)
    }
    if (s.noise.amount > 0) {
      buffer = noise(buffer, s.noise, seed)
    }
    return buffer
  }

  const SEED = 90210

  it.each(PRESETS)('renders $name exactly as its flat Preset did', ({ id, chain }) => {
    const pixels = structuredBuffer(40, 30)

    expect(Array.from(applyChain(pixels, chain, SEED).data)).toEqual(
      Array.from(legacyRender(pixels, LEGACY[id], SEED).data),
    )
  })
})

describe('chainMatch', () => {
  it.each(PRESETS)('matches $name against itself', ({ chain }) => {
    expect(chainMatch(chain, chain)).toBe(true)
  })

  it('ignores Link ids — a Preset stays matched the moment it is applied', () => {
    // Ids are plumbing, not the look (chain.ts). Comparing them would mark every Preset modified
    // as soon as state held a copy carrying freshly minted ids.
    const rebuilt: Chain = DEFAULT_PRESET.chain.map((link) =>
      createLink(link.type, link.params as never),
    )

    expect(rebuilt.map((l) => l.id)).not.toEqual(DEFAULT_PRESET.chain.map((l) => l.id))
    expect(chainMatch(rebuilt, DEFAULT_PRESET.chain)).toBe(true)
  })

  it('sees a different param as a different look', () => {
    const edited = DEFAULT_PRESET.chain.map((link) =>
      link.type === 'noise' ? { ...link, params: { ...link.params, amount: 0.99 } } : link,
    )

    expect(chainMatch(edited, DEFAULT_PRESET.chain)).toBe(false)
  })

  it('is order-sensitive — the same Links resequenced are a different look', () => {
    // Order *is* the look now, so a reorder has to mark the Preset modified exactly as an edit does.
    const [first, second, ...rest] = DEFAULT_PRESET.chain
    const reordered: Chain = [second, first, ...rest]

    expect(chainMatch(reordered, DEFAULT_PRESET.chain)).toBe(false)
  })

  it('sees a longer Chain as a different look', () => {
    const withExtra: Chain = [...DEFAULT_PRESET.chain, createLink('noise')]

    expect(chainMatch(withExtra, DEFAULT_PRESET.chain)).toBe(false)
  })

  it('sees a shorter Chain as a different look', () => {
    expect(chainMatch(DEFAULT_PRESET.chain.slice(0, -1), DEFAULT_PRESET.chain)).toBe(false)
  })

  it('sees a swapped Effect as a different look', () => {
    const swapped: Chain = [createLink('noise'), ...DEFAULT_PRESET.chain.slice(1)]

    expect(chainMatch(swapped, DEFAULT_PRESET.chain)).toBe(false)
  })

  // Exhaustive by design: the comparison is total, so every param of every Effect has to be able to
  // break a match. A param left out would silently keep a Preset highlighted after the user had
  // edited their way off it.
  it.each([
    ['blockDisplacement', 'density', 0.99],
    ['blockDisplacement', 'amount', 0.99],
    ['pixelSort', 'direction', 'vertical'],
    ['pixelSort', 'threshold', 0.99],
    ['pixelSort', 'runLength', 199],
    ['channelShift', 'channel', 'g'],
    ['channelShift', 'amount', 39],
    ['chromaticAberration', 'strength', 0.99],
    ['scanlines', 'density', 0.99],
    ['scanlines', 'intensity', 0.99],
    ['noise', 'amount', 0.99],
    ['noise', 'tint', 'mono'],
  ] as const)('notices a change to %s.%s', (type, key, value) => {
    const base = DEFAULT_PRESET.chain
    const edited = base.map((link) =>
      link.type === type ? ({ ...link, params: { ...link.params, [key]: value } } as Link) : link,
    )

    // Guards the fixture: VAPORWAVE has to actually carry this Effect, or the map is a no-op and
    // the assertion below would pass without comparing anything.
    expect(base.some((link) => link.type === type)).toBe(true)
    expect(chainMatch(edited, base)).toBe(false)
  })
})

describe('randomizeChain', () => {
  it('starts from a Preset — an unperturbing stream lands exactly on the base look', () => {
    expect(chainMatch(randomizeChain(basedOn(2, NO_JITTER)), PRESETS[2].chain)).toBe(true)
  })

  it.each(
    PRESETS.map((preset, index) => [preset.name, index] as const),
  )('can pick %s as its base', (_name, index) => {
    expect(chainMatch(randomizeChain(basedOn(index, NO_JITTER)), PRESETS[index].chain)).toBe(true)
  })

  // Math.random's own range is [0, 1) — but a source that hands back exactly 1 must not index off
  // the end and hand the app an undefined look.
  it('stays inside the Presets when the source draws its highest value', () => {
    const chain = randomizeChain(() => 1)

    expect(chain).toBeDefined()
    expect(chain.map((l) => l.type)).toEqual(PRESETS[PRESETS.length - 1].chain.map((l) => l.type))
  })

  it('perturbs the base look rather than returning it untouched', () => {
    expect(chainMatch(randomizeChain(basedOn(0, 0)), PRESETS[0].chain)).toBe(false)
  })

  // The rule ADR 0017 raises from "a Preset's choices ride through" to the structural level: bad
  // structure sinks a look faster than a bad number, so Randomize may move params and nothing else.
  // Nothing but this would catch a future reader teaching it to add or drop a Link.
  it.each([
    ['lowest', 0],
    ['unperturbing', NO_JITTER],
    ['highest', 1],
  ])('rides the base structure through untouched on the %s draw', (_label, draw) => {
    PRESETS.forEach((preset, index) => {
      const rolled = randomizeChain(basedOn(index, draw))

      expect(rolled).toHaveLength(preset.chain.length)
      expect(rolled.map((link) => link.type)).toEqual(preset.chain.map((link) => link.type))
    })
  })

  it('never invents a Link the base Preset did not carry', () => {
    // The concrete failure structural jitter would cause: a look assembled from Effects no curator
    // put together. VHS has no Pixel Sort and CORRUPTED no Scanlines — Randomize must not add them.
    for (const draw of [0, NO_JITTER, 1]) {
      const vhs = randomizeChain(basedOn(1, draw))
      const corrupted = randomizeChain(basedOn(3, draw))

      expect(vhs.some((link) => link.type === 'pixelSort')).toBe(false)
      expect(corrupted.some((link) => link.type === 'scanlines')).toBe(false)
    }
  })

  it('rides a Preset’s non-numeric choices through untouched', () => {
    // Which channel splits and which way the sort runs are choices, not magnitudes: flipping one
    // lands outside everything the base promised.
    for (const draw of [0, 1]) {
      PRESETS.forEach((preset, index) => {
        const rolled = randomizeChain(basedOn(index, draw))

        rolled.forEach((link, position) => {
          const base = preset.chain[position]
          if (link.type === 'channelShift' && base.type === 'channelShift') {
            expect(link.params.channel).toBe(base.params.channel)
          }
          if (link.type === 'pixelSort' && base.type === 'pixelSort') {
            expect(link.params.direction).toBe(base.params.direction)
          }
          if (link.type === 'noise' && base.type === 'noise') {
            expect(link.params.tint).toBe(base.params.tint)
          }
        })
      })
    }
  })

  // The whole point of preset + jitter: the sliders must reach the ugly extremes, Randomize must
  // never land there. Both extremes of every base are checked — a spread that clamped on one side
  // only would still hand out a look off the end of the other.
  describe.each([
    ['its lowest', 0],
    ['its highest', 1],
  ])('when the source draws %s value', (_label, draw) => {
    const looks = PRESETS.map((_, index) => randomizeChain(basedOn(index, draw)))

    it('keeps every unit-scale param on the 0..1 scale', () => {
      for (const chain of looks) {
        for (const link of chain) {
          const values =
            link.type === 'blockDisplacement'
              ? [link.params.density, link.params.amount]
              : link.type === 'pixelSort'
                ? [link.params.threshold]
                : link.type === 'chromaticAberration'
                  ? [link.params.strength]
                  : link.type === 'scanlines'
                    ? [link.params.density, link.params.intensity]
                    : link.type === 'noise'
                      ? [link.params.amount]
                      : []

          for (const value of values) {
            expect(value).toBeGreaterThanOrEqual(0)
            expect(value).toBeLessThanOrEqual(1)
          }
        }
      }
    })

    it('keeps Channel Shift within the amount its control offers', () => {
      for (const chain of looks) {
        for (const link of chain) {
          if (link.type === 'channelShift') {
            expect(link.params.amount).toBeGreaterThanOrEqual(CHANNEL_SHIFT_AMOUNT_RANGE.min)
            expect(link.params.amount).toBeLessThanOrEqual(CHANNEL_SHIFT_AMOUNT_RANGE.max)
          }
        }
      }
    })

    it('keeps Pixel Sort to a whole run length its control offers', () => {
      for (const chain of looks) {
        for (const link of chain) {
          if (link.type === 'pixelSort') {
            expect(Number.isInteger(link.params.runLength)).toBe(true)
            expect(link.params.runLength).toBeGreaterThanOrEqual(PIXEL_SORT_RUN_LENGTH_RANGE.min)
            expect(link.params.runLength).toBeLessThanOrEqual(PIXEL_SORT_RUN_LENGTH_RANGE.max)
          }
        }
      }
    })

    it('lands Scanlines density on a notch of its slider', () => {
      for (const chain of looks) {
        for (const link of chain) {
          if (link.type === 'scanlines') {
            const notches = link.params.density / SCANLINES_DENSITY_STEP
            expect(Math.abs(notches - Math.round(notches))).toBeLessThan(1e-9)
          }
        }
      }
    })
  })
})
