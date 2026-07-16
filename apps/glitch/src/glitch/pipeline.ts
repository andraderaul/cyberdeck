import {
  CHANNEL_OFFSET,
  type ChannelShiftParams,
  type GlitchSettings,
  type PixelBuffer,
} from './types'

/**
 * Effect: displaces one colour channel horizontally — the uniform "RGB split".
 * Pure: builds a new PixelBuffer, never touches the input. See ADR 0005.
 *
 * Sampling clamps at the edges rather than wrapping: a wrapped column drags the far
 * side's colour into frame, which reads as a bug instead of a glitch.
 */
export function channelShift(pixels: PixelBuffer, params: ChannelShiftParams): PixelBuffer {
  const { width, height, data } = pixels
  const out = new Uint8ClampedArray(data)
  const { amount } = params
  if (amount === 0) {
    return { data: out, width, height }
  }

  const offset = CHANNEL_OFFSET[params.channel]
  for (let y = 0; y < height; y++) {
    for (let x = 0; x < width; x++) {
      const sourceX = Math.min(Math.max(x - amount, 0), width - 1)
      out[(y * width + x) * 4 + offset] = data[(y * width + sourceX) * 4 + offset]
    }
  }

  return { data: out, width, height }
}

/**
 * The fixed, canonical Effect order applied to produce the output — pure in GlitchSettings.
 * v1 carries Channel Shift alone; the remaining Effects slot in around it in the order
 * documented in CONTEXT.md (structural before surface).
 */
export function applyPipeline(pixels: PixelBuffer, settings: GlitchSettings): PixelBuffer {
  return channelShift(pixels, settings.channelShift)
}
