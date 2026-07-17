import { describe, expect, it } from 'vitest'
import { applyPipeline, channelShift, pixelSort, scanlines } from './pipeline'
import {
  DEFAULT_SCANLINES,
  type GlitchSettings,
  type PixelBuffer,
  type PixelSortParams,
  SCANLINES_DENSITY_STEP,
  type ScanlinesParams,
} from './types'

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

const SCANLINES_OFF: ScanlinesParams = {
  enabled: false,
  density: 0.5,
  intensity: 0.5,
}

/** The tightest raster the density scale reaches — a period of 2, so every other row darkens. */
const TIGHTEST_DENSITY = 1

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

describe('scanlines', () => {
  const params: ScanlinesParams = { enabled: true, density: TIGHTEST_DENSITY, intensity: 0.5 }

  /** A column of identical greys — every row is a candidate line, so only the raster shows. */
  function greyColumn(height: number, value: number): PixelBuffer {
    return buildPixels(
      1,
      height,
      Array.from({ length: height }, () => grey(value)),
    )
  }

  /** Rows apart the first two dark lines land — the period, read back off a rastered greyColumn. */
  function periodOf(rastered: PixelBuffer): number {
    const dark: number[] = []
    for (let y = 0; y < rastered.height; y++) {
      if (pixelAt(rastered, 0, y)[0] < 200) {
        dark.push(y)
      }
    }
    return dark[1] - dark[0]
  }

  it('darkens every other row at the tightest density', () => {
    const dimmed = scanlines(greyColumn(4, 200), params)

    expect(pixelAt(dimmed, 0, 0)).toEqual(grey(100))
    expect(pixelAt(dimmed, 0, 2)).toEqual(grey(100))
  })

  it('leaves the rows between the lines untouched', () => {
    const dimmed = scanlines(greyColumn(4, 200), params)

    expect(pixelAt(dimmed, 0, 1)).toEqual(grey(200))
    expect(pixelAt(dimmed, 0, 3)).toEqual(grey(200))
  })

  it('spaces the lines further apart as density drops', () => {
    const dimmed = scanlines(greyColumn(8, 200), { ...params, density: 0 })

    // The sparsest raster is a period of 16 — past the end of an 8-row buffer, so only row 0 lands.
    expect(pixelAt(dimmed, 0, 0)).toEqual(grey(100))
    for (let y = 1; y < 8; y++) {
      expect(pixelAt(dimmed, 0, y)).toEqual(grey(200))
    }
  })

  it('darkens the whole line, not just one channel', () => {
    const pixels = buildPixels(2, 1, [
      [200, 100, 40, 255],
      [80, 60, 20, 255],
    ])

    const dimmed = scanlines(pixels, params)

    expect(pixelAt(dimmed, 0, 0)).toEqual([100, 50, 20, 255])
    expect(pixelAt(dimmed, 1, 0)).toEqual([40, 30, 10, 255])
  })

  it('scales the darkening with intensity', () => {
    const dimmed = scanlines(greyColumn(2, 200), { ...params, intensity: 0.25 })

    expect(pixelAt(dimmed, 0, 0)).toEqual(grey(150))
  })

  it('blacks the line out at full intensity', () => {
    const dimmed = scanlines(greyColumn(2, 200), { ...params, intensity: 1 })

    expect(pixelAt(dimmed, 0, 0)).toEqual(grey(0))
  })

  it('leaves alpha untouched — a scanline dims the pixel, it does not punch a hole', () => {
    const pixels = buildPixels(1, 1, [[200, 200, 200, 128]])

    const dimmed = scanlines(pixels, { ...params, intensity: 1 })

    expect(pixelAt(dimmed, 0, 0)).toEqual([0, 0, 0, 128])
  })

  it('is pure — the input buffer is never mutated', () => {
    const pixels = greyColumn(2, 200)
    const before = Array.from(pixels.data)

    scanlines(pixels, params)

    expect(Array.from(pixels.data)).toEqual(before)
  })

  it('returns an equivalent buffer when disabled', () => {
    const pixels = greyColumn(4, 200)

    const dimmed = scanlines(pixels, SCANLINES_OFF)

    expect(Array.from(dimmed.data)).toEqual(Array.from(pixels.data))
  })

  it('returns an equivalent buffer at zero intensity', () => {
    const pixels = greyColumn(4, 200)

    const dimmed = scanlines(pixels, { ...params, intensity: 0 })

    expect(Array.from(dimmed.data)).toEqual(Array.from(pixels.data))
  })

  it('gives every density notch a period of its own — no step of the scale is a no-op', () => {
    const notches = Math.round(1 / SCANLINES_DENSITY_STEP)
    const periods = Array.from({ length: notches + 1 }, (_, n) =>
      periodOf(scanlines(greyColumn(40, 200), { ...params, density: n * SCANLINES_DENSITY_STEP })),
    )

    expect(periods).toEqual([16, 15, 14, 13, 12, 11, 10, 9, 8, 7, 6, 5, 4, 3, 2])
  })

  it('puts the default density on a notch, so the reset value stays reachable', () => {
    expect(DEFAULT_SCANLINES.density / SCANLINES_DENSITY_STEP).toBeCloseTo(
      Math.round(DEFAULT_SCANLINES.density / SCANLINES_DENSITY_STEP),
    )
  })

  it('clamps a density outside 0..1 to the curated ends', () => {
    const pixels = greyColumn(4, 200)

    expect(Array.from(scanlines(pixels, { ...params, density: 4 }).data)).toEqual(
      Array.from(scanlines(pixels, { ...params, density: 1 }).data),
    )
    expect(Array.from(scanlines(pixels, { ...params, density: -4 }).data)).toEqual(
      Array.from(scanlines(pixels, { ...params, density: 0 }).data),
    )
  })
})

describe('applyPipeline', () => {
  const settings: GlitchSettings = {
    pixelSort: SORT_OFF,
    channelShift: { channel: 'r', amount: 1 },
    scanlines: SCANLINES_OFF,
  }

  it('applies Pixel Sort when enabled', () => {
    const pixels = buildPixels(2, 1, [grey(90), grey(10)])

    const out = applyPipeline(pixels, {
      pixelSort: { ...SORT_OFF, enabled: true },
      channelShift: { channel: 'r', amount: 0 },
      scanlines: SCANLINES_OFF,
    })

    expect(pixelAt(out, 0, 0)).toEqual(grey(10))
    expect(pixelAt(out, 1, 0)).toEqual(grey(90))
  })

  it('skips Pixel Sort when disabled', () => {
    const pixels = buildPixels(2, 1, [grey(90), grey(10)])

    const out = applyPipeline(pixels, {
      pixelSort: SORT_OFF,
      channelShift: { channel: 'r', amount: 0 },
      scanlines: SCANLINES_OFF,
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
      scanlines: SCANLINES_OFF,
    })

    expect(pixelAt(out, 0, 0)).toEqual([0, 0, 0, 255])
    expect(pixelAt(out, 1, 0)).toEqual([0, 0, 0, 255])
  })

  it('applies Scanlines when enabled', () => {
    const pixels = buildPixels(1, 2, [grey(200), grey(200)])

    const out = applyPipeline(pixels, {
      ...settings,
      channelShift: { channel: 'r', amount: 0 },
      scanlines: { enabled: true, density: TIGHTEST_DENSITY, intensity: 0.5 },
    })

    expect(pixelAt(out, 0, 0)).toEqual(grey(100))
    expect(pixelAt(out, 0, 1)).toEqual(grey(200))
  })

  // Pins Scanlines against Pixel Sort rather than against its actual Pipeline neighbour: Scanlines
  // and Channel Shift commute, so their relative order is unobservable and no test can pin it. A
  // per-row uniform scale and a within-row horizontal shift never see each other — scaling then
  // shifting a row equals shifting then scaling it. Pixel Sort is the nearest Effect the order is
  // observable against, and it's the one that matters: it proves surface runs after structural.
  it('runs Scanlines last — surface texture lays over the arrangement', () => {
    const pixels = buildPixels(1, 2, [grey(200), grey(10)])

    const out = applyPipeline(pixels, {
      pixelSort: { ...SORT_OFF, enabled: true, direction: 'vertical' },
      channelShift: { channel: 'r', amount: 0 },
      scanlines: { enabled: true, density: TIGHTEST_DENSITY, intensity: 0.5 },
    })

    // The sort lifts grey(10) to row 0, and only then does the scanline dim it to 5. Darkening
    // first would have sunk grey(200) to 100 and left the sort to order 10 above it instead.
    expect(pixelAt(out, 0, 0)).toEqual(grey(5))
    expect(pixelAt(out, 0, 1)).toEqual(grey(200))
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
