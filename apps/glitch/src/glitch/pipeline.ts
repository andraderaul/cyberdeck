import {
  CHANNEL_OFFSET,
  type ChannelShiftParams,
  type GlitchSettings,
  MAX_NOISE_DELTA,
  type NoiseParams,
  type PixelBuffer,
  type PixelSortParams,
  type ScanlinesParams,
  SPARSEST_SCANLINE_PERIOD,
  TIGHTEST_SCANLINE_PERIOD,
} from './types'

const BT601_RED_LUMA_WEIGHT = 0.299
const BT601_GREEN_LUMA_WEIGHT = 0.587
const BT601_BLUE_LUMA_WEIGHT = 0.114

/**
 * Perceived brightness of a pixel, normalised to 0..1 — the scale Pixel Sort's threshold reads on.
 * A hand-copy of ASCII//Convert's `computeLuminosity`, kept identical rather than re-derived:
 * the duplication is the signal that marks this for extraction later (ADR 0011).
 */
function computeLuminosity(r: number, g: number, b: number): number {
  return (
    (BT601_RED_LUMA_WEIGHT * r + BT601_GREEN_LUMA_WEIGHT * g + BT601_BLUE_LUMA_WEIGHT * b) / 255
  )
}

/**
 * Reorders one run of pixels by luminance, writing them back into the very offsets they came
 * from — so a run rearranges in place and never disturbs the pixels around it.
 *
 * Reads every pixel from `source` before writing, which is what lets the caller pass the input
 * buffer alongside its copy without a half-sorted run feeding back into the comparison.
 */
function sortRun(
  source: Uint8ClampedArray<ArrayBuffer>,
  target: Uint8ClampedArray<ArrayBuffer>,
  offsets: number[],
): void {
  const ordered = offsets
    .map((offset) => ({
      offset,
      luma: computeLuminosity(source[offset], source[offset + 1], source[offset + 2]),
    }))
    .sort((a, b) => a.luma - b.luma)

  ordered.forEach(({ offset }, i) => {
    const destination = offsets[i]
    target[destination] = source[offset]
    target[destination + 1] = source[offset + 1]
    target[destination + 2] = source[offset + 2]
    target[destination + 3] = source[offset + 3]
  })
}

/**
 * Effect: sorts contiguous runs of pixels by luminance within a threshold band — the iconic
 * "melted" smear. Pure: builds a new PixelBuffer, never touches the input. See ADR 0005.
 *
 * A run collects while pixels stay in band and flushes at the first pixel below the threshold,
 * at the end of the line, or once it reaches runLength. Sorting per run rather than per line is
 * the whole effect: an unbroken line-wide sort reads as a gradient, not a glitch.
 */
export function pixelSort(pixels: PixelBuffer, params: PixelSortParams): PixelBuffer {
  const { width, height, data } = pixels
  const out = new Uint8ClampedArray(data)
  if (!params.enabled) {
    return { data: out, width, height }
  }

  const horizontal = params.direction === 'horizontal'
  const lineCount = horizontal ? height : width
  const lineLength = horizontal ? width : height
  // Floors at 1 so a runLength below it turns the Effect off (a run of 1 is already sorted).
  // Left unclamped, a 0 would never match the flush check and would sort each band end to end —
  // the strongest possible smear from the setting that reads as the weakest.
  const maxRun = Math.max(1, Math.floor(params.runLength))

  for (let line = 0; line < lineCount; line++) {
    let run: number[] = []

    const flush = () => {
      if (run.length > 1) {
        sortRun(data, out, run)
      }
      run = []
    }

    for (let step = 0; step < lineLength; step++) {
      const x = horizontal ? step : line
      const y = horizontal ? line : step
      const offset = (y * width + x) * 4

      if (computeLuminosity(data[offset], data[offset + 1], data[offset + 2]) >= params.threshold) {
        run.push(offset)
        if (run.length === maxRun) {
          flush()
        }
      } else {
        flush()
      }
    }
    flush()
  }

  return { data: out, width, height }
}

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

/** Maps normalised density onto the pixel period between dark rows — inverted, so 1 is tightest. */
function scanlinePeriod(density: number): number {
  const clamped = Math.min(Math.max(density, 0), 1)
  return Math.round(
    SPARSEST_SCANLINE_PERIOD + (TIGHTEST_SCANLINE_PERIOD - SPARSEST_SCANLINE_PERIOD) * clamped,
  )
}

/**
 * Effect: dims every Nth row — the CRT raster. Pure: builds a new PixelBuffer, never touches the
 * input. See ADR 0005.
 *
 * Scales the surviving channels rather than blending toward black, so a dark row keeps its hue and
 * the raster reads as a gradient of the image underneath. Alpha is left alone: a scanline dims a
 * pixel, it does not punch a hole in it.
 */
export function scanlines(pixels: PixelBuffer, params: ScanlinesParams): PixelBuffer {
  const { width, height, data } = pixels
  const out = new Uint8ClampedArray(data)
  if (!params.enabled || params.intensity <= 0) {
    return { data: out, width, height }
  }

  const period = scanlinePeriod(params.density)
  const keep = 1 - Math.min(params.intensity, 1)

  for (let y = 0; y < height; y += period) {
    for (let x = 0; x < width; x++) {
      const offset = (y * width + x) * 4
      out[offset] = data[offset] * keep
      out[offset + 1] = data[offset + 1] * keep
      out[offset + 2] = data[offset + 2] * keep
    }
  }

  return { data: out, width, height }
}

const HASH_MIX = 0x45d9f3b

/**
 * Golden-ratio constant, displacing the hash's fixed point at zero — without it the first pixel
 * would draw a flat 0 and sit pinned to the strongest negative grain on every render.
 */
const HASH_DISPLACEMENT = 0x9e3779b9

const UINT32_MAX = 0xffffffff

/**
 * A perturbation in -range..range, drawn by hashing `key` rather than by `Math.random`, so Noise
 * stays a pure function of its input (ADR 0005) and the Pipeline keeps its promise that no
 * randomness is hidden — every draw here derives from the pixel's own position in the buffer.
 *
 * Signed and centred on zero, so grain darkens as often as it brightens and the image keeps its
 * overall exposure. Folds in the Seed once Block Displacement lands and the Pipeline gains one.
 */
function signedDraw(key: number, range: number): number {
  let hash = (key + HASH_DISPLACEMENT) | 0
  hash = Math.imul(hash ^ (hash >>> 16), HASH_MIX)
  hash = Math.imul(hash ^ (hash >>> 16), HASH_MIX)
  hash = hash ^ (hash >>> 16)
  return ((hash >>> 0) / UINT32_MAX) * 2 * range - range
}

/**
 * Effect: speckles the image with grain — the static lying over everything underneath. Pure:
 * builds a new PixelBuffer, never touches the input. See ADR 0005.
 *
 * Out-of-range grain clamps at black and white rather than wrapping — Uint8ClampedArray's own
 * behaviour, and the reason the darkest grain on a black pixel stays black instead of coming back
 * round as a bright speckle. Alpha is left alone: grain speckles a pixel, it does not punch a hole.
 */
export function noise(pixels: PixelBuffer, params: NoiseParams): PixelBuffer {
  const { width, height, data } = pixels
  const out = new Uint8ClampedArray(data)
  if (params.amount <= 0) {
    return { data: out, width, height }
  }

  const range = Math.min(params.amount, 1) * MAX_NOISE_DELTA
  const mono = params.tint === 'mono'

  for (let pixel = 0; pixel < width * height; pixel++) {
    const offset = pixel * 4
    // One draw for the whole pixel is what mono *is*: an equal move on every channel shifts
    // brightness and leaves hue where it was. Colour draws again per channel to break them apart.
    const shared = mono ? signedDraw(pixel, range) : 0

    for (let channel = 0; channel < 3; channel++) {
      const delta = mono ? shared : signedDraw(offset + channel, range)
      out[offset + channel] = data[offset + channel] + delta
    }
  }

  return { data: out, width, height }
}

/**
 * The fixed, canonical Effect order applied to produce the output — pure in GlitchSettings.
 * v1 carries Pixel Sort, Channel Shift, Scanlines and Noise; Block Displacement slots in ahead of
 * them in the order documented in CONTEXT.md (structural before surface).
 */
export function applyPipeline(pixels: PixelBuffer, settings: GlitchSettings): PixelBuffer {
  const sorted = pixelSort(pixels, settings.pixelSort)
  const shifted = channelShift(sorted, settings.channelShift)
  const rastered = scanlines(shifted, settings.scanlines)
  return noise(rastered, settings.noise)
}
