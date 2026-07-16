import { describe, expect, it } from 'vitest'
import { applyPipeline, channelShift } from './pipeline'
import type { GlitchSettings, PixelBuffer } from './types'

/** Builds a PixelBuffer from per-pixel RGBA tuples laid out row-major. */
function buildPixels(width: number, height: number, pixels: number[][]): PixelBuffer {
  const data = new Uint8ClampedArray(width * height * 4)
  pixels.forEach(([r, g, b, a], i) => {
    data.set([r, g, b, a ?? 255], i * 4)
  })
  return { data, width, height }
}

function pixelAt(buffer: PixelBuffer, x: number, y: number): number[] {
  const i = (y * buffer.width + x) * 4
  return Array.from(buffer.data.slice(i, i + 4))
}

describe('channelShift', () => {
  it('offsets the configured channel by the configured amount', () => {
    // A single row: only the leftmost pixel carries red.
    const pixels = buildPixels(3, 1, [
      [255, 0, 0, 255],
      [0, 0, 0, 255],
      [0, 0, 0, 255],
    ])

    const shifted = channelShift(pixels, { channel: 'r', amount: 2 })

    expect(pixelAt(shifted, 2, 0)).toEqual([255, 0, 0, 255])
  })

  it('shifts left on a negative amount', () => {
    const pixels = buildPixels(3, 1, [
      [0, 0, 0, 255],
      [0, 0, 0, 255],
      [255, 0, 0, 255],
    ])

    const shifted = channelShift(pixels, { channel: 'r', amount: -2 })

    expect(pixelAt(shifted, 0, 0)).toEqual([255, 0, 0, 255])
  })

  it('leaves the other channels and alpha untouched', () => {
    const pixels = buildPixels(2, 1, [
      [255, 10, 20, 128],
      [0, 30, 40, 64],
    ])

    const shifted = channelShift(pixels, { channel: 'r', amount: 1 })

    expect(pixelAt(shifted, 0, 0)).toEqual([255, 10, 20, 128])
    expect(pixelAt(shifted, 1, 0)).toEqual([255, 30, 40, 64])
  })

  it('shifts the green channel when configured', () => {
    const pixels = buildPixels(2, 1, [
      [0, 255, 0, 255],
      [0, 0, 0, 255],
    ])

    const shifted = channelShift(pixels, { channel: 'g', amount: 1 })

    expect(pixelAt(shifted, 1, 0)).toEqual([0, 255, 0, 255])
  })

  it('clamps to the edge pixel rather than wrapping around', () => {
    const pixels = buildPixels(3, 1, [
      [10, 0, 0, 255],
      [20, 0, 0, 255],
      [30, 0, 0, 255],
    ])

    const shifted = channelShift(pixels, { channel: 'r', amount: 1 })

    // x=0 has no source to its left — it holds the leftmost red, not the wrapped-around 30.
    expect(pixelAt(shifted, 0, 0)).toEqual([10, 0, 0, 255])
    expect(pixelAt(shifted, 1, 0)).toEqual([10, 0, 0, 255])
    expect(pixelAt(shifted, 2, 0)).toEqual([20, 0, 0, 255])
  })

  it('shifts each row independently — a shift never bleeds across rows', () => {
    const pixels = buildPixels(2, 2, [
      [10, 0, 0, 255],
      [20, 0, 0, 255],
      [30, 0, 0, 255],
      [40, 0, 0, 255],
    ])

    const shifted = channelShift(pixels, { channel: 'r', amount: 1 })

    expect(pixelAt(shifted, 0, 1)).toEqual([30, 0, 0, 255])
    expect(pixelAt(shifted, 1, 1)).toEqual([30, 0, 0, 255])
  })

  it('is pure — the input buffer is never mutated', () => {
    const pixels = buildPixels(2, 1, [
      [255, 0, 0, 255],
      [0, 0, 0, 255],
    ])
    const before = Array.from(pixels.data)

    channelShift(pixels, { channel: 'r', amount: 1 })

    expect(Array.from(pixels.data)).toEqual(before)
  })

  it('returns an equivalent buffer for a zero amount', () => {
    const pixels = buildPixels(2, 1, [
      [255, 0, 0, 255],
      [0, 128, 0, 255],
    ])

    const shifted = channelShift(pixels, { channel: 'r', amount: 0 })

    expect(Array.from(shifted.data)).toEqual(Array.from(pixels.data))
  })
})

describe('applyPipeline', () => {
  const settings: GlitchSettings = { channelShift: { channel: 'r', amount: 1 } }

  it('applies Channel Shift', () => {
    const pixels = buildPixels(2, 1, [
      [255, 0, 0, 255],
      [0, 0, 0, 255],
    ])

    const out = applyPipeline(pixels, settings)

    expect(pixelAt(out, 1, 0)).toEqual([255, 0, 0, 255])
  })

  it('is a pure function of GlitchSettings — same input, same output', () => {
    const pixels = buildPixels(3, 1, [
      [255, 10, 0, 255],
      [0, 20, 0, 255],
      [90, 30, 0, 255],
    ])

    const first = applyPipeline(pixels, settings)
    const second = applyPipeline(pixels, settings)

    expect(Array.from(first.data)).toEqual(Array.from(second.data))
  })

  it('preserves the buffer dimensions', () => {
    const pixels = buildPixels(
      3,
      2,
      Array.from({ length: 6 }, () => [0, 0, 0, 255]),
    )

    const out = applyPipeline(pixels, settings)

    expect(out.width).toBe(3)
    expect(out.height).toBe(2)
  })
})
