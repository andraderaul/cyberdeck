import { charsetGlyphs } from './charset'
import {
  type AsciiCell,
  type Charset,
  type Dithering,
  type FitRegion,
  MONOSPACE_CHAR_WIDTH_RATIO,
} from './types'

/**
 * Shared across every masked cell — frozen so an accidental downstream mutation
 * can't leak through the aliasing. computeFrame only ever reads cells.
 */
const VOID_CELL: AsciiCell = Object.freeze({ char: ' ', r: 0, g: 0, b: 0 })

const BT601_RED_LUMA_WEIGHT = 0.299
const BT601_GREEN_LUMA_WEIGHT = 0.587
const BT601_BLUE_LUMA_WEIGHT = 0.114

export function computeLuminosity(r: number, g: number, b: number): number {
  return (
    (BT601_RED_LUMA_WEIGHT * r + BT601_GREEN_LUMA_WEIGHT * g + BT601_BLUE_LUMA_WEIGHT * b) / 255
  )
}

/**
 * The bucket a luminosity falls in — the whole of the Charset mapping, factored out so the
 * Dithering pass can ask which bucket a cell *would* take and how far short of it the cell fell.
 * A floor, not a round: it is the mapping every conversion the deck has ever shipped used, and
 * changing it would restyle every one of them.
 */
function charIndex(brightness: number, mapLength: number): number {
  const clamped = Math.max(0, Math.min(255, brightness))
  return Math.floor((clamped / 255) * (mapLength - 1))
}

// Takes the resolved glyphs, not the Charset: splitting a ramp is per-conversion work and this runs
// per cell. `getAsciiChar` is the same mapping said in the domain's own words.
function glyphAt(brightness: number, glyphs: string[]): string {
  return glyphs[charIndex(brightness, glyphs.length)]
}

export function getAsciiChar(brightness: number, charset: Charset): string {
  return glyphAt(brightness, charsetGlyphs(charset))
}

/**
 * Luminosity levels one Charset bucket spans. The Dithering amplitude: a cell may be pushed by
 * up to one bucket and no further, which is what keeps the pass a *reordering* of the ramp's own
 * levels rather than added noise.
 */
function bucketWidth(glyphs: string[]): number {
  return 255 / (glyphs.length - 1)
}

/**
 * The 4x4 ordered matrix, in its recursive Bayer order — each entry is that cell's rank in the
 * turn-taking, so the 16 cells of a tile cross the same bucket boundary at 16 evenly spaced
 * levels. Held at 4x4 rather than 8x8 because the tile is measured in *characters*: at the
 * Resolutions this program renders at, an 8x8 tile is a visible plaid across the picture where a
 * 4x4 one reads as texture.
 */
const BAYER_MATRIX = [
  [0, 8, 2, 10],
  [12, 4, 14, 6],
  [3, 11, 1, 9],
  [15, 7, 13, 5],
]
const BAYER_ORDER = BAYER_MATRIX.length
const BAYER_RANKS = BAYER_ORDER * BAYER_ORDER

/**
 * Floyd–Steinberg's weights: the fraction of a cell's quantisation error each unvisited neighbour
 * takes, over a left-to-right raster. Sixteenths, and they sum to one — the error is *moved*, never
 * created, which is what makes the pass preserve the picture's average level rather than lighten it.
 */
const FLOYD_DIFFUSION = [
  { dCol: 1, dRow: 0, weight: 7 / 16 },
  { dCol: -1, dRow: 1, weight: 3 / 16 },
  { dCol: 0, dRow: 1, weight: 5 / 16 },
  { dCol: 1, dRow: 1, weight: 1 / 16 },
]

/**
 * The Dithering pass: returns a new luminosity grid whose cells, once bucketed, spend neighbouring
 * characters in the proportion the original levels sat between them — so a coarse Charset carries a
 * gradient it would otherwise posterize into bands.
 *
 * Pure over the grid, which is the contract that matters (ADR 0005) — `floyd` is order-dependent
 * *inside* the pass because it hands each cell's quantisation error to neighbours that have not
 * been visited yet, and that dependence is exactly why the pass is a grid transform and not a
 * per-cell function the sampling loop could call.
 *
 * The pass is confined to the fit region, never the grid — the loop bounds keep the void bands from
 * seeding it and the neighbour guard keeps its error from landing in them (ADR 0010). Neither half
 * shows up on its own, because a void cell reads 0 and quantises with no error to pass on; together
 * they are what makes a letterboxed Source dither exactly as the same Source does at full bleed,
 * which is the property the tests hold.
 */
function ditherLuma(
  luma: number[],
  cols: number,
  region: FitRegion,
  glyphs: string[],
  dithering: Exclude<Dithering, 'none'>,
): number[] {
  const { offsetX, offsetY, dCols, dRows } = region
  const step = bucketWidth(glyphs)
  const out = luma.slice()

  if (dithering === 'bayer') {
    // The tile's phase is taken from the absolute grid position, not from the fit region's origin,
    // so a Source whose letterbox bands change width — a resize, a camera switch — lands on a
    // different phase and its pattern shifts by a cell or two. Deliberate: phase relative to the
    // region would instead move the pattern across the *picture* every time the bands moved, and
    // an absolute tile is the one that stays put under the thing being drawn. It does mean bayer
    // is the one Dithering whose output is not invariant to the letterbox, and a test says so.
    //
    // The offset spans a whole bucket and is entirely *positive*, which reads like a brightening
    // and is really the correction for `charIndex` flooring: a cell three quarters of the way up
    // its bucket has to take the next character on twelve of the tile's sixteen turns for the
    // tile's average to come back out where the cell actually sat. Recentre the offset on zero and
    // every picture drops half a bucket against `none`.
    for (let row = offsetY; row < offsetY + dRows; row++) {
      for (let col = offsetX; col < offsetX + dCols; col++) {
        const rank = BAYER_MATRIX[row % BAYER_ORDER][col % BAYER_ORDER]
        out[row * cols + col] += (step * (rank + 0.5)) / BAYER_RANKS
      }
    }
    return out
  }

  const mapLength = glyphs.length
  for (let row = offsetY; row < offsetY + dRows; row++) {
    for (let col = offsetX; col < offsetX + dCols; col++) {
      const index = row * cols + col
      // Error against the bucket's *floor*, matching `charIndex`: the character drawn stands for
      // the level the bucket starts at, so that is the level the cell actually spent. It keeps the
      // error in [0, step) — one-sided, and bounded, so the diffusion can never run away.
      //
      // The value at visit time is final for this cell — only cells still ahead take inflow — so
      // the working grid *is* the answer and needs no second copy.
      const error = out[index] - charIndex(out[index], mapLength) * step
      for (const { dCol, dRow, weight } of FLOYD_DIFFUSION) {
        const neighbourCol = col + dCol
        const neighbourRow = row + dRow
        if (
          neighbourCol < offsetX ||
          neighbourCol >= offsetX + dCols ||
          neighbourRow >= offsetY + dRows
        ) {
          continue
        }
        out[neighbourRow * cols + neighbourCol] += error * weight
      }
    }
  }
  return out
}

function applyBrightnessContrast(value: number, brightness: number, contrast: number): number {
  let v = value / 255
  v = (v - 0.5) * contrast + 0.5
  v = v * brightness
  return Math.max(0, Math.min(255, Math.round(v * 255)))
}

/**
 * The Edge Glyph set, indexed by the gradient angle folded into [0°, 180°) and rounded to the
 * nearest 45° — the glyph drawn is the contour's *tangent*, perpendicular to the gradient that
 * found it.
 *
 * Four marks and no fifth. Each of these already *is* the stroke it stands for, in any Charset and
 * at any Resolution, which is what lets a contour read as a line instead of as texture; a set that
 * grew past the four would start naming angles the eye can't separate in one character cell. A
 * junction mark (`+`) is the one that keeps getting proposed and it stays out for a harder reason:
 * a single gradient has exactly one angle and can never name a crossing, so nothing in this pass
 * could ever earn it. The fallback is the Charset itself — below the magnitude threshold the cell
 * keeps its luminosity glyph, so shape is spent on contours and the ramp still carries every
 * surface.
 */
const EDGE_GLYPHS = ['|', '/', '-', '\\'] as const

/**
 * The response one axis of the kernel gives a 0→255 step, read through its 1 + 2 + 1 flank. A
 * reference step, deliberately not a ceiling: a diagonal contour drives both axes at once, so the
 * ratio below reaches √2 at a corner. Naming it a maximum would be a lie the threshold then reads.
 */
const SOBEL_AXIS_STEP = 4 * 255

/**
 * How much of that reference step a cell's gradient must reach to take an Edge Glyph — the
 * equivalent of a ~64-level jump between neighbouring cells. Set well above what a photographic
 * ramp produces, so a Source's shading stays on the luminosity mapping and only a contour the eye
 * would also call a line crosses it.
 */
const EDGE_MAGNITUDE_THRESHOLD = 0.25

const DEGREES_PER_GLYPH = 180 / EDGE_GLYPHS.length

/**
 * Sobel over the sampled grid — the Source's pixels are already behind us (ADR 0005), so the pass
 * reads AsciiCell luminance and nothing else.
 *
 * Neighbours are clamped into the fit region rather than to the grid: a Source that letterboxes
 * would otherwise read its own void band as a hard contour and get framed in strokes (ADR 0010).
 *
 * @returns the directional glyph, or `null` where the gradient is too weak to displace the
 *   Charset's luminosity glyph.
 */
function edgeGlyphAt(
  luma: number[],
  cols: number,
  region: FitRegion,
  col: number,
  row: number,
): string | null {
  const { offsetX, offsetY, dCols, dRows } = region
  const at = (c: number, r: number) => {
    const clampedCol = Math.min(Math.max(c, offsetX), offsetX + dCols - 1)
    const clampedRow = Math.min(Math.max(r, offsetY), offsetY + dRows - 1)
    return luma[clampedRow * cols + clampedCol]
  }

  const topLeft = at(col - 1, row - 1)
  const top = at(col, row - 1)
  const topRight = at(col + 1, row - 1)
  const left = at(col - 1, row)
  const right = at(col + 1, row)
  const bottomLeft = at(col - 1, row + 1)
  const bottom = at(col, row + 1)
  const bottomRight = at(col + 1, row + 1)

  const gx = topRight + 2 * right + bottomRight - (topLeft + 2 * left + bottomLeft)
  const gy = bottomLeft + 2 * bottom + bottomRight - (topLeft + 2 * top + topRight)

  // Magnitude stays in the sampled grid, where the kernel is isotropic: a step of N levels is the
  // same contour whichever way it runs, so the threshold can't prefer one orientation.
  if (Math.hypot(gx, gy) / SOBEL_AXIS_STEP < EDGE_MAGNITUDE_THRESHOLD) {
    return null
  }

  // The angle, unlike the magnitude, is asked about the *rendered* picture: a cell is
  // MONOSPACE_CHAR_WIDTH_RATIO as wide as it is tall, so one step across is 0.6 of a step down on
  // screen and the horizontal component has to be divided back out. Left in grid space the bins
  // land near 55° and 125° instead of 45° and 135°, and every diagonal a user draws reads steep.
  const gxOnScreen = gx / MONOSPACE_CHAR_WIDTH_RATIO

  // A gradient and its opposite describe the same line, so the angle folds into a half-turn
  // before it picks a glyph — a light-on-dark contour and its dark-on-light twin draw alike.
  const degrees = ((((Math.atan2(gy, gxOnScreen) * 180) / Math.PI) % 180) + 180) % 180
  return EDGE_GLYPHS[Math.round(degrees / DEGREES_PER_GLYPH) % EDGE_GLYPHS.length]
}

/**
 * @param options.edgeGlyphs Opt-in second axis: where the local gradient is strong, the cell takes
 *   a directional glyph instead of its luminosity one. Off is the shape of every conversion that
 *   predates it, and `ConversionSettings` is the one place that default is written down.
 * @param options.dithering Trades a bucket boundary for a pattern before the Charset buckets a
 *   cell, so a coarse Charset carries a gradient instead of banding it. `none` is the conversion
 *   that predates the pass, character for character.
 * @param region Contain-fit sub-region the Source is drawn into; cells outside it are void.
 *   Defaults to a full-grid fill. See ADR 0010.
 * @param isMirrored Flips the Source on this sampling draw, *before* any pixel is read into a
 *   cell (ADR 0016) — so the preview, the PNG and the TXT rows all carry the same flip. The
 *   transform is about the fit region, which keeps a letterboxed Source inside its own bands.
 */
export function convertImage(
  ctx: CanvasRenderingContext2D,
  img: CanvasImageSource,
  cols: number,
  rows: number,
  options: {
    brightness: number
    contrast: number
    charset: Charset
    edgeGlyphs: boolean
    dithering: Dithering
  },
  region: FitRegion = { offsetX: 0, offsetY: 0, dCols: cols, dRows: rows },
  isMirrored = false,
): AsciiCell[][] {
  const { brightness, contrast, charset, edgeGlyphs, dithering } = options
  const { offsetX, offsetY, dCols, dRows } = region
  const glyphs = charsetGlyphs(charset)

  // The sampling canvas (ADR 0001) outlives a single conversion and drawImage composites
  // source-over, so a Source with an alpha channel would blend onto whatever the previous render
  // left there — cells that depend on how many renders came before. The caller's resize is not
  // the clear: assigning the width a value it already has is a no-op, which is every frame of a
  // Live Source. It has to stay ahead of the flip, which is taken about the *fit region* — moved
  // inside the save it would clear the wrong span for a letterboxed Source. The whole grid rather
  // than the region because the region moves between renders: a smaller one next time would leave
  // this render's pixels sitting outside it. See ADR 0001 for why clearRect and not a 'copy'
  // composite or a resize.
  ctx.clearRect(0, 0, cols, rows)

  if (isMirrored) {
    ctx.save()
    ctx.translate(2 * offsetX + dCols, 0)
    ctx.scale(-1, 1)
    ctx.drawImage(img, offsetX, offsetY, dCols, dRows)
    ctx.restore()
  } else {
    ctx.drawImage(img, offsetX, offsetY, dCols, dRows)
  }
  const data = ctx.getImageData(0, 0, cols, rows).data

  const result: AsciiCell[][] = []
  // Both passes below read more than the cell in front of them — the gradient a whole
  // neighbourhood, the Dithering the cells it has already spent — so the adjusted luminance is
  // kept as its own grid: brightness and contrast are already folded in, which is what makes the
  // two sliders move the contours and the pattern the same way they move the ramp. Allocated only
  // for a conversion that asked for one of them — the Live Source loop runs this ~15 times a
  // second with both off (ADR 0002).
  const needsLuma = edgeGlyphs || dithering !== 'none'
  const luma: number[] | null = needsLuma ? new Array(cols * rows).fill(0) : null

  for (let row = 0; row < rows; row++) {
    const rowData: AsciiCell[] = []
    const inRegionRow = row >= offsetY && row < offsetY + dRows
    for (let col = 0; col < cols; col++) {
      // Cells outside the fit region are void — they never touch the luminance
      // pipeline, so they stay empty at any brightness/contrast (ADR 0010).
      if (!inRegionRow || col < offsetX || col >= offsetX + dCols) {
        rowData.push(VOID_CELL)
        continue
      }
      const i = (row * cols + col) * 4
      const r = data[i]
      const g = data[i + 1]
      const b = data[i + 2]
      const lum = computeLuminosity(r, g, b) * 255
      const adjusted = applyBrightnessContrast(lum, brightness, contrast)
      if (luma) {
        luma[row * cols + col] = adjusted
      }
      rowData.push({ char: glyphAt(adjusted, glyphs), r, g, b })
    }
    result.push(rowData)
  }

  if (!luma) {
    return result
  }

  // Dithering first, Edge Glyphs second, and the gradient reads `luma` — the *undithered* grid —
  // because both passes read the same sampled cells and only one of them may see the other's work.
  // Sobel asks whether neighbouring cells differ sharply and a Dithering's whole job is to *make*
  // neighbouring cells differ, by up to a bucket, everywhere the picture is smooth.
  //
  // How much that costs depends on the algorithm, and the honest answer is not the same for both.
  // Bayer's tile is too small a swing to reach the magnitude threshold in any Charset — measured,
  // the most it can drive the kernel to is ~71 of the 255 a contour needs, in `binary`, the
  // coarsest ramp there is. Floyd–Steinberg is a different matter: its error runs along a row and
  // accumulates, and fed to the gradient it turns a *flat* field into two dozen contours that are
  // not in the Source at all. So the order is load-bearing for one of the two today and free for
  // the other, and it is written down as the rule for both — the threshold is a tuned constant and
  // bayer's headroom is not a guarantee anybody should have to re-derive.
  //
  // Where the gradient does find a contour, its stroke replaces whatever character the Dithering
  // chose: the shape axis stays the outer one, as it was before this pass existed.
  if (dithering !== 'none') {
    const dithered = ditherLuma(luma, cols, region, glyphs, dithering)
    for (let row = offsetY; row < offsetY + dRows; row++) {
      for (let col = offsetX; col < offsetX + dCols; col++) {
        const char = glyphAt(dithered[row * cols + col], glyphs)
        result[row][col] = { ...result[row][col], char }
      }
    }
  }

  if (!edgeGlyphs) {
    return result
  }

  // The second axis lands in the AsciiCell grid, not at paint time: every consumer downstream —
  // the preview, the PNG Export, the TXT Export and the HTML Export — reads this one grid, so all
  // four carry the shape without knowing it exists. The same is true of the Dithering above.
  for (let row = offsetY; row < offsetY + dRows; row++) {
    for (let col = offsetX; col < offsetX + dCols; col++) {
      const glyph = edgeGlyphAt(luma, cols, region, col, row)
      if (glyph) {
        result[row][col] = { ...result[row][col], char: glyph }
      }
    }
  }

  return result
}
