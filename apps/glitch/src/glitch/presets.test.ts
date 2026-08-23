import { describe, expect, it } from 'vitest'
import { applyChain, type Chain, createLink, type EffectType, type Link } from './chain'
import {
  blockDisplacement,
  channelShift,
  chromaticAberration,
  noise,
  pixelSort,
  scanlines,
} from './pipeline'
import {
  chainMatch,
  DEFAULT_PRESET,
  EFFECT_ORDER,
  PRESETS,
  presetById,
  randomizeChain,
} from './presets'
import { structuredBuffer } from './test-pixels'
import {
  CHANNEL_SHIFT_AMOUNT_RANGE,
  type ChannelName,
  HALFTONE_CELL_SIZE_RANGE,
  type NoiseTint,
  PIXEL_SORT_RUN_LENGTH_RANGE,
  type PixelBuffer,
  SCANLINES_DENSITY_STEP,
  type Seed,
  type SortDirection,
  WAVE_WAVELENGTH_RANGE,
} from './types'

// 0.5 is the one draw that perturbs nothing: the spread is applied signed, around the base.
const NO_JITTER = 0.5

/**
 * The wavelengths Randomize can actually hand out — DEGAUSS's 140 and CROSSTALK's 60, each
 * ±WAVE_WAVELENGTH_SPREAD — and the band every roll of both was rendered across for #320.
 *
 * The *driven* band rather than the band where a Wave stops being a bend: a wavelength short enough
 * to comb or long enough to read as a lean sits far outside anything the jitter can reach, so an
 * assertion drawn there passes on every possible output and pins nothing. This one fails the moment
 * a base moves far enough that a roll leaves the looks someone actually looked at.
 */
const DRIVEN_WAVELENGTH = { min: 40, max: 160 } as const

/**
 * The dot scales Randomize can hand out — PHOSPHOR and BILLBOARD both base at 0.75, each
 * ±HALFTONE_DOT_SCALE_SPREAD — and the band both were rendered across for #320, at both curated
 * cells. The driven band rather than the breaking point, for the reason DRIVEN_WAVELENGTH is.
 *
 * The breaking point is well clear of it: a dot covers ~85% of its cell at full luminance at 0.75
 * and ~95% at 0.85, and only near 0.95 does it read as solid ink with the grid inverted into dark
 * pinholes (presets.ts).
 */
const DRIVEN_DOT_SCALE = { min: 0.65, max: 0.85 } as const

/**
 * Hands randomizeChain a pinned stream instead of real randomness: its first draw — the one that
 * picks the base Preset — lands on the Preset with this `id`, and every draw after it, one per
 * jittered param, hands back `draw`. So a whole look can be pulled to one extreme at once.
 *
 * Named by id rather than by position on purpose. The roster is ordered gentlest first and a newly
 * curated look is inserted at the loudness it lands on, so every index moves the next time someone
 * curates — and a renumbered assertion still passes while testing a different look than it reads as.
 */
function basedOn(id: string, draw: number) {
  const index = PRESETS.indexOf(presetById(id))
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
  it('gives every Preset its own id', () => {
    expect(new Set(PRESETS.map((p) => p.id)).size).toBe(PRESETS.length)
  })

  it('gives every Preset its own name', () => {
    // The name is the whole chip: two looks sharing one would be indistinguishable at the front
    // door however different their Chains are.
    expect(new Set(PRESETS.map((p) => p.name)).size).toBe(PRESETS.length)
  })

  it('gives every Preset a Chain no other Preset matches', () => {
    // The id and the name only separate the *chips*. What separates the looks is `chainMatch`, and
    // it is what the picker highlights through: two Presets comparing equal would leave applying one
    // of them lighting the other's chip, with neither marked `(modified)` (#320, ADR 0017).
    for (const [index, one] of PRESETS.entries()) {
      for (const other of PRESETS.slice(index + 1)) {
        expect(
          chainMatch(one.chain, other.chain),
          `${one.name} and ${other.name} are the same look`,
        ).toBe(false)
      }
    }
  })

  it('opens on a Preset that is on the roster', () => {
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
    const typesOf = (id: string) => presetById(id).chain.map((link) => link.type)

    expect(typesOf('vhs')).not.toContain('pixelSort')
    expect(typesOf('signal-loss')).not.toContain('pixelSort')
    expect(typesOf('neon-rain')).not.toContain('scanlines')
    expect(typesOf('corrupted')).not.toContain('scanlines')
    expect(typesOf('vaporwave')).toContain('chromaticAberration')
    expect(typesOf('phosphor')).not.toContain('blockDisplacement')
    expect(typesOf('crosstalk')).not.toContain('scanlines')
  })

  it.each(PRESETS)('assembles $name in the canonical order', ({ chain }) => {
    // The order stopped being a law with ADR 0017, but the front door is where a user learns what
    // it is — a Preset that reads out of order teaches the wrong thing about the Chain it opens on.
    const ranks = chain.map((link) => EFFECT_ORDER.indexOf(link.type))

    // Non-decreasing rather than strictly increasing: a repeated Effect is legal in a Chain and the
    // editor offers it (ADR 0017), so a look that wanted two Waves would still be in canonical
    // order. Nothing on the roster repeats one today, and this is not the test that should stop it.
    expect(ranks).toEqual([...ranks].sort((a, b) => a - b))
  })

  it('exploits the Effects the six could not express', () => {
    // Neither Halftone nor Wave was reachable from the front door at all until a curated Chain
    // carried one: Randomize rides a base's structure through untouched, so a Preset is the only
    // thing that can put a new Effect in a casual creator's hands (#320, ADR 0017).
    const carriers = (type: EffectType) =>
      PRESETS.filter((p) => p.chain.some((link) => link.type === type))

    expect(carriers('halftone').map((p) => p.id)).toEqual(['phosphor', 'billboard'])
    expect(carriers('wave').map((p) => p.id)).toEqual(['degauss', 'crosstalk'])
  })

  it('gives every Effect at least one curated look to be met in', () => {
    // The failure this catches is an Effect that is registered, runnable and unreachable without
    // opening the EDIT tab — which is exactly the state Halftone and Wave shipped in.
    for (const type of EFFECT_ORDER) {
      expect(PRESETS.some((p) => p.chain.some((link) => link.type === type))).toBe(true)
    }
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

  // Only the six that were migrated — a look curated after the Chain landed has no flat Preset
  // behind it to preserve. Pinned to six so a renamed id drops out of LEGACY loudly rather than
  // quietly leaving a golden test running over five looks.
  const MIGRATED = PRESETS.filter((p) => p.id in LEGACY)

  it('still holds all six of the looks the Chain migrated', () => {
    expect(MIGRATED).toHaveLength(Object.keys(LEGACY).length)
    expect(MIGRATED).toHaveLength(6)
  })

  it('leaves Chromatic Aberration to the one migrated look that carried it', () => {
    // VAPORWAVE was the only v1 Preset with a non-zero strength, and the lens flavour is what
    // separates it from VHS. Scoped to the migrated six: this pins the migration, not a promise
    // that no future curation may reach for CA.
    expect(
      MIGRATED.filter((p) => p.chain.some((l) => l.type === 'chromaticAberration')).map(
        (p) => p.id,
      ),
    ).toEqual(['vaporwave'])
  })

  it.each(MIGRATED)('renders $name exactly as its flat Preset did', ({ id, chain }) => {
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
  //
  // Each row names the Preset it edits, because no single look carries all eight Effects any more —
  // and naming one is what lets the guard below check the fixture actually holds the Effect rather
  // than the edit quietly being a no-op.
  const PARAM_EDITS = [
    ['vaporwave', 'blockDisplacement', 'density', 0.99],
    ['vaporwave', 'blockDisplacement', 'amount', 0.99],
    ['vaporwave', 'pixelSort', 'direction', 'vertical'],
    ['vaporwave', 'pixelSort', 'threshold', 0.99],
    ['vaporwave', 'pixelSort', 'runLength', 199],
    ['degauss', 'wave', 'axis', 'vertical'],
    ['degauss', 'wave', 'amplitude', 0.99],
    ['degauss', 'wave', 'wavelength', 399],
    ['vaporwave', 'channelShift', 'channel', 'g'],
    ['vaporwave', 'channelShift', 'amount', 39],
    ['vaporwave', 'chromaticAberration', 'strength', 0.99],
    ['phosphor', 'halftone', 'cellSize', 23],
    ['phosphor', 'halftone', 'dotScale', 0.42],
    ['phosphor', 'halftone', 'tint', 'mono'],
    ['vaporwave', 'scanlines', 'density', 0.99],
    ['vaporwave', 'scanlines', 'intensity', 0.99],
    ['vaporwave', 'noise', 'amount', 0.99],
    ['vaporwave', 'noise', 'tint', 'mono'],
  ] as const

  it.each(PARAM_EDITS)('notices a change to %s’s %s.%s', (id, type, key, value) => {
    const base = presetById(id).chain
    const edited = base.map((link) =>
      link.type === type ? ({ ...link, params: { ...link.params, [key]: value } } as Link) : link,
    )

    // Guards the fixture: the named Preset has to actually carry this Effect, or the map is a no-op
    // and the assertion below would pass without comparing anything.
    expect(base.some((link) => link.type === type)).toBe(true)
    expect(chainMatch(edited, base)).toBe(false)
  })

  it('covers every Effect the registry offers', () => {
    // The exhaustive table above is only exhaustive if it reaches all eight — a newly registered
    // Effect would otherwise be added to the Chain and left uncompared, and the first Preset to
    // carry it would open already marked modified.
    expect(new Set(PARAM_EDITS.map(([, type]) => type))).toEqual(new Set(EFFECT_ORDER))
  })
})

describe('randomizeChain', () => {
  it('starts from a Preset — an unperturbing stream lands exactly on the base look', () => {
    expect(
      chainMatch(randomizeChain(basedOn('neon-rain', NO_JITTER)), presetById('neon-rain').chain),
    ).toBe(true)
  })

  it.each(
    PRESETS.map(({ name, id }) => [name, id] as const),
  )('can pick %s as its base', (_name, id) => {
    expect(chainMatch(randomizeChain(basedOn(id, NO_JITTER)), presetById(id).chain)).toBe(true)
  })

  // Math.random's own range is [0, 1) — but a source that hands back exactly 1 must not index off
  // the end and hand the app an undefined look. The last Preset by position is what "off the end"
  // means here, so this one reads the roster's tail deliberately rather than by an index.
  it('stays inside the Presets when the source draws its highest value', () => {
    const chain = randomizeChain(() => 1)
    const loudest = PRESETS[PRESETS.length - 1]

    expect(chain).toBeDefined()
    expect(chain.map((l) => l.type)).toEqual(loudest.chain.map((l) => l.type))
  })

  it('perturbs the base look rather than returning it untouched', () => {
    expect(chainMatch(randomizeChain(basedOn('vaporwave', 0)), presetById('vaporwave').chain)).toBe(
      false,
    )
  })

  // The rule ADR 0017 raises from "a Preset's choices ride through" to the structural level: bad
  // structure sinks a look faster than a bad number, so Randomize may move params and nothing else.
  // Nothing but this would catch a future reader teaching it to add or drop a Link.
  it.each([
    ['lowest', 0],
    ['unperturbing', NO_JITTER],
    ['highest', 1],
  ])('rides the base structure through untouched on the %s draw', (_label, draw) => {
    for (const base of PRESETS) {
      const rolled = randomizeChain(basedOn(base.id, draw))

      expect(rolled).toHaveLength(base.chain.length)
      expect(rolled.map((link) => link.type)).toEqual(base.chain.map((link) => link.type))
    }
  })

  it('never invents a Link the base Preset did not carry', () => {
    // The concrete failure structural jitter would cause: a look assembled from Effects no curator
    // put together. VHS has no Pixel Sort, CORRUPTED no Scanlines, and PHOSPHOR nothing structural
    // at all — Randomize must not add them.
    for (const draw of [0, NO_JITTER, 1]) {
      expect(randomizeChain(basedOn('vhs', draw)).some((link) => link.type === 'pixelSort')).toBe(
        false,
      )
      expect(
        randomizeChain(basedOn('corrupted', draw)).some((link) => link.type === 'scanlines'),
      ).toBe(false)
      expect(
        randomizeChain(basedOn('phosphor', draw)).some((link) => link.type === 'blockDisplacement'),
      ).toBe(false)
    }
  })

  it('rides a Preset’s non-numeric choices through untouched', () => {
    // Which channel splits, which way the sort runs, which axis the bend travels on and how a dot
    // is inked are choices, not magnitudes: flipping one lands outside everything the base
    // promised. Halftone's tint is the loudest of them — `mono` spends the Source's colour, so a
    // flipped tint would hand out a look in a palette the curator never vouched for.
    for (const draw of [0, 1]) {
      for (const curated of PRESETS) {
        const rolled = randomizeChain(basedOn(curated.id, draw))

        rolled.forEach((link, position) => {
          const base = curated.chain[position]
          if (link.type === 'channelShift' && base.type === 'channelShift') {
            expect(link.params.channel).toBe(base.params.channel)
          }
          if (link.type === 'pixelSort' && base.type === 'pixelSort') {
            expect(link.params.direction).toBe(base.params.direction)
          }
          if (link.type === 'noise' && base.type === 'noise') {
            expect(link.params.tint).toBe(base.params.tint)
          }
          if (link.type === 'wave' && base.type === 'wave') {
            expect(link.params.axis).toBe(base.params.axis)
          }
          if (link.type === 'halftone' && base.type === 'halftone') {
            expect(link.params.tint).toBe(base.params.tint)
          }
        })
      }
    }
  })

  // The whole point of preset + jitter: the sliders must reach the ugly extremes, Randomize must
  // never land there. Both extremes of every base are checked — a spread that clamped on one side
  // only would still hand out a look off the end of the other.
  describe.each([
    ['its lowest', 0],
    ['its highest', 1],
  ])('when the source draws %s value', (_label, draw) => {
    const looks = PRESETS.map((base) => randomizeChain(basedOn(base.id, draw)))

    it('keeps every unit-scale param on the 0..1 scale', () => {
      for (const chain of looks) {
        for (const link of chain) {
          const values =
            link.type === 'blockDisplacement'
              ? [link.params.density, link.params.amount]
              : link.type === 'pixelSort'
                ? [link.params.threshold]
                : link.type === 'wave'
                  ? [link.params.amplitude]
                  : link.type === 'chromaticAberration'
                    ? [link.params.strength]
                    : link.type === 'halftone'
                      ? [link.params.dotScale]
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

    it('keeps Halftone to a whole cell its control offers', () => {
      for (const chain of looks) {
        for (const link of chain) {
          if (link.type === 'halftone') {
            expect(Number.isInteger(link.params.cellSize)).toBe(true)
            expect(link.params.cellSize).toBeGreaterThanOrEqual(HALFTONE_CELL_SIZE_RANGE.min)
            expect(link.params.cellSize).toBeLessThanOrEqual(HALFTONE_CELL_SIZE_RANGE.max)
          }
        }
      }
    })

    it('keeps Wave to a whole wavelength its control offers', () => {
      for (const chain of looks) {
        for (const link of chain) {
          if (link.type === 'wave') {
            expect(Number.isInteger(link.params.wavelength)).toBe(true)
            expect(link.params.wavelength).toBeGreaterThanOrEqual(WAVE_WAVELENGTH_RANGE.min)
            expect(link.params.wavelength).toBeLessThanOrEqual(WAVE_WAVELENGTH_RANGE.max)
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

    // The looks that survive a roll are the point of the jitter spreads, not just the clamps: a
    // param pinned to the end of its own range on every draw means the base was curated too close
    // to that end for the look to stay itself (presets.ts).
    it('leaves every Wave a bend rather than a comb or a lean', () => {
      for (const chain of looks) {
        for (const link of chain) {
          if (link.type === 'wave') {
            expect(link.params.wavelength).toBeGreaterThanOrEqual(DRIVEN_WAVELENGTH.min)
            expect(link.params.wavelength).toBeLessThanOrEqual(DRIVEN_WAVELENGTH.max)
          }
        }
      }
    })

    it('leaves every Halftone a screen the Source can still be read through', () => {
      for (const chain of looks) {
        for (const link of chain) {
          if (link.type === 'halftone') {
            // The cell is the one bound here that is a property rather than a driven band: at the
            // range's floor a cell holds one dot decision and the screen collapses into a
            // posterize (types.ts), and a base curated near it would roll straight onto that.
            expect(link.params.cellSize).toBeGreaterThan(HALFTONE_CELL_SIZE_RANGE.min)
            expect(link.params.dotScale).toBeGreaterThanOrEqual(DRIVEN_DOT_SCALE.min)
            expect(link.params.dotScale).toBeLessThanOrEqual(DRIVEN_DOT_SCALE.max)
          }
        }
      }
    })
  })
})
