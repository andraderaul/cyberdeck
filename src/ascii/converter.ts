import { type AsciiCell, CHARSET_MAPS, type Charset } from './types'

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

export function convertImage(
  ctx: CanvasRenderingContext2D,
  img: CanvasImageSource,
  cols: number,
  rows: number,
  options: { brightness: number; contrast: number; charset: Charset },
): AsciiCell[][] {
  const { brightness, contrast, charset } = options

  ctx.drawImage(img, 0, 0, cols, rows)
  const data = ctx.getImageData(0, 0, cols, rows).data

  const result: AsciiCell[][] = []

  for (let row = 0; row < rows; row++) {
    const rowData: AsciiCell[] = []
    for (let col = 0; col < cols; col++) {
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
