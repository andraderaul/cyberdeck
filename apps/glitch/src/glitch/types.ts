/** The grid of pixels flowing through the Chain — the pure core's currency, deliberately DOM-free. */
export interface PixelBuffer {
  // Pinned to ArrayBuffer, not the default ArrayBufferLike: the ImageData constructor the shell
  // wraps this back into rejects a SharedArrayBuffer-backed array.
  data: Uint8ClampedArray<ArrayBuffer>
  width: number
  height: number
}

/**
 * Seeds every pseudo-random draw the Chain makes — the arrangement, one particular roll of a look.
 * Travels *beside* the Chain rather than inside it: that separation is what lets Re-roll change the
 * arrangement without touching the look, and a Preset carry a look with no arrangement.
 */
export type Seed = number

/** The colour channels Channel Shift can displace. Alpha is never shifted. */
export type ChannelName = 'r' | 'g' | 'b'

/** Byte offset of each channel within an RGBA pixel. */
export const CHANNEL_OFFSET: Record<ChannelName, number> = { r: 0, g: 1, b: 2 }

export interface ChannelShiftParams {
  channel: ChannelName
  /** Horizontal displacement in pixels; negative shifts left, positive right. */
  amount: number
}

/**
 * The displacement the control offers and Randomize must stay inside — a property of the Effect,
 * so it lives in the core beside the param it bounds rather than in the UI that happens to slide
 * it. Symmetric: a shift reads the same torn left as right.
 */
export const CHANNEL_SHIFT_AMOUNT_RANGE = { min: -40, max: 40 } as const

/**
 * The default Channel Shift look, and the value the slider resets to on double-click. Lives in the
 * core for the same reason as DEFAULT_PIXEL_SORT, and is frozen for the same reason.
 *
 * Visibly non-zero, like every other DEFAULT_* since Slice 2 (#126): presence in the Chain is now
 * the on/off, so a Link added from the palette has already been asked for. Seeding it with an
 * invisible zero would add a row to the editor that renders nothing and read as a broken control.
 */
export const DEFAULT_CHANNEL_SHIFT: ChannelShiftParams = Object.freeze({
  channel: 'r',
  amount: 12,
})

/** The axis Pixel Sort walks: rows left-to-right, or columns top-to-bottom. */
export type SortDirection = 'horizontal' | 'vertical'

export interface PixelSortParams {
  direction: SortDirection
  /**
   * Luminance floor on the normalised 0..1 scale the pure core computes brightness on. Contiguous
   * pixels at or above it form the threshold band that gets sorted; darker pixels break the run
   * and are left where they are.
   */
  threshold: number
  /** Longest run the sort will order at once; a longer band breaks into chunks of this size. */
  runLength: number
}

/**
 * The run lengths the control offers and Randomize must stay inside — a property of the Effect,
 * held in the core beside the param it bounds. Floored at 1 rather than 0: a run of 1 is already
 * sorted, so 0 would read as the Effect off (pipeline.ts).
 */
export const PIXEL_SORT_RUN_LENGTH_RANGE = { min: 1, max: 200 } as const

/**
 * The default Pixel Sort look, and the value the sliders reset to on double-click. Lives in the
 * core rather than beside the controls: it is a property of the Effect, not of the UI that
 * happens to edit it (ADR 0005).
 *
 * Distinct from a Preset, which is a whole curated look (`presets.ts`) — this is one Effect's
 * neutral starting point, and it is what a double-click resets to. Resetting to the active Preset's
 * value instead would leave a user who had wandered off every Preset with no way back to neutral.
 *
 * Frozen because a look can alias this object rather than copy it — an accidental downstream
 * mutation would rewrite the Effect's default for the whole app.
 */
export const DEFAULT_PIXEL_SORT: PixelSortParams = Object.freeze({
  direction: 'horizontal',
  threshold: 0.55,
  runLength: 60,
})

export interface ScanlinesParams {
  /**
   * How tight the raster is, on the normalised 0..1 scale: 0 is the sparsest, 1 the tightest.
   * Curated onto a pixel period inside the Effect rather than exposed as raw pixels, so the param
   * reads the way round the name promises — more density, more lines.
   */
  density: number
  /** How far the dark rows are dimmed: 0 leaves them untouched, 1 blacks them out. */
  intensity: number
}

/** Sparsest end of the density scale: past 16 the lines read as stray scratches, not a CRT. */
export const SPARSEST_SCANLINE_PERIOD = 16

/** Tightest end of the density scale: below 2 every row darkens, which reads as a flat dim. */
export const TIGHTEST_SCANLINE_PERIOD = 2

/**
 * The density scale holds one notch per reachable period, so every step of the slider moves the
 * raster. Density is continuous in the type but lands on a whole pixel period in practice — a
 * finer step would spend ~7 notches of slider travel repeating a period, leaving a control that
 * reports a changing percentage over an unchanging image.
 */
export const SCANLINES_DENSITY_STEP = 1 / (SPARSEST_SCANLINE_PERIOD - TIGHTEST_SCANLINE_PERIOD)

/**
 * The default Scanlines look, and the value the sliders reset to on double-click. Lives in the
 * core for the same reason as DEFAULT_PIXEL_SORT, and is frozen for the same reason.
 *
 * The density sits on a notch (7/14) — an off-notch default would be unreachable again once the
 * slider snapped away from it.
 */
export const DEFAULT_SCANLINES: ScanlinesParams = Object.freeze({
  density: 0.5,
  intensity: 0.35,
})

/**
 * How Noise tints its grain: `mono` draws one delta per pixel and moves every channel by it,
 * leaving hue alone; `color` draws per channel, pulling them apart into chroma static.
 */
export type NoiseTint = 'mono' | 'color'

export interface NoiseParams {
  /** How heavy the grain is, on the normalised 0..1 scale. */
  amount: number
  tint: NoiseTint
}

/**
 * The heaviest perturbation, in 0..255 channel steps, that amount 1 reaches. Curated below the
 * full 255: at that range nearly every grain clamps to black or white, and the Effect reads as
 * salt-and-pepper speckle instead of static lying over the image underneath.
 */
export const MAX_NOISE_DELTA = 128

/**
 * The default Noise look, and the value the slider resets to on double-click. Lives in the core
 * for the same reason as DEFAULT_PIXEL_SORT, and is frozen for the same reason.
 */
export const DEFAULT_NOISE: NoiseParams = Object.freeze({
  amount: 0.25,
  tint: 'mono',
})

export interface BlockDisplacementParams {
  /** How many blocks get carved out and displaced, on the normalised 0..1 scale. */
  density: number
  /** How far the blocks travel, on the normalised 0..1 scale. */
  amount: number
}

/**
 * The most blocks density 1 carves. Curated: past ~24 the displaced blocks overlap so heavily that
 * the image reads as horizontal static rather than as data breaking up, and the next block along
 * mostly re-cuts pixels the last one already moved.
 */
export const MAX_DISPLACEMENT_BLOCKS = 24

/**
 * The farthest a block travels at amount 1, as a fraction of the buffer width. Curated below the
 * full width: a block that lands most of a width from home stops reading as *that* block torn out
 * of place and starts reading as unrelated pixels dropped on top.
 */
export const MAX_BLOCK_SHIFT_RATIO = 0.35

/**
 * The tallest a block gets, as a fraction of the buffer height. A block spanning much more than a
 * sixth of the frame reads as the whole image sliding, not as a band of it corrupting.
 */
export const MAX_BLOCK_HEIGHT_RATIO = 0.16

/**
 * The narrowest a block gets, as a fraction of the buffer width. Floored well above zero: a block
 * only a few pixels wide is invisible at any shift, so the draws that produced it are spent on
 * nothing.
 */
export const MIN_BLOCK_WIDTH_RATIO = 0.25

/**
 * The default Block Displacement look, and the value the sliders reset to on double-click. Lives in
 * the core for the same reason as DEFAULT_PIXEL_SORT, and is frozen for the same reason.
 */
export const DEFAULT_BLOCK_DISPLACEMENT: BlockDisplacementParams = Object.freeze({
  density: 0.4,
  amount: 0.5,
})

export interface ChromaticAberrationParams {
  /** How far the channels pull apart at the frame's corners, on the normalised 0..1 scale. */
  strength: number
}

/**
 * The scale delta `k` between neighbouring channels at strength 1: R is sampled at `1 + k`, G at
 * `1`, B at `1 - k`. Lives in the core beside the param it bounds, for the same reason as
 * CHANNEL_SHIFT_AMOUNT_RANGE — the slider and the Effect share one source of truth.
 *
 * Curated small. Because the displacement this produces is a *fraction of the half-diagonal*, even
 * 0.05 pulls the corners of an 800×800 frame apart by ~27px, which is already past where the fringe
 * stops reading as a lens and starts reading as three offset copies of the image.
 */
export const MAX_CHROMATIC_ABERRATION_MAGNIFICATION = 0.05

/**
 * The default Chromatic Aberration look, and the value the slider resets to on double-click. Lives
 * in the core for the same reason as DEFAULT_PIXEL_SORT, and is frozen for the same reason.
 *
 * Was zero while the encode-zero idiom carried "off"; visible now that a Link's absence does
 * (#126) — see DEFAULT_CHANNEL_SHIFT for why every default has to render something.
 */
export const DEFAULT_CHROMATIC_ABERRATION: ChromaticAberrationParams = Object.freeze({
  strength: 0.3,
})

/**
 * How Halftone inks a dot: `color` gives the dot the cell's own average colour — the phosphor
 * matrix; `mono` inks every dot white, so a cell's tone survives *only* as the dot's area, which is
 * what a printed screen actually does.
 */
export type HalftoneTint = 'mono' | 'color'

export interface HalftoneParams {
  /** The side of one cell of the dot grid, in pixels — how coarsely the image is re-quantized. */
  cellSize: number
  /** How fat a dot grows at full luminance, on the normalised 0..1 scale; 0 is the Effect off. */
  dotScale: number
  tint: HalftoneTint
}

/**
 * The cells the control offers and Randomize must stay inside — a property of the Effect, held in
 * the core beside the param it bounds, the same as PIXEL_SORT_RUN_LENGTH_RANGE.
 *
 * Floored at 2: a 1px cell holds one pixel and so one dot decision, which stops reading as a screen
 * and collapses into a two-tone posterize. Capped at 24 because past there the sampling cap leaves
 * fewer than ~34 cells across the frame and the dots no longer resolve back into an image.
 */
export const HALFTONE_CELL_SIZE_RANGE = { min: 2, max: 24 } as const

/**
 * The dot radius `dotScale` 1 reaches at full luminance, as a fraction of the cell. Derived rather
 * than curated: it is half the cell's diagonal, exactly the radius at which a dot covers its own
 * cell entirely — so a white region reads as solid ink instead of as circles with the ground
 * showing through at the corners.
 */
export const HALFTONE_MAX_DOT_RADIUS_RATIO = Math.SQRT1_2

/**
 * The default Halftone look, and the value the sliders reset to on double-click. Lives in the core
 * for the same reason as DEFAULT_PIXEL_SORT, and is frozen for the same reason.
 *
 * Colour by default: the dots keep the Source recognisable under the screen, where mono hands back
 * tone alone and is the deliberate step further.
 *
 * The dot stops short of the top of its slider. A dot fat enough to fill its cell at full luminance
 * also fills it well before then, so the highlights flatten into solid ink and the brightest third
 * of the image loses its gradation; measured, the tone runs to the end of the ramp at 0.75.
 */
export const DEFAULT_HALFTONE: HalftoneParams = Object.freeze({
  cellSize: 6,
  dotScale: 0.75,
  tint: 'color',
})

/**
 * The axis Wave displaces along: `horizontal` slides whole rows sideways, `vertical` slides whole
 * columns up and down. Named for where the pixels travel, the same way Block Displacement and
 * Channel Shift are — the sine runs *across* that axis, so a horizontal Wave varies down the frame.
 */
export type WaveAxis = 'horizontal' | 'vertical'

export interface WaveParams {
  axis: WaveAxis
  /** How far a line travels at the crest, on the normalised 0..1 scale; 0 is the Effect off. */
  amplitude: number
  /** The span of one full cycle, in pixels — how tight the bend is. */
  wavelength: number
}

/**
 * The farthest a line travels at amplitude 1, as a fraction of the buffer's span along the axis it
 * moves on. Lives in the core beside the param it bounds, for the same reason as
 * MAX_CHROMATIC_ABERRATION_MAGNIFICATION.
 *
 * Curated well below the full span. Sampling clamps at the edges, so every pixel a crest pushes out
 * of frame is paid for with a band of the edge column smeared back in; past roughly an eighth of the
 * frame that smear is the loudest thing on screen and the bend it came from stops being what the
 * eye reads.
 */
export const MAX_WAVE_AMPLITUDE_RATIO = 0.12

/**
 * The cycles the control offers and Randomize must stay inside — a property of the Effect, held in
 * the core beside the param it bounds, the same as HALFTONE_CELL_SIZE_RANGE.
 *
 * Floored at 8: below that neighbouring lines sit near opposite crests and the image reads as combed
 * apart rather than bent. Capped at 400 because the sampling cap is 800px, so past there fewer than
 * two cycles cross the frame and a wave reads as a single lean.
 */
export const WAVE_WAVELENGTH_RANGE = { min: 8, max: 400 } as const

/**
 * The default Wave look, and the value the sliders reset to on double-click. Lives in the core for
 * the same reason as DEFAULT_PIXEL_SORT, and is frozen for the same reason.
 *
 * A wavelength well under the frame, so a fresh Link shows several cycles at once and reads as a
 * ripple: one long bend is hard to tell from the image simply hanging crooked.
 */
export const DEFAULT_WAVE: WaveParams = Object.freeze({
  axis: 'horizontal',
  amplitude: 0.4,
  wavelength: 64,
})
