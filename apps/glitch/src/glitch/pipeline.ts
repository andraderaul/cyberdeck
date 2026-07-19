import { createRng } from './rng'
import {
  type BlockDisplacementParams,
  CHANNEL_OFFSET,
  type ChannelShiftParams,
  type ChromaticAberrationParams,
  MAX_BLOCK_HEIGHT_RATIO,
  MAX_BLOCK_SHIFT_RATIO,
  MAX_CHROMATIC_ABERRATION_MAGNIFICATION,
  MAX_DISPLACEMENT_BLOCKS,
  MAX_NOISE_DELTA,
  MIN_BLOCK_WIDTH_RATIO,
  type NoiseParams,
  type PixelBuffer,
  type PixelSortParams,
  type ScanlinesParams,
  type Seed,
  SPARSEST_SCANLINE_PERIOD,
  TIGHTEST_SCANLINE_PERIOD,
} from './types'

/** Normalises a param that rides the 0..1 scale, so a value off the end lands on the curated end. */
function clampUnit(value: number): number {
  return Math.min(Math.max(value, 0), 1)
}

/**
 * Effect: shifts rectangular blocks horizontally — the data-corruption tear. Pure given a Seed:
 * every block's size, position and travel is drawn from the Seed's own stream, so the same Seed
 * reproduces the arrangement exactly and a new one rolls a fresh arrangement of the same look
 * (ADR 0005).
 *
 * A block reads through the source it was handed, not the buffer being written, so two overlapping
 * blocks each tear the original image. Letting the second sample the first would compound the tears
 * into mush, and would make a block's look depend on how many earlier blocks happened to land on it.
 */
export function blockDisplacement(
  pixels: PixelBuffer,
  params: BlockDisplacementParams,
  seed: Seed,
): PixelBuffer {
  const { width, height, data } = pixels
  const out = new Uint8ClampedArray(data)
  if (params.density <= 0 || params.amount <= 0) {
    return { data: out, width, height }
  }

  const rng = createRng(seed)
  const blocks = Math.round(clampUnit(params.density) * MAX_DISPLACEMENT_BLOCKS)
  const farthest = clampUnit(params.amount) * MAX_BLOCK_SHIFT_RATIO * width
  const tallest = Math.max(1, Math.round(height * MAX_BLOCK_HEIGHT_RATIO))
  const narrowest = Math.max(1, Math.round(width * MIN_BLOCK_WIDTH_RATIO))

  for (let block = 0; block < blocks; block++) {
    const blockHeight = 1 + Math.floor(rng() * tallest)
    const top = Math.floor(rng() * (height - blockHeight + 1))
    const blockWidth = narrowest + Math.floor(rng() * (width - narrowest + 1))
    const left = Math.floor(rng() * (width - blockWidth + 1))
    const shift = Math.round((rng() * 2 - 1) * farthest)

    for (let y = top; y < top + blockHeight; y++) {
      for (let x = left; x < left + blockWidth; x++) {
        // Wraps around the row rather than clamping at the edge the way Channel Shift does: a
        // clamped block fills with repeats of its edge column, which reads as a stretch smear.
        // A wrapped block pulls in the far side of the row — the row's data re-cut, which is the
        // tear this Effect is after.
        const sourceX = (((x - shift) % width) + width) % width
        const from = (y * width + sourceX) * 4
        const to = (y * width + x) * 4
        out[to] = data[from]
        out[to + 1] = data[from + 1]
        out[to + 2] = data[from + 2]
        out[to + 3] = data[from + 3]
      }
    }
  }

  return { data: out, width, height }
}

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

/**
 * One channel read at a fractional position, blended from the four pixels around it.
 *
 * Bilinear rather than nearest-neighbour specifically because Chromatic Aberration's displacement
 * is well under a pixel near the centre — exactly where rounding would collapse it to zero and then
 * snap into a visible stair-step ring instead of the smooth centre-to-edge gradient the
 * magnification model exists to produce.
 *
 * Reads clamp at the edges, matching `channelShift`: a wrapped sample would drag the far side's
 * colour into the corner, which reads as a bug instead of a lens.
 */
function sampleBilinear(
  data: Uint8ClampedArray<ArrayBuffer>,
  width: number,
  height: number,
  x: number,
  y: number,
  channel: number,
): number {
  const clampedX = Math.min(Math.max(x, 0), width - 1)
  const clampedY = Math.min(Math.max(y, 0), height - 1)

  const left = Math.floor(clampedX)
  const top = Math.floor(clampedY)
  const right = Math.min(left + 1, width - 1)
  const bottom = Math.min(top + 1, height - 1)
  const fractionX = clampedX - left
  const fractionY = clampedY - top

  const topLeft = data[(top * width + left) * 4 + channel]
  const topRight = data[(top * width + right) * 4 + channel]
  const bottomLeft = data[(bottom * width + left) * 4 + channel]
  const bottomRight = data[(bottom * width + right) * 4 + channel]

  const above = topLeft + (topRight - topLeft) * fractionX
  const below = bottomLeft + (bottomRight - bottomLeft) * fractionX
  return above + (below - above) * fractionY
}

/**
 * Effect: magnifies each colour channel by a slightly different scale about the image centre — the
 * radial "lens fringe". Pure: builds a new PixelBuffer, never touches the input. See ADR 0005.
 *
 * Distinct from `channelShift`, and deliberately so: Channel Shift's displacement is a constant
 * vector, so it fringes the centre as hard as the corners. Here displacement *grows with radius* —
 * zero in the middle, widest at the corners — which is the whole reason the two are separate
 * Effects rather than two modes of one (issue #116).
 *
 * R is sampled at scale `1 + k`, G at `1` (a straight copy), B at `1 - k`. Because the sample runs
 * *inverse* — an output pixel reads the source at its own offset divided by the scale — magnifying
 * R pulls its sample toward the centre while B's runs outward, splitting them apart by a distance
 * proportional to the pixel's own radius. Alpha is left alone: a fringe tints a pixel, it does not
 * punch a hole in it.
 */
export function chromaticAberration(
  pixels: PixelBuffer,
  params: ChromaticAberrationParams,
): PixelBuffer {
  const { width, height, data } = pixels
  const out = new Uint8ClampedArray(data)
  if (params.strength <= 0) {
    return { data: out, width, height }
  }

  const k = clampUnit(params.strength) * MAX_CHROMATIC_ABERRATION_MAGNIFICATION
  const centerX = (width - 1) / 2
  const centerY = (height - 1) / 2
  // G rides scale 1, and `out` already carries it from the copy above — so the loop writes only
  // R and B, and G's "straight copy" costs no work.
  const redScale = 1 + k
  const blueScale = 1 - k

  for (let y = 0; y < height; y++) {
    const offsetY = y - centerY
    for (let x = 0; x < width; x++) {
      const offsetX = x - centerX
      const target = (y * width + x) * 4

      out[target] = sampleBilinear(
        data,
        width,
        height,
        centerX + offsetX / redScale,
        centerY + offsetY / redScale,
        CHANNEL_OFFSET.r,
      )
      out[target + 2] = sampleBilinear(
        data,
        width,
        height,
        centerX + offsetX / blueScale,
        centerY + offsetY / blueScale,
        CHANNEL_OFFSET.b,
      )
    }
  }

  return { data: out, width, height }
}

/** Maps normalised density onto the pixel period between dark rows — inverted, so 1 is tightest. */
function scanlinePeriod(density: number): number {
  const clamped = clampUnit(density)
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
  if (params.intensity <= 0) {
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
 * randomness is hidden — every draw here derives from the pixel's own position and the Seed.
 *
 * Positional rather than streamed from the Seed's rng, so the grain on a pixel depends on where it
 * sits and not on how many draws the Effects before it happened to make.
 *
 * Signed and centred on zero, so grain darkens as often as it brightens and the image keeps its
 * overall exposure.
 */
function signedDraw(key: number, seed: Seed, range: number): number {
  let hash = ((key + HASH_DISPLACEMENT) | 0) ^ seed
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
export function noise(pixels: PixelBuffer, params: NoiseParams, seed: Seed): PixelBuffer {
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
    const shared = mono ? signedDraw(pixel, seed, range) : 0

    for (let channel = 0; channel < 3; channel++) {
      const delta = mono ? shared : signedDraw(offset + channel, seed, range)
      out[offset + channel] = data[offset + channel] + delta
    }
  }

  return { data: out, width, height }
}
