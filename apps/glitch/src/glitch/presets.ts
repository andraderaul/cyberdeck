import { type Chain, createLink, type EffectParams, type EffectType, type Link } from './chain'
import type { Rng } from './rng'
import {
  CHANNEL_SHIFT_AMOUNT_RANGE,
  HALFTONE_CELL_SIZE_RANGE,
  PIXEL_SORT_RUN_LENGTH_RANGE,
  SCANLINES_DENSITY_STEP,
  SPARSEST_SCANLINE_PERIOD,
  TIGHTEST_SCANLINE_PERIOD,
  WAVE_WAVELENGTH_RANGE,
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
 * The curated looks — the app's front door, and the base Randomize perturbs from. Ordered
 * gentlest first: the list reads as a dial from "still clearly the photo" to "barely survived", so
 * a new look is inserted at the loudness it lands on rather than appended to the end.
 *
 * These numbers are taste, not derivation — they came from playing the sliders (#84) until each
 * look landed, and each one is a whole Chain rather than a diff from a default, so a reader can see
 * the entire look in one place and re-curate one Preset without moving the others.
 *
 * Each Chain lists **only the Links its look actually uses** — an Effect is on because it is here
 * (ADR 0017). Where v1 carried every Effect and switched the unwanted ones off in their params, the
 * migration dropped those Links outright: VHS and SIGNAL LOSS have no Pixel Sort, NEON RAIN and
 * CORRUPTED no Scanlines. The migrated looks are unchanged — `presets.test.ts` pins each of the six
 * against the flat Preset it came from, byte for byte.
 *
 * **This list is the only place structural variety comes from.** Randomize rides a base's structure
 * through untouched (ADR 0017), so which Links a look holds, how many and in what order is decided
 * here or nowhere — which is why PHOSPHOR, DEGAUSS, BILLBOARD and CROSSTALK were curated once
 * Halftone and Wave landed rather than left to be discovered: neither Effect was reachable from the
 * front door at all until a Chain here carried one.
 *
 * Every Chain is assembled in the canonical order (EFFECT_ORDER below). A curated look may legally
 * depart from it — the order stopped being a law with ADR 0017 — but the front door is where a user
 * learns what the order *is*, so a Preset that reorders has to be earning something the canonical
 * reading cannot give it, and none of these do.
 */
export const PRESETS: Preset[] = [
  {
    id: 'vaporwave',
    name: 'VAPORWAVE',
    // The widest Chain here and the reason it opens the app: a casual creator has to see several
    // Effects at once while their image stays plainly readable underneath. It held *every* Effect
    // until Halftone and Wave landed, and it is deliberately not chasing them — both re-draw the
    // whole frame, and the opening look has to leave the Source recognisable.
    //
    // The only Chain carrying Chromatic Aberration: the lens is what separates it from VHS, whose
    // artefacts are the tape's.
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
    id: 'degauss',
    name: 'DEGAUSS',
    // The wipe across a tube coming back to itself: the picture rolls through a long, slow bend
    // while the raster underneath stays perfectly straight. The order is what buys that — Wave
    // moves the image, Scanlines lands after and belongs to the screen rather than to the signal.
    //
    // A long wavelength on purpose: this is the one Wave look that is meant to read as the whole
    // frame breathing, so only a few cycles cross it.
    chain: [
      createLink('wave', { axis: 'horizontal', amplitude: 0.3, wavelength: 140 }),
      createLink('channelShift', { channel: 'b', amount: -6 }),
      createLink('scanlines', { density: notchedDensity(8), intensity: 0.4 }),
      createLink('noise', { amount: 0.14, tint: 'mono' }),
    ],
  },
  {
    id: 'phosphor',
    name: 'PHOSPHOR',
    // The tube's own dot triads: the picture re-quantized onto the shadow mask, then the raster
    // laid over it. Nothing structural at all — the first look here that moves no pixel out of
    // place, and the proof that Halftone can carry a Chain on its own.
    //
    // The Channel Shift is convergence error, not an RGB split: a few pixels, small enough that the
    // cells pick it up as fringing on the dots rather than as three offset pictures.
    chain: [
      createLink('channelShift', { channel: 'g', amount: 4 }),
      createLink('halftone', { cellSize: 6, dotScale: 0.75, tint: 'color' }),
      createLink('scanlines', { density: notchedDensity(10), intensity: 0.35 }),
      createLink('noise', { amount: 0.1, tint: 'mono' }),
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
    id: 'billboard',
    name: 'BILLBOARD',
    // The whole scene playing on something the size of a building: everything the tears and the
    // melt leave behind, re-quantized onto a grid coarse enough that a cell reads as a lamp rather
    // than as a pixel. The same Effect PHOSPHOR uses, at the other end of its cell — twice the
    // cell is the difference between a screen you look *through* and one you look *at*.
    //
    // `color` rather than `mono`, and the choice was made at the canvas: mono spends the cell's
    // colour and leaves the dot's area alone to carry tone, which is beautiful on a high-contrast
    // Source and a flat grey field on the evenly-lit photograph most people bring. Colour is what
    // keeps a shape readable through a cell this coarse. Mono stays one toggle away in EDIT.
    chain: [
      createLink('blockDisplacement', { density: 0.4, amount: 0.6 }),
      createLink('pixelSort', { direction: 'vertical', threshold: 0.55, runLength: 140 }),
      createLink('halftone', { cellSize: 12, dotScale: 0.75, tint: 'color' }),
      createLink('noise', { amount: 0.08, tint: 'mono' }),
    ],
  },
  {
    id: 'crosstalk',
    name: 'CROSSTALK',
    // Bending and breaking at once: the tears carve the frame up, then a tight vertical Wave rolls
    // the whole thing sideways so the torn edges ride the ripple instead of sitting flat. The
    // canonical order is doing the work — the bend lands after the discrete tears and carries them
    // along the curve, and the split rides on the already-bent picture.
    //
    // No raster: a screen would claim this is a display problem, and it is meant to read as two
    // signals in one wire.
    chain: [
      createLink('blockDisplacement', { density: 0.35, amount: 0.5 }),
      createLink('wave', { axis: 'vertical', amplitude: 0.45, wavelength: 60 }),
      createLink('channelShift', { channel: 'r', amount: 18 }),
      createLink('noise', { amount: 0.16, tint: 'color' }),
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
    // The loud end of the dial: every Link it carries pushed, and the one Preset that is allowed to
    // cost the image its legibility.
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
 * The Preset a caller names, or a hard failure. An id that is not on the roster is a bug in the
 * caller rather than a look to fall back from, and a silent `undefined` would surface as a blank
 * opening screen or as a test quietly asserting nothing.
 */
export function presetById(id: string): Preset {
  const found = PRESETS.find((preset) => preset.id === id)
  if (!found) {
    throw new Error(`no Preset with id "${id}"`)
  }
  return found
}

/**
 * The look the app opens on. A casual creator has to see the point on the first screen, not a raw
 * image — and VAPORWAVE is the widest Chain here that still leaves the Source plainly readable
 * underneath.
 *
 * Named rather than taken off the head of the roster. The list is ordered gentlest first, so
 * curating one gentler look would otherwise move the app's opening screen without anyone choosing
 * it — the same trap as any other positional read of `PRESETS`.
 */
export const DEFAULT_PRESET: Preset = presetById('vaporwave')

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
 * are a union — the key walk is what keeps the comparison total across every Effect's param shape at
 * once, and a new Effect is covered the day it is registered.
 */
export function chainMatch(a: Chain, b: Chain): boolean {
  return a.length === b.length && a.every((link, index) => linkMatch(link, b[index]))
}

/**
 * With the `*_SPREAD` consts below, how far Randomize may perturb each param off its base Preset.
 * Curated well inside the sliders' ranges: a slider has to reach the ugly extremes, Randomize must
 * never land on them.
 */
const BLOCK_DENSITY_SPREAD = 0.12
const BLOCK_AMOUNT_SPREAD = 0.15
const SORT_THRESHOLD_SPREAD = 0.08
const SORT_RUN_LENGTH_SPREAD = 25
const WAVE_AMPLITUDE_SPREAD = 0.1
const WAVE_WAVELENGTH_SPREAD = 20
const CHANNEL_AMOUNT_SPREAD = 6
const CHROMATIC_STRENGTH_SPREAD = 0.1
const HALFTONE_CELL_SIZE_SPREAD = 3
const HALFTONE_DOT_SCALE_SPREAD = 0.1
const SCANLINE_DENSITY_SPREAD_NOTCHES = 2
const SCANLINE_INTENSITY_SPREAD = 0.08
const NOISE_AMOUNT_SPREAD = 0.06

/** With `UNIT_MAX`, the unit scale every normalised param rides (types.ts). */
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
 * How Randomize perturbs each Effect's numbers — the same map-on-EffectType shape as
 * EFFECT_REGISTRY, so per-Effect jitter is looked up rather than switched on. It lives here rather
 * than in the registry because the spreads are curated taste, and taste stays in this file.
 *
 * Each entry draws once per jittered param, in declaration order — the pinned-stream tests in
 * `presets.test.ts` count on that order, one draw per param.
 */
const LINK_JITTERS: {
  [K in EffectType]: (source: Rng, params: EffectParams[K]) => EffectParams[K]
} = {
  blockDisplacement: (source, params) => ({
    density: jitterUnit(source, params.density, BLOCK_DENSITY_SPREAD),
    amount: jitterUnit(source, params.amount, BLOCK_AMOUNT_SPREAD),
  }),
  pixelSort: (source, params) => ({
    ...params,
    threshold: jitterUnit(source, params.threshold, SORT_THRESHOLD_SPREAD),
    runLength: clamp(
      Math.round(jitter(source, params.runLength, SORT_RUN_LENGTH_SPREAD)),
      PIXEL_SORT_RUN_LENGTH_RANGE.min,
      PIXEL_SORT_RUN_LENGTH_RANGE.max,
    ),
  }),
  // Both numbers move; the axis rides through, being a choice rather than a number. The wavelength
  // moves over a narrow slice of its range: it is what decides whether a look reads as a slow bend
  // or a tight ripple, so a wide jitter would swing it between two looks rather than around one.
  //
  // The spread is absolute where the param's effect is proportional, so it bites hardest at the
  // short end — a base curated much below CROSSTALK's 60 would halve its cycle count on one draw.
  // That constrains the curator rather than the spread: a base is picked far enough off
  // WAVE_WAVELENGTH_RANGE.min that every roll still reads as the look it started from.
  wave: (source, params) => ({
    ...params,
    amplitude: jitterUnit(source, params.amplitude, WAVE_AMPLITUDE_SPREAD),
    wavelength: clamp(
      Math.round(jitter(source, params.wavelength, WAVE_WAVELENGTH_SPREAD)),
      WAVE_WAVELENGTH_RANGE.min,
      WAVE_WAVELENGTH_RANGE.max,
    ),
  }),
  channelShift: (source, params) => ({
    ...params,
    amount: clamp(
      Math.round(jitter(source, params.amount, CHANNEL_AMOUNT_SPREAD)),
      CHANNEL_SHIFT_AMOUNT_RANGE.min,
      CHANNEL_SHIFT_AMOUNT_RANGE.max,
    ),
  }),
  // Jittered freely now, where the flat model had to copy it through untouched. That guard
  // existed because CA was curated *off* as a zero in five Presets, and jittering a zero
  // upward would have switched the Effect on where nobody vouched for it. Off is the Link's
  // absence today, so a CA Link here is one a curator put there — perturbing it stays inside
  // what the base promised.
  chromaticAberration: (source, params) => ({
    strength: jitterUnit(source, params.strength, CHROMATIC_STRENGTH_SPREAD),
  }),
  // The cell moves by a few pixels at most: it sets how much of the Source survives the screen, so
  // a wide jitter would swing a look between "the photo, dotted" and an unreadable grid. The tint
  // rides through, being a choice rather than a number — and the load-bearing one here, since
  // `mono` spends the Source's colour outright where `color` keeps it. Both curated Halftones are
  // `color` (PHOSPHOR, BILLBOARD) and no `mono` carrier ships, so a roll that flipped the tint would
  // be handing out a palette no curator ever vouched for. Mono stays one toggle away in EDIT.
  //
  // The dot's spread was re-driven for #320, on a photograph at both curated cells. Flattening is a
  // property of the very top of the dot's own scale, not of 0.75: a dot covers ~85% of its cell at
  // full luminance at 0.75, ~95% at 0.85 and ~99% at 0.95, and only that last one reads as solid
  // ink — the screen inverts and the grid survives as dark pinholes. 0.85, the top of every
  // reachable roll, still renders plainly as a screen, so the bases stay at 0.75 and the whole
  // spread renders as the look it started from.
  halftone: (source, params) => ({
    ...params,
    cellSize: clamp(
      Math.round(jitter(source, params.cellSize, HALFTONE_CELL_SIZE_SPREAD)),
      HALFTONE_CELL_SIZE_RANGE.min,
      HALFTONE_CELL_SIZE_RANGE.max,
    ),
    dotScale: jitterUnit(source, params.dotScale, HALFTONE_DOT_SCALE_SPREAD),
  }),
  scanlines: (source, params) => ({
    density: notchedDensity(
      clamp(
        Math.round(
          jitter(source, params.density / SCANLINES_DENSITY_STEP, SCANLINE_DENSITY_SPREAD_NOTCHES),
        ),
        0,
        SCANLINE_NOTCH_COUNT,
      ),
    ),
    intensity: jitterUnit(source, params.intensity, SCANLINE_INTENSITY_SPREAD),
  }),
  noise: (source, params) => ({
    ...params,
    amount: jitterUnit(source, params.amount, NOISE_AMOUNT_SPREAD),
  }),
}

/**
 * Perturbs one Link's numbers, leaving its Effect and its non-numeric choices alone.
 *
 * Every jittered number is clamped back to the range its own control offers, so the "narrower than
 * the sliders, never the ugly extremes" promise is enforced here rather than left riding on the
 * curated values — a future curator can move a base without a jitter sailing off the end of a range.
 *
 * The casts mirror `applyLink` (chain.ts): TypeScript checks `LINK_JITTERS[link.type]` and
 * `link.params` independently and can't see both came from the same `type`, though `Link`'s own
 * shape keeps the pair correlated in fact.
 */
function jitterLink(source: Rng, link: Link): Link {
  const jitterParams = LINK_JITTERS[link.type] as (
    source: Rng,
    params: Link['params'],
  ) => Link['params']
  return { ...link, params: jitterParams(source, link.params) } as Link
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

/**
 * Where each Effect sits in the canonical order — structural (they move pixels) before surface
 * (they lay texture over them), with Halftone on the seam between the two, being neither
 * (CONTEXT.md). The structural run itself reads discrete → whole-image → per-channel, which is the
 * slot Wave takes: first of the whole-image ones, after the discrete Effects so it carries what
 * they left behind along the bend rather than being flattened back onto the frame's grid by a sort
 * that runs after it, and ahead of the per-channel ones so their split rides on the bent picture.
 * Only the ranks' order carries meaning; the numbers themselves carry none.
 *
 * A Record over `EffectType` rather than a hand-kept list, so a newly registered Effect fails to
 * compile here instead of quietly missing from the add palette — the one failure that leaves an
 * Effect registered, runnable and unreachable.
 */
const EFFECT_RANK: Record<EffectType, number> = {
  blockDisplacement: 0,
  pixelSort: 1,
  wave: 2,
  channelShift: 3,
  chromaticAberration: 4,
  halftone: 5,
  scanlines: 6,
  noise: 7,
}

/** Every Effect a Link can be, in the canonical order the Presets and the palette read in. */
export const EFFECT_ORDER: readonly EffectType[] = (Object.keys(EFFECT_RANK) as EffectType[]).sort(
  (a, b) => EFFECT_RANK[a] - EFFECT_RANK[b],
)
