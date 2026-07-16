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

/** The flat object holding every Effect's params — the look, and nothing else. Carries no Seed. */
export interface GlitchSettings {
  channelShift: ChannelShiftParams
}
