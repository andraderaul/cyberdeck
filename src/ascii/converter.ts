import { type AsciiCell, CHARSET_MAPS, type Charset, type FitRegion } from './types'

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
 * @param region Contain-fit sub-region the Source is drawn into; cells outside it are void.
 *   Defaults to a full-grid fill. See ADR 0010.
 */
export function convertImage(
  ctx: CanvasRenderingContext2D,
  img: CanvasImageSource,
  cols: number,
  rows: number,
  options: { brightness: number; contrast: number; charset: Charset },
  region: FitRegion = { offsetX: 0, offsetY: 0, dCols: cols, dRows: rows },
): AsciiCell[][] {
  const { brightness, contrast, charset } = options
  const { offsetX, offsetY, dCols, dRows } = region

  ctx.drawImage(img, offsetX, offsetY, dCols, dRows)
  const data = ctx.getImageData(0, 0, cols, rows).data

  const result: AsciiCell[][] = []

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
      rowData.push({ char: getAsciiChar(adjusted, charset), r, g, b })
    }
    result.push(rowData)
  }

  return result
}
