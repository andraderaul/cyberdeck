import {
  type AsciiCell,
  CHARSET_MAPS,
  type Charset,
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

export function getAsciiChar(brightness: number, charset: Charset): string {
  const map = CHARSET_MAPS[charset]
  const clamped = Math.max(0, Math.min(255, brightness))
  const index = Math.floor((clamped / 255) * (map.length - 1))
  return map[index]
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
  options: { brightness: number; contrast: number; charset: Charset; edgeGlyphs: boolean },
  region: FitRegion = { offsetX: 0, offsetY: 0, dCols: cols, dRows: rows },
  isMirrored = false,
): AsciiCell[][] {
  const { brightness, contrast, charset, edgeGlyphs } = options
  const { offsetX, offsetY, dCols, dRows } = region

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
  // The gradient pass reads a whole neighbourhood, so the adjusted luminance is kept as its own
  // grid: brightness and contrast are already folded in, which is what makes the two sliders move
  // the contours the same way they move the ramp. Allocated only for a conversion that asked for
  // the axis — the Live Source loop runs this ~15 times a second with it off (ADR 0002).
  const luma: number[] | null = edgeGlyphs ? new Array(cols * rows).fill(0) : null

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
      rowData.push({ char: getAsciiChar(adjusted, charset), r, g, b })
    }
    result.push(rowData)
  }

  if (!luma) {
    return result
  }

  // The second axis lands in the AsciiCell grid, not at paint time: every consumer downstream —
  // the preview, the PNG Export and the TXT Export — reads this one grid, so all three carry the
  // shape without knowing it exists.
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
