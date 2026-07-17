/** The grid of pixels flowing through the Pipeline — the pure core's currency, deliberately DOM-free. */
export interface PixelBuffer {
  // Pinned to ArrayBuffer, not the default ArrayBufferLike: the ImageData constructor the shell
  // wraps this back into rejects a SharedArrayBuffer-backed array.
  data: Uint8ClampedArray<ArrayBuffer>
  width: number
  height: number
}

/** The colour channels Channel Shift can displace. Alpha is never shifted. */
export type ChannelName = 'r' | 'g' | 'b'

/** Byte offset of each channel within an RGBA pixel. */
export const CHANNEL_OFFSET: Record<ChannelName, number> = { r: 0, g: 1, b: 2 }

export interface ChannelShiftParams {
  channel: ChannelName
  /** Horizontal displacement in pixels; negative shifts left, positive right. */
  amount: number
}

/** The axis Pixel Sort walks: rows left-to-right, or columns top-to-bottom. */
export type SortDirection = 'horizontal' | 'vertical'

export interface PixelSortParams {
  /**
   * Pixel Sort has no param whose zero reads as "off" — a threshold of 0 sorts the whole line —
   * so the off state is explicit rather than encoded, as Channel Shift does with amount.
   */
  enabled: boolean
  direction: SortDirection
  /**
   * Luminance floor on the normalised 0..1 scale the Pipeline computes brightness on. Contiguous
   * pixels at or above it form the threshold band that gets sorted; darker pixels break the run
   * and are left where they are.
   */
  threshold: number
  /** Longest run the sort will order at once; a longer band breaks into chunks of this size. */
  runLength: number
}

/**
 * The default Pixel Sort look, and the value the sliders reset to on double-click. Lives in the
 * core rather than beside the controls: it is a property of the Effect, not of the UI that
 * happens to edit it (ADR 0005). Becomes a Preset's business once Presets land (#75).
 *
 * Frozen because every session's initial settings alias this one object — an accidental
 * downstream mutation would rewrite the default look for the whole app.
 */
export const DEFAULT_PIXEL_SORT: PixelSortParams = Object.freeze({
  enabled: true,
  direction: 'horizontal',
  threshold: 0.55,
  runLength: 60,
})

export interface ScanlinesParams {
  /**
   * Like Pixel Sort, Scanlines has no param whose zero reads as "off" — density 0 still rasters,
   * just sparsely — so the off state is explicit rather than encoded.
   */
  enabled: boolean
  /**
   * How tight the raster is, on the normalised 0..1 scale: 0 is the sparsest, 1 the tightest.
   * Curated onto a pixel period inside the Effect rather than exposed as raw pixels, so the param
   * reads the way round the name promises — more density, more lines.
   */
  density: number
  /** How far the dark rows are dimmed: 0 leaves them untouched, 1 blacks them out. */
  intensity: number
}

// The curated ends of the density scale. Below a period of 2 every row darkens, which reads as a
// flat dim rather than a raster; past 16 the lines read as stray scratches rather than a CRT.
export const SPARSEST_SCANLINE_PERIOD = 16
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
  enabled: true,
  density: 0.5,
  intensity: 0.35,
})

/** The flat object holding every Effect's params — the look, and nothing else. Carries no Seed. */
export interface GlitchSettings {
  pixelSort: PixelSortParams
  channelShift: ChannelShiftParams
  scanlines: ScanlinesParams
}
