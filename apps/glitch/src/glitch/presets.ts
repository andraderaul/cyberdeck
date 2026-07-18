import type { Rng } from './rng'
import {
  CHANNEL_SHIFT_AMOUNT_RANGE,
  type GlitchSettings,
  PIXEL_SORT_RUN_LENGTH_RANGE,
  SCANLINES_DENSITY_STEP,
  SPARSEST_SCANLINE_PERIOD,
  TIGHTEST_SCANLINE_PERIOD,
} from './types'

/** A named GlitchSettings snapshot — a curated look, carrying no Seed (see CONTEXT.md). */
export interface Preset {
  id: string
  name: string
  settings: GlitchSettings
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
 * look landed, and each one is a whole GlitchSettings rather than a diff from a default, so a
 * reader can see the entire look in one place and re-curate one Preset without moving the others.
 */
export const PRESETS: Preset[] = [
  {
    id: 'vaporwave',
    name: 'VAPORWAVE',
    // Every Effect on, none of them loud: the look that opens the app has to show a casual creator
    // what the whole Pipeline does while leaving their image plainly readable underneath.
    settings: {
      blockDisplacement: { density: 0.1, amount: 0.2 },
      pixelSort: { enabled: true, direction: 'horizontal', threshold: 0.65, runLength: 70 },
      channelShift: { channel: 'b', amount: 14 },
      // The only Preset that carries a fringe, and the reason it's this one: VAPORWAVE is
      // DEFAULT_PRESET, so a casual creator meets Chromatic Aberration on the first screen without
      // opening the advanced panel. Kept low enough that the corners bloom while the subject in the
      // middle stays sharp — past ~0.5 the fringe reads as a third RGB split rather than a lens.
      chromaticAberration: { strength: 0.3 },
      scanlines: { enabled: true, density: notchedDensity(4), intensity: 0.25 },
      noise: { amount: 0.08, tint: 'color' },
    },
  },
  {
    id: 'vhs',
    name: 'VHS',
    // No Pixel Sort: tape wobbles and bleeds, it doesn't melt — a smear here reads as a different
    // era of artefact and pulls the look away from the name.
    settings: {
      blockDisplacement: { density: 0.15, amount: 0.3 },
      pixelSort: { enabled: false, direction: 'horizontal', threshold: 0.6, runLength: 40 },
      channelShift: { channel: 'r', amount: 6 },
      chromaticAberration: { strength: 0 },
      scanlines: { enabled: true, density: notchedDensity(9), intensity: 0.4 },
      noise: { amount: 0.18, tint: 'mono' },
    },
  },
  {
    id: 'neon-rain',
    name: 'NEON RAIN',
    // A long vertical run at a low threshold is what drips: the sort catches most of the frame and
    // pulls it downward, so the tear is left near-off to keep the streaks unbroken.
    settings: {
      blockDisplacement: { density: 0.05, amount: 0.4 },
      pixelSort: { enabled: true, direction: 'vertical', threshold: 0.25, runLength: 160 },
      channelShift: { channel: 'b', amount: -8 },
      chromaticAberration: { strength: 0 },
      scanlines: { enabled: false, density: notchedDensity(7), intensity: 0.3 },
      noise: { amount: 0.15, tint: 'color' },
    },
  },
  {
    id: 'corrupted',
    name: 'CORRUPTED',
    // Scanlines off: a raster says "screen", and this look is meant to read as the data breaking
    // up rather than as a display failing to show it.
    settings: {
      blockDisplacement: { density: 0.7, amount: 0.65 },
      pixelSort: { enabled: true, direction: 'horizontal', threshold: 0.7, runLength: 25 },
      channelShift: { channel: 'g', amount: -10 },
      chromaticAberration: { strength: 0 },
      scanlines: { enabled: false, density: notchedDensity(7), intensity: 0.3 },
      noise: { amount: 0.12, tint: 'color' },
    },
  },
  {
    id: 'signal-loss',
    name: 'SIGNAL LOSS',
    // Heavy mono grain over a tight raster, and the tears travel their farthest — the picture is
    // losing to the static, which is the one look here where the image is meant to be half-gone.
    settings: {
      blockDisplacement: { density: 0.5, amount: 0.9 },
      pixelSort: { enabled: false, direction: 'horizontal', threshold: 0.5, runLength: 60 },
      channelShift: { channel: 'r', amount: 3 },
      chromaticAberration: { strength: 0 },
      scanlines: { enabled: true, density: notchedDensity(12), intensity: 0.5 },
      noise: { amount: 0.6, tint: 'mono' },
    },
  },
  {
    id: 'kernel-panic',
    name: 'KERNEL PANIC',
    // The loud end of the dial: every Effect pushed, and the one Preset that is allowed to cost the
    // image its legibility.
    settings: {
      blockDisplacement: { density: 0.85, amount: 0.75 },
      pixelSort: { enabled: true, direction: 'vertical', threshold: 0.35, runLength: 120 },
      channelShift: { channel: 'r', amount: -22 },
      chromaticAberration: { strength: 0 },
      scanlines: { enabled: true, density: notchedDensity(13), intensity: 0.25 },
      noise: { amount: 0.3, tint: 'color' },
    },
  },
]

/**
 * The look the app opens on. A casual creator has to see the point on the first screen, not a raw
 * image — and this is the Preset with every Effect on, so that first screen also shows the whole
 * Pipeline at once.
 */
export const DEFAULT_PRESET: Preset = PRESETS[0]

/**
 * Whether two looks are the same — a **total** comparison, every param of every Effect.
 *
 * Total precisely because the Seed lives beside GlitchSettings rather than inside it (types.ts):
 * there is no "except the seed" exclusion here for a later reader to innocently tidy away. That is
 * what lets Re-roll hand out a new arrangement with the active Preset still highlighted, while a
 * single slider edit marks it modified.
 */
export function glitchSettingsMatch(a: GlitchSettings, b: GlitchSettings): boolean {
  return (
    a.blockDisplacement.density === b.blockDisplacement.density &&
    a.blockDisplacement.amount === b.blockDisplacement.amount &&
    a.pixelSort.enabled === b.pixelSort.enabled &&
    a.pixelSort.direction === b.pixelSort.direction &&
    a.pixelSort.threshold === b.pixelSort.threshold &&
    a.pixelSort.runLength === b.pixelSort.runLength &&
    a.channelShift.channel === b.channelShift.channel &&
    a.channelShift.amount === b.channelShift.amount &&
    a.chromaticAberration.strength === b.chromaticAberration.strength &&
    a.scanlines.enabled === b.scanlines.enabled &&
    a.scanlines.density === b.scanlines.density &&
    a.scanlines.intensity === b.scanlines.intensity &&
    a.noise.amount === b.noise.amount &&
    a.noise.tint === b.noise.tint
  )
}

// How far Randomize may perturb each param off its base Preset. Curated well inside the sliders'
// ranges: a slider has to reach the ugly extremes, Randomize must never land on them.
const BLOCK_DENSITY_SPREAD = 0.12
const BLOCK_AMOUNT_SPREAD = 0.15
const SORT_THRESHOLD_SPREAD = 0.08
const SORT_RUN_LENGTH_SPREAD = 25
const CHANNEL_AMOUNT_SPREAD = 6
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
 * Discovers a fresh look: picks a Preset as a base and perturbs its params within curated ranges —
 * "preset + jitter" (CONTEXT.md). Starting from a known-good point is what guarantees the result is
 * always pretty; sampling each param independently would eventually deal out a combination nobody
 * ever vouched for.
 *
 * Only the numbers jitter. A Preset's choices — which channel splits, which way the sort runs,
 * whether an Effect is on at all — ride through untouched: flipping one isn't a perturbation of the
 * curated look, it's a jump to a look outside everything the base promised.
 *
 * Every jittered number is clamped back to the range its own control offers, so the "narrower than
 * the sliders, never the ugly extremes" promise is enforced here rather than left riding on the
 * curated values — a future curator can move a base without a jitter sailing off the end of a range.
 *
 * Pure: the randomness is injected, so a test can pin both the base and the perturbation (the same
 * reason `outputFilename` takes its timestamp). The app passes `Math.random`; the caller draws the
 * fresh Seed that goes with the look, since the look carries no arrangement.
 */
export function randomizeGlitchSettings(source: Rng): GlitchSettings {
  // Guards the top of the range: Math.random never returns 1, but an injected source may.
  const index = Math.min(Math.floor(source() * PRESETS.length), PRESETS.length - 1)
  const base = PRESETS[index].settings

  return {
    blockDisplacement: {
      density: jitterUnit(source, base.blockDisplacement.density, BLOCK_DENSITY_SPREAD),
      amount: jitterUnit(source, base.blockDisplacement.amount, BLOCK_AMOUNT_SPREAD),
    },
    pixelSort: {
      ...base.pixelSort,
      threshold: jitterUnit(source, base.pixelSort.threshold, SORT_THRESHOLD_SPREAD),
      runLength: clamp(
        Math.round(jitter(source, base.pixelSort.runLength, SORT_RUN_LENGTH_SPREAD)),
        PIXEL_SORT_RUN_LENGTH_RANGE.min,
        PIXEL_SORT_RUN_LENGTH_RANGE.max,
      ),
    },
    channelShift: {
      ...base.channelShift,
      amount: clamp(
        Math.round(jitter(source, base.channelShift.amount, CHANNEL_AMOUNT_SPREAD)),
        CHANNEL_SHIFT_AMOUNT_RANGE.min,
        CHANNEL_SHIFT_AMOUNT_RANGE.max,
      ),
    },
    // Copied through, never jittered — do not move this into the jitter set above. Chromatic
    // Aberration is curated *off* in five of the six Presets, so a symmetric jitter around zero
    // would clamp back up and switch a fringe on wherever the curator vouched it off. That deals a
    // combination nobody ever approved, which is exactly the promise "preset + jitter" exists to
    // keep. It rides through for the same reason a Preset's channel choice and on/off flags do.
    chromaticAberration: { ...base.chromaticAberration },
    scanlines: {
      ...base.scanlines,
      density: notchedDensity(
        clamp(
          Math.round(
            jitter(
              source,
              base.scanlines.density / SCANLINES_DENSITY_STEP,
              SCANLINE_DENSITY_SPREAD_NOTCHES,
            ),
          ),
          0,
          SCANLINE_NOTCH_COUNT,
        ),
      ),
      intensity: jitterUnit(source, base.scanlines.intensity, SCANLINE_INTENSITY_SPREAD),
    },
    noise: {
      ...base.noise,
      amount: jitterUnit(source, base.noise.amount, NOISE_AMOUNT_SPREAD),
    },
  }
}
