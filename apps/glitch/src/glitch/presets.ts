import { type Chain, createLink, type EffectType, type Link } from './chain'
import type { Rng } from './rng'
import {
  CHANNEL_SHIFT_AMOUNT_RANGE,
  PIXEL_SORT_RUN_LENGTH_RANGE,
  SCANLINES_DENSITY_STEP,
  SPARSEST_SCANLINE_PERIOD,
  TIGHTEST_SCANLINE_PERIOD,
} from './types'

/** A named Chain — a curated look, carrying no Seed (see CONTEXT.md). */
export interface Preset {
  id: string
  name: string
  chain: Chain
}

/**
 * Scanlines' density expressed in notches of its slider, which is the only place the param can
 * actually land: the scale holds one notch per reachable pixel period (SCANLINES_DENSITY_STEP).
 * An off-notch density renders as the nearer period anyway, then jumps the first time the user
 * drags the slider and it snaps back onto the grid.
 */
function notchedDensity(notches: number): number {
  return notches * SCANLINES_DENSITY_STEP
}

/**
 * The six curated looks — the app's front door, and the base Randomize perturbs from. Ordered
 * gentlest first: the list reads as a dial from "still clearly the photo" to "barely survived".
 *
 * These numbers are taste, not derivation — they came from playing the sliders (#84) until each
 * look landed, and each one is a whole Chain rather than a diff from a default, so a reader can see
 * the entire look in one place and re-curate one Preset without moving the others.
 *
 * Each Chain lists **only the Links its look actually uses** — an Effect is on because it is here
 * (ADR 0017). Where v1 carried every Effect and switched the unwanted ones off in their params, the
 * migration dropped those Links outright: VHS and SIGNAL LOSS have no Pixel Sort, NEON RAIN and
 * CORRUPTED no Scanlines, and only VAPORWAVE carries Chromatic Aberration. The looks are unchanged —
 * `presets.test.ts` pins each one against the flat Preset it was migrated from, byte for byte.
 */
export const PRESETS: Preset[] = [
  {
    id: 'vaporwave',
    name: 'VAPORWAVE',
    // The one Chain that still holds every Effect, and the reason it opens the app: a casual creator
    // has to see what the whole Pipeline does while their image stays plainly readable underneath.
    chain: [
      createLink('blockDisplacement', { density: 0.1, amount: 0.2 }),
      createLink('pixelSort', { direction: 'horizontal', threshold: 0.65, runLength: 70 }),
      createLink('channelShift', { channel: 'b', amount: 14 }),
      createLink('chromaticAberration', { strength: 0.3 }),
      createLink('scanlines', { density: notchedDensity(4), intensity: 0.25 }),
      createLink('noise', { amount: 0.08, tint: 'color' }),
    ],
  },
  {
    id: 'vhs',
    name: 'VHS',
    // No Pixel Sort Link: tape wobbles and bleeds, it doesn't melt — a smear here reads as a
    // different era of artefact and pulls the look away from the name.
    chain: [
      createLink('blockDisplacement', { density: 0.15, amount: 0.3 }),
      createLink('channelShift', { channel: 'r', amount: 6 }),
      createLink('scanlines', { density: notchedDensity(9), intensity: 0.4 }),
      createLink('noise', { amount: 0.18, tint: 'mono' }),
    ],
  },
  {
    id: 'neon-rain',
    name: 'NEON RAIN',
    // A long vertical run at a low threshold is what drips: the sort catches most of the frame and
    // pulls it downward, so the tear is left near-off to keep the streaks unbroken.
    chain: [
      createLink('blockDisplacement', { density: 0.05, amount: 0.4 }),
      createLink('pixelSort', { direction: 'vertical', threshold: 0.25, runLength: 160 }),
      createLink('channelShift', { channel: 'b', amount: -8 }),
      createLink('noise', { amount: 0.15, tint: 'color' }),
    ],
  },
  {
    id: 'corrupted',
    name: 'CORRUPTED',
    // No Scanlines Link: a raster says "screen", and this look is meant to read as the data breaking
    // up rather than as a display failing to show it.
    chain: [
      createLink('blockDisplacement', { density: 0.7, amount: 0.65 }),
      createLink('pixelSort', { direction: 'horizontal', threshold: 0.7, runLength: 25 }),
      createLink('channelShift', { channel: 'g', amount: -10 }),
      createLink('noise', { amount: 0.12, tint: 'color' }),
    ],
  },
  {
    id: 'signal-loss',
    name: 'SIGNAL LOSS',
    // Heavy mono grain over a tight raster, and the tears travel their farthest — the picture is
    // losing to the static, which is the one look here where the image is meant to be half-gone.
    chain: [
      createLink('blockDisplacement', { density: 0.5, amount: 0.9 }),
      createLink('channelShift', { channel: 'r', amount: 3 }),
      createLink('scanlines', { density: notchedDensity(12), intensity: 0.5 }),
      createLink('noise', { amount: 0.6, tint: 'mono' }),
    ],
  },
  {
    id: 'kernel-panic',
    name: 'KERNEL PANIC',
    // The loud end of the dial: every Effect pushed, and the one Preset that is allowed to cost the
    // image its legibility.
    chain: [
      createLink('blockDisplacement', { density: 0.85, amount: 0.75 }),
      createLink('pixelSort', { direction: 'vertical', threshold: 0.35, runLength: 120 }),
      createLink('channelShift', { channel: 'r', amount: -22 }),
      createLink('scanlines', { density: notchedDensity(13), intensity: 0.25 }),
      createLink('noise', { amount: 0.3, tint: 'color' }),
    ],
  },
]

/**
 * The look the app opens on. A casual creator has to see the point on the first screen, not a raw
 * image — and this is the Preset carrying every Effect, so that first screen also shows the whole
 * Pipeline at once.
 */
export const DEFAULT_PRESET: Preset = PRESETS[0]

/** Whether two Links carry the same Effect with the same params — their ids are not part of it. */
function linkMatch(a: Link, b: Link): boolean {
  if (a.type !== b.type) {
    return false
  }
  const aParams = a.params as unknown as Record<string, unknown>
  const bParams = b.params as unknown as Record<string, unknown>
  const keys = Object.keys(aParams)
  return (
    keys.length === Object.keys(bParams).length &&
    keys.every((key) => aParams[key] === bParams[key])
  )
}

/**
 * Whether two looks are the same — a **total, order-sensitive** comparison: same length, same type
 * and same params at each position (ADR 0017).
 *
 * Order-sensitive because order *is* the look now: the same Links in a different sequence render
 * differently, so a reorder has to mark the active Preset modified exactly as a slider edit does.
 *
 * Total for the same reason its flat predecessor was: there is no "except the seed" exclusion here
 * for a later reader to innocently tidy away. That is what lets Re-roll hand out a new arrangement
 * with the active Preset still highlighted, while a single edit marks it modified.
 *
 * Params are compared by walking their keys rather than field by field. The flat version listed
 * every field explicitly so an omission couldn't hide, but that does not survive a Chain whose Links
 * are a union — the key walk is what keeps the comparison total across all six param shapes at once,
 * and a new Effect is covered the day it is registered.
 */
export function chainMatch(a: Chain, b: Chain): boolean {
  return a.length === b.length && a.every((link, index) => linkMatch(link, b[index]))
}

// How far Randomize may perturb each param off its base Preset. Curated well inside the sliders'
// ranges: a slider has to reach the ugly extremes, Randomize must never land on them.
const BLOCK_DENSITY_SPREAD = 0.12
const BLOCK_AMOUNT_SPREAD = 0.15
const SORT_THRESHOLD_SPREAD = 0.08
const SORT_RUN_LENGTH_SPREAD = 25
const CHANNEL_AMOUNT_SPREAD = 6
const CHROMATIC_STRENGTH_SPREAD = 0.1
const SCANLINE_DENSITY_SPREAD_NOTCHES = 2
const SCANLINE_INTENSITY_SPREAD = 0.08
const NOISE_AMOUNT_SPREAD = 0.06

// The unit scale every normalised param rides (types.ts).
const UNIT_MIN = 0
const UNIT_MAX = 1

const SCANLINE_NOTCH_COUNT = SPARSEST_SCANLINE_PERIOD - TIGHTEST_SCANLINE_PERIOD

function clamp(value: number, min: number, max: number): number {
  return Math.min(Math.max(value, min), max)
}

/** Perturbs `base` by up to `spread` in either direction. */
function jitter(source: Rng, base: number, spread: number): number {
  return base + (source() * 2 - 1) * spread
}

/** As `jitter`, held to the 0..1 scale a normalised param rides. */
function jitterUnit(source: Rng, base: number, spread: number): number {
  return clamp(jitter(source, base, spread), UNIT_MIN, UNIT_MAX)
}

/**
 * Perturbs one Link's numbers, leaving its Effect and its non-numeric choices alone.
 *
 * Every jittered number is clamped back to the range its own control offers, so the "narrower than
 * the sliders, never the ugly extremes" promise is enforced here rather than left riding on the
 * curated values — a future curator can move a base without a jitter sailing off the end of a range.
 */
function jitterLink(source: Rng, link: Link): Link {
  switch (link.type) {
    case 'blockDisplacement':
      return {
        ...link,
        params: {
          density: jitterUnit(source, link.params.density, BLOCK_DENSITY_SPREAD),
          amount: jitterUnit(source, link.params.amount, BLOCK_AMOUNT_SPREAD),
        },
      }
    case 'pixelSort':
      return {
        ...link,
        params: {
          ...link.params,
          threshold: jitterUnit(source, link.params.threshold, SORT_THRESHOLD_SPREAD),
          runLength: clamp(
            Math.round(jitter(source, link.params.runLength, SORT_RUN_LENGTH_SPREAD)),
            PIXEL_SORT_RUN_LENGTH_RANGE.min,
            PIXEL_SORT_RUN_LENGTH_RANGE.max,
          ),
        },
      }
    case 'channelShift':
      return {
        ...link,
        params: {
          ...link.params,
          amount: clamp(
            Math.round(jitter(source, link.params.amount, CHANNEL_AMOUNT_SPREAD)),
            CHANNEL_SHIFT_AMOUNT_RANGE.min,
            CHANNEL_SHIFT_AMOUNT_RANGE.max,
          ),
        },
      }
    case 'chromaticAberration':
      // Jittered freely now, where the flat model had to copy it through untouched. That guard
      // existed because CA was curated *off* as a zero in five Presets, and jittering a zero
      // upward would have switched the Effect on where nobody vouched for it. Off is the Link's
      // absence today, so a CA Link here is one a curator put there — perturbing it stays inside
      // what the base promised.
      return {
        ...link,
        params: {
          strength: jitterUnit(source, link.params.strength, CHROMATIC_STRENGTH_SPREAD),
        },
      }
    case 'scanlines':
      return {
        ...link,
        params: {
          density: notchedDensity(
            clamp(
              Math.round(
                jitter(
                  source,
                  link.params.density / SCANLINES_DENSITY_STEP,
                  SCANLINE_DENSITY_SPREAD_NOTCHES,
                ),
              ),
              0,
              SCANLINE_NOTCH_COUNT,
            ),
          ),
          intensity: jitterUnit(source, link.params.intensity, SCANLINE_INTENSITY_SPREAD),
        },
      }
    case 'noise':
      return {
        ...link,
        params: {
          ...link.params,
          amount: jitterUnit(source, link.params.amount, NOISE_AMOUNT_SPREAD),
        },
      }
  }
}

/**
 * Discovers a fresh look: picks a Preset as a base and perturbs the params of its Links within
 * curated ranges — "preset + jitter" (CONTEXT.md). Starting from a known-good point is what
 * guarantees the result is always pretty; sampling each param independently would eventually deal
 * out a combination nobody ever vouched for.
 *
 * Only the numbers jitter. **The Chain's structure rides through untouched** — which Links, how
 * many, in what order (ADR 0017). That is the same rule the flat model applied to a Preset's
 * choices, raised to the level where it now matters most: bad structure sinks a look faster than a
 * bad number, so structural variety is curated as more Presets rather than assembled at random.
 *
 * Pure: the randomness is injected, so a test can pin both the base and the perturbation (the same
 * reason `outputFilename` takes its timestamp). The app passes `Math.random`; the caller draws the
 * fresh Seed that goes with the look, since the look carries no arrangement.
 */
export function randomizeChain(source: Rng): Chain {
  // Guards the top of the range: Math.random never returns 1, but an injected source may.
  const index = Math.min(Math.floor(source() * PRESETS.length), PRESETS.length - 1)
  return PRESETS[index].chain.map((link) => jitterLink(source, link))
}

/** Every Effect a Link can be, in the canonical order the Presets and the palette read in. */
export const EFFECT_ORDER: readonly EffectType[] = [
  'blockDisplacement',
  'pixelSort',
  'channelShift',
  'chromaticAberration',
  'scanlines',
  'noise',
]
