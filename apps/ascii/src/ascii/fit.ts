import { type AsciiCell, type FitRegion, MONOSPACE_CHAR_WIDTH_RATIO } from './types'

/**
 * Computes the centered "contain" sub-region of a cols × rows char grid that
 * preserves the Source's aspect ratio. The monospace cell is ~0.6 wide × 1 tall,
 * so the Source aspect is compared against the grid's *pixel* aspect, not its
 * col/row count. See ADR 0010.
 */
export function computeContainFit(
  srcW: number,
  srcH: number,
  cols: number,
  rows: number,
): FitRegion {
  // Degenerate Source (e.g. a video before metadata resolves) → fill the whole grid
  if (srcW <= 0 || srcH <= 0) {
    return { offsetX: 0, offsetY: 0, dCols: cols, dRows: rows }
  }

  const srcAspect = srcW / srcH
  // Full grid's pixel width in cell-width units — the non-square cell folded in once.
  const gridPixelWidth = cols * MONOSPACE_CHAR_WIDTH_RATIO
  const gridAspect = gridPixelWidth / rows

  let dCols: number
  let dRows: number
  if (srcAspect > gridAspect) {
    // Source is wider than the grid → bound by width, letterbox top/bottom
    dCols = cols
    dRows = Math.round(gridPixelWidth / srcAspect)
  } else {
    // Source is taller than the grid → bound by height, pillarbox left/right
    dRows = rows
    dCols = Math.round((rows * srcAspect) / MONOSPACE_CHAR_WIDTH_RATIO)
  }

  dCols = Math.max(1, Math.min(cols, dCols))
  dRows = Math.max(1, Math.min(rows, dRows))

  return {
    offsetX: Math.floor((cols - dCols) / 2),
    offsetY: Math.floor((rows - dRows) / 2),
    dCols,
    dRows,
  }
}

/**
 * Crops the cell grid down to just the fit region, dropping the void letterbox bands. PNG Export
 * keeps the framed canvas; the text Exports trim (ADR 0010).
 *
 * It crops the *cells*, upstream of `computeFrame()`, which is what puts TXT and HTML Export
 * downstream of one crop by construction — neither reads a grid the other did not.
 */
export function sliceToRegion(rows: AsciiCell[][], region: FitRegion): AsciiCell[][] {
  const { offsetX, offsetY, dCols, dRows } = region
  return rows.slice(offsetY, offsetY + dRows).map((line) => line.slice(offsetX, offsetX + dCols))
}
