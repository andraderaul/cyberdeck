// Test-only fixture — imported by the glitch-core suites, never by the app.

import type { PixelBuffer } from './types'

/**
 * A buffer with structure on both axes and no flat regions, so any Effect that moves or tints
 * pixels leaves a visible trace — a flat fill would hide a displacement entirely.
 *
 * Deliberately **not** a smooth ramp. Luminance has to rise and fall along a row or Pixel Sort finds
 * every run already ordered and quietly becomes the identity, which would let an order-sensitivity
 * test pass while proving nothing. The coprime strides keep it non-monotonic on both axes.
 */
export function structuredBuffer(width: number, height: number): PixelBuffer {
  const data = new Uint8ClampedArray(width * height * 4)
  for (let y = 0; y < height; y++) {
    for (let x = 0; x < width; x++) {
      const offset = (y * width + x) * 4
      data[offset] = (x * 53) % 256
      data[offset + 1] = (y * 97) % 256
      data[offset + 2] = (x * 29 + y * 71) % 256
      data[offset + 3] = 255
    }
  }
  return { data, width, height }
}
