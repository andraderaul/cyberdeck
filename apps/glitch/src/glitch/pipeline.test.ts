import { describe, expect, it } from 'vitest'
import { applyPipeline, channelShift, pixelSort } from './pipeline'
import type { GlitchSettings, PixelBuffer, PixelSortParams } from './types'

/** Greys are the clearest Pixel Sort fixture: luminance tracks the channel value directly. */
function grey(value: number): number[] {
  return [value, value, value, 255]
}

const SORT_OFF: PixelSortParams = {
  enabled: false,
  direction: 'horizontal',
  threshold: 0,
  runLength: 64,
}

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

describe('pixelSort', () => {
  const params: PixelSortParams = { ...SORT_OFF, enabled: true }

  it('orders a run by luminance', () => {
    const pixels = buildPixels(3, 1, [grey(90), grey(10), grey(50)])

    const sorted = pixelSort(pixels, params)

    expect(pixelAt(sorted, 0, 0)).toEqual(grey(10))
    expect(pixelAt(sorted, 1, 0)).toEqual(grey(50))
    expect(pixelAt(sorted, 2, 0)).toEqual(grey(90))
  })

  it('moves each pixel whole — rgb and alpha travel together', () => {
    const pixels = buildPixels(2, 1, [
      [90, 90, 90, 10],
      [10, 10, 10, 20],
    ])

    const sorted = pixelSort(pixels, params)

    expect(pixelAt(sorted, 0, 0)).toEqual([10, 10, 10, 20])
    expect(pixelAt(sorted, 1, 0)).toEqual([90, 90, 90, 10])
  })

  it('sorts only within the threshold band — a darker pixel breaks the run', () => {
    const pixels = buildPixels(3, 1, [grey(200), grey(150), grey(30)])

    const sorted = pixelSort(pixels, { ...params, threshold: 0.5 })

    // 200 and 150 are in band and swap; 30 falls below it and stays put.
    expect(pixelAt(sorted, 0, 0)).toEqual(grey(150))
    expect(pixelAt(sorted, 1, 0)).toEqual(grey(200))
    expect(pixelAt(sorted, 2, 0)).toEqual(grey(30))
  })

  it('leaves an out-of-band run untouched when the threshold excludes it', () => {
    const pixels = buildPixels(2, 1, [grey(90), grey(10)])

    const sorted = pixelSort(pixels, { ...params, threshold: 1 })

    expect(Array.from(sorted.data)).toEqual(Array.from(pixels.data))
  })

  it('breaks a band longer than the run length into separately sorted chunks', () => {
    const pixels = buildPixels(4, 1, [grey(40), grey(30), grey(20), grey(10)])

    const sorted = pixelSort(pixels, { ...params, runLength: 2 })

    // Two chunks of 2, each ordered on its own — never the whole line.
    expect(pixelAt(sorted, 0, 0)).toEqual(grey(30))
    expect(pixelAt(sorted, 1, 0)).toEqual(grey(40))
    expect(pixelAt(sorted, 2, 0)).toEqual(grey(10))
    expect(pixelAt(sorted, 3, 0)).toEqual(grey(20))
  })

  it('sorts down columns when the direction is vertical', () => {
    const pixels = buildPixels(1, 3, [grey(90), grey(10), grey(50)])

    const sorted = pixelSort(pixels, { ...params, direction: 'vertical' })

    expect(pixelAt(sorted, 0, 0)).toEqual(grey(10))
    expect(pixelAt(sorted, 0, 1)).toEqual(grey(50))
    expect(pixelAt(sorted, 0, 2)).toEqual(grey(90))
  })

  it('sorts each row independently — a run never bleeds across rows', () => {
    const pixels = buildPixels(2, 2, [grey(90), grey(10), grey(80), grey(20)])

    const sorted = pixelSort(pixels, params)

    expect(pixelAt(sorted, 0, 0)).toEqual(grey(10))
    expect(pixelAt(sorted, 1, 0)).toEqual(grey(90))
    expect(pixelAt(sorted, 0, 1)).toEqual(grey(20))
    expect(pixelAt(sorted, 1, 1)).toEqual(grey(80))
  })

  it('is pure — the input buffer is never mutated', () => {
    const pixels = buildPixels(2, 1, [grey(90), grey(10)])
    const before = Array.from(pixels.data)

    pixelSort(pixels, params)

    expect(Array.from(pixels.data)).toEqual(before)
  })

  it('returns an equivalent buffer when disabled', () => {
    const pixels = buildPixels(2, 1, [grey(90), grey(10)])

    const sorted = pixelSort(pixels, SORT_OFF)

    expect(Array.from(sorted.data)).toEqual(Array.from(pixels.data))
  })
})

describe('applyPipeline', () => {
  const settings: GlitchSettings = {
    pixelSort: SORT_OFF,
    channelShift: { channel: 'r', amount: 1 },
  }

  it('applies Pixel Sort when enabled', () => {
    const pixels = buildPixels(2, 1, [grey(90), grey(10)])

    const out = applyPipeline(pixels, {
      pixelSort: { ...SORT_OFF, enabled: true },
      channelShift: { channel: 'r', amount: 0 },
    })

    expect(pixelAt(out, 0, 0)).toEqual(grey(10))
    expect(pixelAt(out, 1, 0)).toEqual(grey(90))
  })

  it('skips Pixel Sort when disabled', () => {
    const pixels = buildPixels(2, 1, [grey(90), grey(10)])

    const out = applyPipeline(pixels, {
      pixelSort: SORT_OFF,
      channelShift: { channel: 'r', amount: 0 },
    })

    expect(Array.from(out.data)).toEqual(Array.from(pixels.data))
  })

  it('runs Pixel Sort before Channel Shift — the canonical order', () => {
    // Sorting first pushes the lone red pixel to x=1, leaving x=0 with no red for the
    // shift to carry; the reverse order would smear red across both pixels instead.
    const pixels = buildPixels(2, 1, [
      [255, 0, 0, 255],
      [0, 0, 0, 255],
    ])

    const out = applyPipeline(pixels, {
      pixelSort: { ...SORT_OFF, enabled: true },
      channelShift: { channel: 'r', amount: 1 },
    })

    expect(pixelAt(out, 0, 0)).toEqual([0, 0, 0, 255])
    expect(pixelAt(out, 1, 0)).toEqual([0, 0, 0, 255])
  })

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
