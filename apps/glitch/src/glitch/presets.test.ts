import { describe, expect, it } from 'vitest'
import { DEFAULT_PRESET, glitchSettingsMatch, PRESETS, randomizeGlitchSettings } from './presets'
import type { GlitchSettings } from './types'
import {
  CHANNEL_SHIFT_AMOUNT_RANGE,
  PIXEL_SORT_RUN_LENGTH_RANGE,
  SCANLINES_DENSITY_STEP,
} from './types'

// 0.5 is the one draw that perturbs nothing: the spread is applied signed, around the base.
const NO_JITTER = 0.5

/**
 * Hands randomizeGlitchSettings a pinned stream instead of real randomness: its first draw — the one
 * that picks the base Preset — lands on `index`, and every draw after it, one per jittered param,
 * hands back `draw`. So a whole look can be pulled to one extreme at once.
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

function withPatch(patch: Partial<GlitchSettings>): GlitchSettings {
  return { ...DEFAULT_PRESET.settings, ...patch }
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
})

describe('glitchSettingsMatch', () => {
  it.each(PRESETS)('matches $name against itself', ({ settings }) => {
    expect(glitchSettingsMatch(settings, settings)).toBe(true)
  })

  it('matches two separately built copies of the same look', () => {
    expect(
      glitchSettingsMatch(structuredClone(DEFAULT_PRESET.settings), DEFAULT_PRESET.settings),
    ).toBe(true)
  })

  const base = DEFAULT_PRESET.settings

  // Exhaustive by design: the comparison is total — every param of every Effect. A param left out
  // would silently keep a Preset highlighted after the user had edited their way off it.
  it.each([
    [
      'blockDisplacement.density',
      withPatch({ blockDisplacement: { ...base.blockDisplacement, density: 0.99 } }),
    ],
    [
      'blockDisplacement.amount',
      withPatch({ blockDisplacement: { ...base.blockDisplacement, amount: 0.99 } }),
    ],
    [
      'pixelSort.enabled',
      withPatch({ pixelSort: { ...base.pixelSort, enabled: !base.pixelSort.enabled } }),
    ],
    [
      'pixelSort.direction',
      withPatch({
        pixelSort: {
          ...base.pixelSort,
          direction: base.pixelSort.direction === 'horizontal' ? 'vertical' : 'horizontal',
        },
      }),
    ],
    ['pixelSort.threshold', withPatch({ pixelSort: { ...base.pixelSort, threshold: 0.99 } })],
    ['pixelSort.runLength', withPatch({ pixelSort: { ...base.pixelSort, runLength: 199 } })],
    [
      'channelShift.channel',
      withPatch({
        channelShift: {
          ...base.channelShift,
          channel: base.channelShift.channel === 'g' ? 'b' : 'g',
        },
      }),
    ],
    ['channelShift.amount', withPatch({ channelShift: { ...base.channelShift, amount: 39 } })],
    ['chromaticAberration.strength', withPatch({ chromaticAberration: { strength: 0.99 } })],
    [
      'scanlines.enabled',
      withPatch({ scanlines: { ...base.scanlines, enabled: !base.scanlines.enabled } }),
    ],
    ['scanlines.density', withPatch({ scanlines: { ...base.scanlines, density: 0.99 } })],
    ['scanlines.intensity', withPatch({ scanlines: { ...base.scanlines, intensity: 0.99 } })],
    ['noise.amount', withPatch({ noise: { ...base.noise, amount: 0.99 } })],
    [
      'noise.tint',
      withPatch({ noise: { ...base.noise, tint: base.noise.tint === 'mono' ? 'color' : 'mono' } }),
    ],
  ])('sees a look that differs only in %s as a different look', (_param, other) => {
    expect(glitchSettingsMatch(base, other)).toBe(false)
  })
})

describe('randomizeGlitchSettings', () => {
  it('starts from a Preset — an unperturbing stream lands exactly on the base look', () => {
    const settings = randomizeGlitchSettings(basedOn(2, NO_JITTER))

    expect(glitchSettingsMatch(settings, PRESETS[2].settings)).toBe(true)
  })

  it.each(
    PRESETS.map((preset, index) => [preset.name, index] as const),
  )('can pick %s as its base', (_name, index) => {
    const settings = randomizeGlitchSettings(basedOn(index, NO_JITTER))

    expect(glitchSettingsMatch(settings, PRESETS[index].settings)).toBe(true)
  })

  // Math.random's own range is [0, 1) — but a source that hands back exactly 1 must not index off
  // the end and hand the app an undefined look.
  it('stays inside the Presets when the source draws its highest value', () => {
    const settings = randomizeGlitchSettings(() => 1)

    expect(settings).toBeDefined()
    expect(settings.noise.tint).toBe(PRESETS[PRESETS.length - 1].settings.noise.tint)
  })

  it('perturbs the base look rather than returning it untouched', () => {
    const settings = randomizeGlitchSettings(basedOn(0, 0))

    expect(glitchSettingsMatch(settings, PRESETS[0].settings)).toBe(false)
  })

  it('draws a different look from a different stream', () => {
    const low = randomizeGlitchSettings(basedOn(0, 0))
    const high = randomizeGlitchSettings(basedOn(0, 1))

    expect(glitchSettingsMatch(low, high)).toBe(false)
  })

  // Pins the ride-through. Chromatic Aberration is copied from the base and never jittered, and
  // nothing else in this file would catch a future reader tidying it into the jitter set — the same
  // class of lock as glitchSettingsMatch's exhaustive param list above.
  it.each([
    ['lowest', 0],
    ['unperturbing', NO_JITTER],
    ['highest', 1],
  ])('copies Chromatic Aberration through untouched on the %s draw', (_label, draw) => {
    PRESETS.forEach((preset, index) => {
      expect(randomizeGlitchSettings(basedOn(index, draw)).chromaticAberration.strength).toBe(
        preset.settings.chromaticAberration.strength,
      )
    })
  })

  it('never hands a fringe to a Preset curated without one', () => {
    // The concrete failure a symmetric jitter around zero would cause: it clamps back up, switching
    // Chromatic Aberration on for the five Presets whose curator deliberately left it off.
    const unfringed = PRESETS.map((_preset, index) => index).filter(
      (index) => PRESETS[index].settings.chromaticAberration.strength === 0,
    )

    expect(unfringed.length).toBeGreaterThan(0)
    unfringed.forEach((index) => {
      expect(randomizeGlitchSettings(basedOn(index, 1)).chromaticAberration.strength).toBe(0)
    })
  })

  // The whole point of preset + jitter: the sliders must reach the ugly extremes, Randomize must
  // never land there. Both extremes of every base are checked — a spread that clamped on one side
  // only would still hand out a look off the end of the other.
  describe.each([
    ['its lowest', 0],
    ['its highest', 1],
  ])('when the source draws %s value', (_label, draw) => {
    const looks = PRESETS.map((_, index) => randomizeGlitchSettings(basedOn(index, draw)))

    it('keeps every unit-scale param on the 0..1 scale', () => {
      for (const { blockDisplacement, pixelSort, scanlines, noise } of looks) {
        for (const value of [
          blockDisplacement.density,
          blockDisplacement.amount,
          pixelSort.threshold,
          scanlines.density,
          scanlines.intensity,
          noise.amount,
        ]) {
          expect(value).toBeGreaterThanOrEqual(0)
          expect(value).toBeLessThanOrEqual(1)
        }
      }
    })

    it('keeps Channel Shift within the amount its control offers', () => {
      for (const { channelShift } of looks) {
        expect(channelShift.amount).toBeGreaterThanOrEqual(CHANNEL_SHIFT_AMOUNT_RANGE.min)
        expect(channelShift.amount).toBeLessThanOrEqual(CHANNEL_SHIFT_AMOUNT_RANGE.max)
        expect(Number.isInteger(channelShift.amount)).toBe(true)
      }
    })

    it('keeps Pixel Sort to a whole run length its control offers', () => {
      for (const { pixelSort } of looks) {
        expect(pixelSort.runLength).toBeGreaterThanOrEqual(PIXEL_SORT_RUN_LENGTH_RANGE.min)
        expect(pixelSort.runLength).toBeLessThanOrEqual(PIXEL_SORT_RUN_LENGTH_RANGE.max)
        expect(Number.isInteger(pixelSort.runLength)).toBe(true)
      }
    })

    // A density between two notches renders identically to the nearer one but jumps the moment the
    // user next drags the slider, which snaps back onto the grid.
    it('lands Scanlines density on a notch of its slider', () => {
      for (const { scanlines } of looks) {
        const notch = scanlines.density / SCANLINES_DENSITY_STEP
        expect(notch).toBeCloseTo(Math.round(notch), 6)
      }
    })
  })

  // Perturbing a choice is not perturbing a look: flipping Pixel Sort off or swapping the shifted
  // channel lands somewhere the base Preset never vouched for, which is how "always pretty" breaks.
  it.each(
    PRESETS.map((preset, index) => [preset.name, index] as const),
  )('carries %s’s choices through untouched, jittering only its numbers', (_name, index) => {
    const { settings: base } = PRESETS[index]

    const look = randomizeGlitchSettings(basedOn(index, 0))

    expect(look.pixelSort.enabled).toBe(base.pixelSort.enabled)
    expect(look.pixelSort.direction).toBe(base.pixelSort.direction)
    expect(look.channelShift.channel).toBe(base.channelShift.channel)
    expect(look.scanlines.enabled).toBe(base.scanlines.enabled)
    expect(look.noise.tint).toBe(base.noise.tint)
  })
})
