import { describe, expect, it } from 'vitest'
import {
  blockDisplacement,
  channelShift,
  chromaticAberration,
  halftone,
  noise,
  pixelSort,
  scanlines,
  wave,
} from './pipeline'
import { structuredBuffer } from './test-pixels'
import {
  type BlockDisplacementParams,
  DEFAULT_SCANLINES,
  HALFTONE_CELL_SIZE_RANGE,
  type HalftoneParams,
  MAX_BLOCK_SHIFT_RATIO,
  MAX_NOISE_DELTA,
  MAX_WAVE_AMPLITUDE_RATIO,
  type NoiseParams,
  type PixelBuffer,
  type PixelSortParams,
  SCANLINES_DENSITY_STEP,
  type ScanlinesParams,
  WAVE_WAVELENGTH_RANGE,
  type WaveParams,
} from './types'

/** Greys are the clearest Pixel Sort fixture: luminance tracks the channel value directly. */
function grey(value: number): number[] {
  return [value, value, value, 255]
}

/** Sorts every run it meets: threshold 0 puts the whole line in band, and the run spans it. */
const SORT_PARAMS: PixelSortParams = {
  direction: 'horizontal',
  threshold: 0,
  runLength: 64,
}

const NOISE_OFF: NoiseParams = {
  amount: 0,
  tint: 'mono',
}

/** An arbitrary fixed Seed — every test that isn't about the Seed itself rolls this one. */
const SEED = 1234

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
  const params: PixelSortParams = SORT_PARAMS

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
})

describe('scanlines', () => {
  const params: ScanlinesParams = { density: TIGHTEST_DENSITY, intensity: 0.5 }

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

describe('noise', () => {
  const params: NoiseParams = { amount: 0.5, tint: 'color' }

  /** A flat field of one colour — every deviation in the output is grain the Effect put there. */
  function field(width: number, height: number, colour: number[]): PixelBuffer {
    return buildPixels(
      width,
      height,
      Array.from({ length: width * height }, () => colour),
    )
  }

  /** Every rgb channel of a buffer, alpha dropped — the channels Noise is allowed to move. */
  function rgbChannels(buffer: PixelBuffer): number[] {
    return Array.from(buffer.data).filter((_, i) => i % 4 !== 3)
  }

  /** Total distance the grain moved the image — the scale `amount` is meant to turn. */
  function deviation(grained: PixelBuffer, from: number): number {
    return rgbChannels(grained).reduce((sum, value) => sum + Math.abs(value - from), 0)
  }

  it('perturbs the image', () => {
    const pixels = field(8, 8, grey(128))

    const grained = noise(pixels, params, SEED)

    expect(rgbChannels(grained)).not.toEqual(rgbChannels(pixels))
  })

  it('keeps every grain inside the bound the amount sets', () => {
    // Mid-grey with a bound of 64 — far enough from both ends that nothing clamps, so the
    // perturbation is observable at its true size rather than cut off at 0 or 255.
    const grained = noise(field(16, 16, grey(128)), { ...params, amount: 0.5 }, SEED)

    const bound = 0.5 * MAX_NOISE_DELTA
    for (const value of rgbChannels(grained)) {
      expect(Math.abs(value - 128)).toBeLessThanOrEqual(bound)
    }
  })

  it('grains harder as the amount rises', () => {
    const pixels = field(16, 16, grey(128))

    const light = deviation(noise(pixels, { ...params, amount: 0.2 }, SEED), 128)
    const heavy = deviation(noise(pixels, { ...params, amount: 0.8 }, SEED), 128)

    expect(heavy).toBeGreaterThan(light)
  })

  it('reaches the full delta at amount 1', () => {
    const grained = noise(field(32, 32, grey(128)), { ...params, amount: 1 }, SEED)

    const strongest = Math.max(...rgbChannels(grained).map((value) => Math.abs(value - 128)))
    expect(strongest).toBeGreaterThan(MAX_NOISE_DELTA * 0.9)
  })

  it('moves every channel of a pixel together when the tint is mono — the hue survives', () => {
    // Every channel sits at least a bound (64) clear of both 0 and 255, so none of them clamps.
    // A channel that clamped would break step with the others for that reason, not for want of a
    // shared draw, and the assertion could no longer tell the two apart.
    const grained = noise(field(4, 4, [180, 140, 100, 255]), { amount: 0.5, tint: 'mono' }, SEED)

    for (let x = 0; x < 4; x++) {
      const [r, g, b] = pixelAt(grained, x, 0)
      expect(r - 180).toBe(g - 140)
      expect(g - 140).toBe(b - 100)
    }
  })

  it('pulls the channels apart when the tint is colour', () => {
    const grained = noise(field(8, 8, grey(128)), { amount: 0.5, tint: 'color' }, SEED)

    // A grey source stays grey under mono grain; colour grain has to break r === g === b somewhere.
    const chromatic = Array.from({ length: 8 }, (_, x) => pixelAt(grained, x, 0)).some(
      ([r, g, b]) => r !== g || g !== b,
    )
    expect(chromatic).toBe(true)
  })

  it('grains each pixel on its own — the field never shifts as one block', () => {
    const grained = noise(field(8, 8, grey(128)), { amount: 0.5, tint: 'mono' }, SEED)

    const deltas = new Set(Array.from({ length: 8 }, (_, x) => pixelAt(grained, x, 0)[0]))
    expect(deltas.size).toBeGreaterThan(1)
  })

  it('is deterministic — the same params and Seed grain the same way every call', () => {
    const pixels = field(8, 8, grey(128))

    const first = noise(pixels, params, SEED)
    const second = noise(pixels, params, SEED)

    expect(Array.from(first.data)).toEqual(Array.from(second.data))
  })

  it('lays down different grain under a different Seed', () => {
    const pixels = field(8, 8, grey(128))

    const first = noise(pixels, params, SEED)
    const second = noise(pixels, params, SEED + 1)

    expect(Array.from(first.data)).not.toEqual(Array.from(second.data))
  })

  it('leaves alpha untouched — grain speckles the pixel, it does not punch a hole', () => {
    const grained = noise(field(4, 4, [128, 128, 128, 128]), { ...params, amount: 1 }, SEED)

    for (let x = 0; x < 4; x++) {
      expect(pixelAt(grained, x, 0)[3]).toBe(128)
    }
  })

  it('clamps at the ends rather than wrapping around', () => {
    // A raw Uint8Array would wrap a black pixel's negative grain up to near-white, turning the
    // darkest grain into the brightest speckle; the clamped array is what keeps black looking black.
    const dark = noise(field(16, 16, grey(0)), { ...params, amount: 1 }, SEED)
    const light = noise(field(16, 16, grey(255)), { ...params, amount: 1 }, SEED)

    expect(Math.min(...rgbChannels(dark))).toBeGreaterThanOrEqual(0)
    expect(Math.max(...rgbChannels(dark))).toBeLessThanOrEqual(MAX_NOISE_DELTA)
    expect(Math.max(...rgbChannels(light))).toBeLessThanOrEqual(255)
    expect(Math.min(...rgbChannels(light))).toBeGreaterThanOrEqual(255 - MAX_NOISE_DELTA)
  })

  it('is pure — the input buffer is never mutated', () => {
    const pixels = field(4, 4, grey(128))
    const before = Array.from(pixels.data)

    noise(pixels, params, SEED)

    expect(Array.from(pixels.data)).toEqual(before)
  })

  it('returns an equivalent buffer at zero amount', () => {
    const pixels = field(4, 4, grey(128))

    const grained = noise(pixels, NOISE_OFF, SEED)

    expect(Array.from(grained.data)).toEqual(Array.from(pixels.data))
  })
})

describe('blockDisplacement', () => {
  const params: BlockDisplacementParams = { density: 0.5, amount: 0.5 }

  const WIDTH = 64

  /** Distinct values per column, so `value / GRADIENT_STEP` reads back the column a pixel came from. */
  const GRADIENT_STEP = 4

  /**
   * A horizontal gradient repeated down every row: each column carries a value no other column has,
   * which is what lets a displaced pixel be traced back to the column it was pulled from.
   */
  function gradient(height: number): PixelBuffer {
    return buildPixels(
      WIDTH,
      height,
      Array.from({ length: WIDTH * height }, (_, i) => grey((i % WIDTH) * GRADIENT_STEP)),
    )
  }

  /**
   * How far each pixel of a displaced gradient travelled, signed. Reads the source column back off
   * the value and unwraps the distance around the row — the shorter way round is the real one,
   * since the curated bound keeps every block well inside half a width.
   */
  function shifts(displaced: PixelBuffer): number[] {
    const travelled: number[] = []
    for (let y = 0; y < displaced.height; y++) {
      for (let x = 0; x < WIDTH; x++) {
        const from = pixelAt(displaced, x, y)[0] / GRADIENT_STEP
        const wrapped = (((x - from) % WIDTH) + WIDTH) % WIDTH
        travelled.push(wrapped > WIDTH / 2 ? wrapped - WIDTH : wrapped)
      }
    }
    return travelled
  }

  function farthestTravelled(displaced: PixelBuffer): number {
    return Math.max(...shifts(displaced).map(Math.abs))
  }

  function displacedPixelCount(displaced: PixelBuffer): number {
    return shifts(displaced).filter((shift) => shift !== 0).length
  }

  it('displaces the image', () => {
    const pixels = gradient(8)

    const displaced = blockDisplacement(pixels, params, SEED)

    expect(Array.from(displaced.data)).not.toEqual(Array.from(pixels.data))
  })

  it('is stable for a fixed Seed — the same roll reproduces exactly', () => {
    const pixels = gradient(8)

    const first = blockDisplacement(pixels, params, SEED)
    const second = blockDisplacement(pixels, params, SEED)

    expect(Array.from(first.data)).toEqual(Array.from(second.data))
  })

  it('arranges the blocks differently for a different Seed', () => {
    const pixels = gradient(8)

    const first = blockDisplacement(pixels, params, SEED)
    const second = blockDisplacement(pixels, params, SEED + 1)

    expect(Array.from(first.data)).not.toEqual(Array.from(second.data))
  })

  it('shifts blocks horizontally — a block never leaves its own rows', () => {
    // One colour per row: a displaced pixel that landed from another row would show up as a colour
    // its row never held.
    const rows = 4
    const pixels = buildPixels(
      WIDTH,
      rows,
      Array.from({ length: WIDTH * rows }, (_, i) => grey(40 + Math.floor(i / WIDTH) * 50)),
    )

    const displaced = blockDisplacement(pixels, { density: 1, amount: 1 }, SEED)

    for (let y = 0; y < rows; y++) {
      for (let x = 0; x < WIDTH; x++) {
        expect(pixelAt(displaced, x, y)).toEqual(grey(40 + y * 50))
      }
    }
  })

  it('moves each pixel whole — rgb and alpha travel together', () => {
    const pixels = buildPixels(
      WIDTH,
      1,
      Array.from({ length: WIDTH }, (_, x) => [x * GRADIENT_STEP, 10, 20, x + 1]),
    )

    const displaced = blockDisplacement(pixels, { density: 1, amount: 1 }, SEED)

    for (let x = 0; x < WIDTH; x++) {
      const [r, g, b, a] = pixelAt(displaced, x, 0)
      expect([g, b, a]).toEqual([10, 20, r / GRADIENT_STEP + 1])
    }
  })

  it('keeps every block inside the bound the amount sets', () => {
    const bound = Math.ceil(params.amount * MAX_BLOCK_SHIFT_RATIO * WIDTH)

    expect(farthestTravelled(blockDisplacement(gradient(8), params, SEED))).toBeLessThanOrEqual(
      bound,
    )
  })

  it('travels further as the amount rises', () => {
    const pixels = gradient(8)

    const near = farthestTravelled(blockDisplacement(pixels, { ...params, amount: 0.2 }, SEED))
    const far = farthestTravelled(blockDisplacement(pixels, { ...params, amount: 1 }, SEED))

    expect(far).toBeGreaterThan(near)
  })

  it('displaces more of the image as the density rises', () => {
    const pixels = gradient(8)

    const sparse = displacedPixelCount(blockDisplacement(pixels, { ...params, density: 0.2 }, SEED))
    const dense = displacedPixelCount(blockDisplacement(pixels, { ...params, density: 1 }, SEED))

    expect(dense).toBeGreaterThan(sparse)
  })

  it('leaves most of the image where it was — the tear is a band, not a shuffle', () => {
    const displaced = blockDisplacement(gradient(8), params, SEED)

    expect(displacedPixelCount(displaced)).toBeLessThan(WIDTH * 8)
  })

  it('wraps a block around its row rather than smearing the edge column', () => {
    // Clamping at the edge the way Channel Shift does would fill a block that overhangs the row
    // with repeats of the first column — a flat run the distinct-valued gradient can't produce
    // any other way.
    const displaced = blockDisplacement(gradient(8), { density: 1, amount: 1 }, SEED)

    for (let y = 0; y < 8; y++) {
      const row = Array.from({ length: WIDTH }, (_, x) => pixelAt(displaced, x, y)[0])
      const longestRun = row.reduce(
        ({ best, run, last }, value) => {
          const next = value === last ? run + 1 : 1
          return { best: Math.max(best, next), run: next, last: value }
        },
        { best: 0, run: 0, last: Number.NaN },
      ).best

      expect(longestRun).toBeLessThan(4)
    }
  })

  it('is pure — the input buffer is never mutated', () => {
    const pixels = gradient(4)
    const before = Array.from(pixels.data)

    blockDisplacement(pixels, { density: 1, amount: 1 }, SEED)

    expect(Array.from(pixels.data)).toEqual(before)
  })

  it('returns an equivalent buffer at zero density', () => {
    const pixels = gradient(4)

    const displaced = blockDisplacement(pixels, { ...params, density: 0 }, SEED)

    expect(Array.from(displaced.data)).toEqual(Array.from(pixels.data))
  })

  it('returns an equivalent buffer at zero amount', () => {
    const pixels = gradient(4)

    const displaced = blockDisplacement(pixels, { ...params, amount: 0 }, SEED)

    expect(Array.from(displaced.data)).toEqual(Array.from(pixels.data))
  })

  it('clamps params outside 0..1 to the curated ends', () => {
    const pixels = gradient(4)

    expect(Array.from(blockDisplacement(pixels, { density: 4, amount: 4 }, SEED).data)).toEqual(
      Array.from(blockDisplacement(pixels, { density: 1, amount: 1 }, SEED).data),
    )
  })
})

describe('chromaticAberration', () => {
  /**
   * A single row of greys rising with x. Every channel starts equal, so any inequality in the
   * output is displacement this Effect introduced — and an odd width puts the centre on a pixel.
   */
  function ramp(width: number): PixelBuffer {
    return buildPixels(
      width,
      1,
      Array.from({ length: width }, (_, x) => grey(x * 10)),
    )
  }

  /** As `ramp`, but rising with y instead of x — the fixture that exercises the sampler's y term. */
  function verticalRamp(size: number): PixelBuffer {
    return buildPixels(
      size,
      size,
      Array.from({ length: size * size }, (_, i) => grey(Math.floor(i / size) * 10)),
    )
  }

  /** Rises along both axes at once, so displacement on either axis moves the value. */
  function diagonalRamp(size: number): PixelBuffer {
    return buildPixels(
      size,
      size,
      Array.from({ length: size * size }, (_, i) => grey(((i % size) + Math.floor(i / size)) * 8)),
    )
  }

  /** The Effect at the top of the slider's travel — the strength most assertions here read. */
  function fringed(pixels: PixelBuffer): PixelBuffer {
    return chromaticAberration(pixels, { strength: 1 })
  }

  it('returns an equivalent buffer at zero strength', () => {
    const pixels = ramp(9)

    const out = chromaticAberration(pixels, { strength: 0 })

    expect(Array.from(out.data)).toEqual(Array.from(pixels.data))
  })

  it('never mutates the input buffer', () => {
    const pixels = ramp(9)
    const before = Array.from(pixels.data)

    chromaticAberration(pixels, { strength: 1 })

    expect(Array.from(pixels.data)).toEqual(before)
  })

  it('leaves the centre pixel unfringed', () => {
    // The whole reason CA is a separate Effect from Channel Shift: displacement is zero at the
    // centre and grows outward, so the middle stays sharp however strong the fringe gets.
    const pixels = ramp(9)

    const out = chromaticAberration(pixels, { strength: 1 })

    expect(pixelAt(out, 4, 0)).toEqual(grey(40))
  })

  it('pulls R and B apart at the edge while leaving G alone', () => {
    // R is magnified, so it samples nearer the centre (a lower value on a rising ramp); B is
    // shrunk, so it samples further out. G is the reference copy and never moves.
    const pixels = ramp(9)

    const [r, g, b] = pixelAt(fringed(pixels), 8, 0)

    expect(g).toBe(80)
    expect(r).toBeLessThan(g)
    expect(b).toBeGreaterThanOrEqual(g)
  })

  it('grows the displacement with radius', () => {
    const pixels = ramp(9)

    const out = fringed(pixels)
    const nearCentre = 50 - pixelAt(out, 5, 0)[0]
    const atEdge = 80 - pixelAt(out, 8, 0)[0]

    expect(atEdge).toBeGreaterThan(nearCentre)
  })

  it('blends neighbouring pixels on a fractional displacement', () => {
    // Proves the sampling is bilinear rather than a rounded hard copy. Sub-pixel accuracy matters
    // *here* specifically: near the centre the displacement is well under a pixel, and rounding it
    // to zero would snap the smooth centre-to-edge gradient into a visible stair-step ring.
    const pixels = ramp(9)

    const r = pixelAt(fringed(pixels), 8, 0)[0]

    // Lands strictly between two ramp steps — no source pixel carries this value.
    expect(r).toBeGreaterThan(70)
    expect(r).toBeLessThan(80)
  })

  it('displaces along the vertical axis too', () => {
    // `ramp` is a single row, so every assertion above leaves the sampler's y term at zero. This
    // fixture varies with y alone and reads directly below the centre, where the x term is zero
    // instead — so a transposed or dropped y term shows up as an unfringed pixel.
    const pixels = verticalRamp(9)

    const [r, g, b] = pixelAt(fringed(pixels), 4, 8)

    expect(g).toBe(80)
    expect(r).toBeLessThan(g)
    expect(b).toBeGreaterThanOrEqual(g)
  })

  it('grows the displacement with the 2-D radius, not one axis of it', () => {
    // The corner is further from the centre than the edge midpoint on the diagonal, so it must
    // fringe harder — which only holds if both offsets feed the sample position.
    const pixels = diagonalRamp(9)

    const out = fringed(pixels)
    const atCorner = (8 + 8) * 8 - pixelAt(out, 8, 8)[0]
    const atEdgeMidpoint = (8 + 4) * 8 - pixelAt(out, 8, 4)[0]

    expect(atCorner).toBeGreaterThan(atEdgeMidpoint)
  })

  it('clamps a sample that falls outside the buffer', () => {
    // B is shrunk, so at the outermost pixel it reads past the end of the row. Clamping matches
    // channelShift's edge policy, so "displacement Effects clamp at the edge" holds as a family
    // rule; a wrap here would drag the far side's colour into the corner.
    const pixels = ramp(9)

    expect(pixelAt(fringed(pixels), 8, 0)[2]).toBe(80)
  })

  it('leaves alpha untouched', () => {
    const pixels = buildPixels(3, 1, [
      [10, 10, 10, 0],
      [20, 20, 20, 128],
      [30, 30, 30, 255],
    ])

    const out = chromaticAberration(pixels, { strength: 1 })

    expect([pixelAt(out, 0, 0)[3], pixelAt(out, 1, 0)[3], pixelAt(out, 2, 0)[3]]).toEqual([
      0, 128, 255,
    ])
  })

  it('preserves the buffer dimensions', () => {
    const out = chromaticAberration(ramp(9), { strength: 1 })

    expect([out.width, out.height]).toEqual([9, 1])
  })

  it('fringes harder as strength rises', () => {
    const pixels = ramp(9)

    const subtle = pixelAt(chromaticAberration(pixels, { strength: 0.2 }), 8, 0)[0]
    const strong = pixelAt(chromaticAberration(pixels, { strength: 1 }), 8, 0)[0]

    expect(strong).toBeLessThan(subtle)
  })
})

describe('halftone', () => {
  /** A flat field, so every assertion reads the dot rather than the tone underneath it. */
  function uniform(size: number, value: number): PixelBuffer {
    return buildPixels(
      size,
      size,
      Array.from({ length: size * size }, () => grey(value)),
    )
  }

  /** How much of the frame the screen inked — every pixel it left off the black ground. */
  function inked(buffer: PixelBuffer): number {
    let count = 0
    for (let offset = 0; offset < buffer.data.length; offset += 4) {
      if (buffer.data[offset] > 0 || buffer.data[offset + 1] > 0 || buffer.data[offset + 2] > 0) {
        count += 1
      }
    }
    return count
  }

  /** Mono at the top of the dot slider — the shape of the dot, with hue out of the way. */
  const SCREEN: HalftoneParams = { cellSize: 8, dotScale: 1, tint: 'mono' }

  it('never mutates the input buffer', () => {
    const pixels = uniform(8, 64)
    const before = Array.from(pixels.data)

    halftone(pixels, SCREEN)

    expect(Array.from(pixels.data)).toEqual(before)
  })

  it('returns an equivalent buffer at zero dot scale', () => {
    // The floor of the slider means the Effect off, the same as it does for Noise, Scanlines and
    // Chromatic Aberration. Read literally it would ink nothing and hand back a black frame — the
    // picture erased rather than the screen stopped, which is not what a slider's floor promises.
    const pixels = structuredBuffer(16, 12)

    const out = halftone(pixels, { ...SCREEN, dotScale: 0 })

    expect(Array.from(out.data)).toEqual(Array.from(pixels.data))
  })

  it('preserves the buffer dimensions', () => {
    const out = halftone(structuredBuffer(13, 7), SCREEN)

    expect([out.width, out.height]).toEqual([13, 7])
  })

  it('inks the middle of a cell and leaves its corners on the ground', () => {
    const out = halftone(uniform(8, 64), SCREEN)

    expect(pixelAt(out, 3, 3)).toEqual([255, 255, 255, 255])
    expect(pixelAt(out, 0, 0)).toEqual([0, 0, 0, 255])
  })

  it('grows the dot with the cell’s luminance', () => {
    // The Effect's whole claim: tone survives as area, not as a value.
    const dim = inked(halftone(uniform(8, 60), SCREEN))
    const bright = inked(halftone(uniform(8, 200), SCREEN))

    expect(bright).toBeGreaterThan(dim)
  })

  it('leaves a black cell entirely on the ground', () => {
    expect(inked(halftone(uniform(8, 0), SCREEN))).toBe(0)
  })

  it('fills a white cell solid at the top of the dot scale', () => {
    // What HALFTONE_MAX_DOT_RADIUS_RATIO buys: a white region reads as ink, not as a grid of
    // circles with the ground showing through the corners.
    expect(inked(halftone(uniform(8, 255), SCREEN))).toBe(64)
  })

  it('screens each cell off its own tone', () => {
    // A black half beside a white one: the grid is per-cell, not one dot fitted to the frame.
    const pixels = buildPixels(
      8,
      4,
      Array.from({ length: 32 }, (_, i) => grey(i % 8 < 4 ? 0 : 255)),
    )

    const out = halftone(pixels, { cellSize: 4, dotScale: 1, tint: 'mono' })

    expect(pixelAt(out, 1, 1)).toEqual([0, 0, 0, 255])
    expect(pixelAt(out, 5, 1)).toEqual([255, 255, 255, 255])
  })

  it('sizes the dot from the cell’s average, not from the pixel under its centre', () => {
    // The four middle pixels are black and the rest white, so a screen reading the centre pixel
    // would ink nothing here. The cell averages bright, so the dot covers them instead.
    const pixels = buildPixels(
      4,
      4,
      Array.from({ length: 16 }, (_, i) => {
        const x = i % 4
        const y = Math.floor(i / 4)
        return grey(x > 0 && x < 3 && y > 0 && y < 3 ? 0 : 255)
      }),
    )

    const out = halftone(pixels, { cellSize: 4, dotScale: 1, tint: 'mono' })

    expect(pixelAt(out, 1, 1)).toEqual([255, 255, 255, 255])
  })

  it('throws away detail finer than a cell', () => {
    // Re-quantization, stated as an equality: a cell of alternating black and white and a flat
    // cell of their mean are the same image once screened.
    const checker = buildPixels(
      4,
      4,
      Array.from({ length: 16 }, (_, i) => grey((((i % 4) + Math.floor(i / 4)) % 2) * 254)),
    )
    const flat = uniform(4, 127)

    const screened = halftone(checker, { cellSize: 4, dotScale: 1, tint: 'mono' })

    expect(Array.from(screened.data)).toEqual(
      Array.from(halftone(flat, { cellSize: 4, dotScale: 1, tint: 'mono' }).data),
    )
  })

  it('inks a colour dot with its cell’s average colour', () => {
    const pixels = buildPixels(
      4,
      4,
      Array.from({ length: 16 }, () => [200, 0, 0, 255]),
    )

    const out = halftone(pixels, { cellSize: 4, dotScale: 1, tint: 'color' })

    expect(pixelAt(out, 1, 1)).toEqual([200, 0, 0, 255])
  })

  it('inks a mono dot white whatever the cell’s hue', () => {
    // Mono is the harder re-quantization: hue goes with the detail, and tone survives as area alone.
    const pixels = buildPixels(
      4,
      4,
      Array.from({ length: 16 }, () => [200, 0, 0, 255]),
    )

    const out = halftone(pixels, { cellSize: 4, dotScale: 1, tint: 'mono' })

    expect(pixelAt(out, 1, 1)).toEqual([255, 255, 255, 255])
  })

  it('coarsens the grid as the cell grows', () => {
    const pixels = structuredBuffer(32, 32)

    const fine = halftone(pixels, { ...SCREEN, cellSize: 2 })
    const coarse = halftone(pixels, { ...SCREEN, cellSize: 16 })

    expect(Array.from(fine.data)).not.toEqual(Array.from(coarse.data))
  })

  // Both ends, because the range is a property of the screen rather than of the slider that edits
  // it: a cell outside it is a grid that stops reading as one, whichever way the caller came in.
  it.each([
    ['below the smallest', 0, HALFTONE_CELL_SIZE_RANGE.min],
    ['above the largest', 400, HALFTONE_CELL_SIZE_RANGE.max],
  ])('screens a cell %s the control offers as that one', (_label, asked, held) => {
    // Wider than two of the largest cells, or an uncapped run would land on a single cell here and
    // agree with the capped one for the wrong reason.
    const pixels = structuredBuffer(64, 48)

    const out = halftone(pixels, { ...SCREEN, cellSize: asked })

    expect(Array.from(out.data)).toEqual(
      Array.from(halftone(pixels, { ...SCREEN, cellSize: held }).data),
    )
  })

  it('leaves alpha untouched', () => {
    const pixels = buildPixels(2, 2, [
      [255, 255, 255, 0],
      [255, 255, 255, 64],
      [255, 255, 255, 128],
      [255, 255, 255, 255],
    ])

    const out = halftone(pixels, { cellSize: 2, dotScale: 1, tint: 'mono' })

    expect([0, 1, 2, 3].map((i) => out.data[i * 4 + 3])).toEqual([0, 64, 128, 255])
  })

  it('renders the same buffer identically every time', () => {
    // Halftone draws on nothing — no Seed, no Math.random — so its output is a function of the
    // pixels and its params alone (ADR 0005). `chain.test.ts` pins the same property through the
    // Chain, where the Seed it ignores actually travels.
    const pixels = structuredBuffer(24, 18)

    const first = halftone(pixels, { cellSize: 5, dotScale: 0.7, tint: 'color' })
    const second = halftone(pixels, { cellSize: 5, dotScale: 0.7, tint: 'color' })

    expect(Array.from(first.data)).toEqual(Array.from(second.data))
  })
})

describe('wave', () => {
  /**
   * A frame whose every pixel is unique on both axes, so a displaced pixel can be traced back to
   * exactly the one it came from — which is what lets these assertions pin the sine rather than
   * merely notice that something moved.
   */
  function traceable(width: number, height: number): PixelBuffer {
    return buildPixels(
      width,
      height,
      Array.from({ length: width * height }, (_, i) => [i % width, Math.floor(i / width), 7, 255]),
    )
  }

  // 100 wide against MAX_WAVE_AMPLITUDE_RATIO puts the crest exactly 12px out, and a wavelength of
  // 8 puts the crests on whole rows (y=2 rides sin +1, y=6 rides sin -1, y=0 rides 0). The
  // displacement is therefore a whole number of pixels and the sampler blends nothing, so the
  // assertions below read the sine itself rather than a rounding of it.
  const CREST_WIDTH = 100
  const CREST_WAVELENGTH = 8
  const CREST_OFFSET = MAX_WAVE_AMPLITUDE_RATIO * CREST_WIDTH

  const BEND: WaveParams = { axis: 'horizontal', amplitude: 1, wavelength: CREST_WAVELENGTH }

  it('never mutates the input buffer', () => {
    const pixels = traceable(CREST_WIDTH, 8)
    const before = Array.from(pixels.data)

    wave(pixels, BEND)

    expect(Array.from(pixels.data)).toEqual(before)
  })

  it('returns an equivalent buffer at zero amplitude', () => {
    // The floor of the slider means the Effect off, the same as it does for Noise, Scanlines,
    // Chromatic Aberration and Halftone — a true pass-through, not merely a bend too small to see.
    const pixels = structuredBuffer(16, 12)

    const out = wave(pixels, { ...BEND, amplitude: 0 })

    expect(Array.from(out.data)).toEqual(Array.from(pixels.data))
  })

  it('preserves the buffer dimensions', () => {
    const out = wave(structuredBuffer(13, 7), BEND)

    expect([out.width, out.height]).toEqual([13, 7])
  })

  it('displaces a row by the sine of its own position', () => {
    const pixels = traceable(CREST_WIDTH, 8)

    const out = wave(pixels, BEND)

    // The positive crest pulls the picture right, so the pixel that lands at x came from its left.
    expect(pixelAt(out, 50, 2)).toEqual(pixelAt(pixels, 50 - CREST_OFFSET, 2))
    // Half a wavelength on, the sine has flipped and the same row's worth travels the other way.
    expect(pixelAt(out, 50, 6)).toEqual(pixelAt(pixels, 50 + CREST_OFFSET, 6))
  })

  it('leaves a row sitting on a zero of the sine where it was', () => {
    const pixels = traceable(CREST_WIDTH, 8)

    const out = wave(pixels, BEND)

    expect(pixelAt(out, 50, 0)).toEqual(pixelAt(pixels, 50, 0))
  })

  it('moves a whole row together rather than shearing it', () => {
    // The claim that separates Wave from every other geometric Effect here: one offset for the
    // entire line, so the image travels as one image.
    const pixels = traceable(CREST_WIDTH, 8)

    const out = wave(pixels, BEND)

    for (const x of [20, 45, 80]) {
      expect(pixelAt(out, x, 2)).toEqual(pixelAt(pixels, x - CREST_OFFSET, 2))
    }
  })

  it('clamps at the edge rather than wrapping the far side in', () => {
    // A crest pushes the left of the row out of frame; what fills the gap is the edge column
    // repeated. Wrapping would drag the right-hand end of the row into the left margin, which
    // reads as a bug rather than as a bend — the same choice `channelShift` makes.
    const pixels = traceable(CREST_WIDTH, 8)

    const out = wave(pixels, BEND)

    expect(pixelAt(out, 0, 2)).toEqual(pixelAt(pixels, 0, 2))
    expect(pixelAt(out, CREST_OFFSET - 1, 2)).toEqual(pixelAt(pixels, 0, 2))
  })

  it('displaces columns instead of rows on the vertical axis', () => {
    // Deliberately *not* square, and with the crest-sized span on the axis the pixels travel along
    // (height here, where the horizontal cases put it on width). A square fixture would pass even
    // if `farthest` measured the wrong axis or the offsets were indexed by y instead of x — the two
    // spans would agree and hide the swap. At 40 wide, a width-measured `farthest` would be 4.8px
    // rather than 12, and a y-indexed lookup would run off the end of the 40-entry offset table.
    const pixels = traceable(40, CREST_WIDTH)

    const out = wave(pixels, { ...BEND, axis: 'vertical' })

    expect(pixelAt(out, 2, 50)).toEqual(pixelAt(pixels, 2, 50 - CREST_OFFSET))
    expect(pixelAt(out, 6, 50)).toEqual(pixelAt(pixels, 6, 50 + CREST_OFFSET))
  })

  it('travels further as the amplitude rises', () => {
    const pixels = traceable(CREST_WIDTH, 8)

    const half = wave(pixels, { ...BEND, amplitude: 0.5 })
    const full = wave(pixels, BEND)

    expect(pixelAt(half, 50, 2)).toEqual(pixelAt(pixels, 50 - CREST_OFFSET / 2, 2))
    expect(pixelAt(full, 50, 2)).toEqual(pixelAt(pixels, 50 - CREST_OFFSET, 2))
  })

  it('spaces the crests by the wavelength', () => {
    // Doubling the cycle moves the crest from row 2 to row 4 — the param does what its name says.
    const pixels = traceable(CREST_WIDTH, 16)

    const out = wave(pixels, { ...BEND, wavelength: CREST_WAVELENGTH * 2 })

    expect(pixelAt(out, 50, 4)).toEqual(pixelAt(pixels, 50 - CREST_OFFSET, 4))
  })

  // Both ends, because the range is a property of the bend rather than of the slider that edits it:
  // a cycle outside it stops reading as a wave, whichever way the caller came in.
  it.each([
    ['below the tightest', 0, WAVE_WAVELENGTH_RANGE.min],
    ['above the widest', 5000, WAVE_WAVELENGTH_RANGE.max],
  ])('bends a wavelength %s the control offers as that one', (_label, asked, held) => {
    const pixels = structuredBuffer(64, 48)

    const out = wave(pixels, { ...BEND, wavelength: asked })

    expect(Array.from(out.data)).toEqual(
      Array.from(wave(pixels, { ...BEND, wavelength: held }).data),
    )
  })

  it('carries a pixel’s alpha along with it', () => {
    // Wave *moves* a pixel where the other Effects tint one, so its transparency has to travel with
    // it — left behind, a displaced pixel would inherit whatever alpha sat where it landed.
    //
    // The varying alpha here is the fixture that makes that visible, and is **not** a claim that
    // arbitrary alpha is supported: the shell only ever hands the core an opaque buffer, and the
    // sampler blends non-premultiplied channels, which would halo across a real alpha edge (see
    // `wave` in pipeline.ts). Alpha rises with x and the assertion reads a crest well inside the
    // frame, so no sample it checks lands on such an edge.
    const pixels = buildPixels(
      CREST_WIDTH,
      8,
      Array.from({ length: CREST_WIDTH * 8 }, (_, i) => [200, 200, 200, (i % CREST_WIDTH) * 2]),
    )

    const out = wave(pixels, BEND)

    expect(pixelAt(out, 50, 2)[3]).toBe(pixelAt(pixels, 50 - CREST_OFFSET, 2)[3])
  })

  it('renders the same buffer identically every time', () => {
    // Wave draws on nothing — no Seed, no Math.random — so its output is a function of the pixels
    // and its params alone (ADR 0005). `chain.test.ts` pins the same property through the Chain,
    // where the Seed it ignores actually travels.
    const pixels = structuredBuffer(24, 18)

    const first = wave(pixels, { axis: 'vertical', amplitude: 0.6, wavelength: 33 })
    const second = wave(pixels, { axis: 'vertical', amplitude: 0.6, wavelength: 33 })

    expect(Array.from(first.data)).toEqual(Array.from(second.data))
  })
})
