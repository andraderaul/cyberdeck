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

/** The flat object holding every Effect's params — the look, and nothing else. Carries no Seed. */
export interface GlitchSettings {
  pixelSort: PixelSortParams
  channelShift: ChannelShiftParams
}
