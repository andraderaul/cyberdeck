import { convertImage } from './converter'
import { computeFrame, MONOSPACE_CHAR_WIDTH_RATIO, paintFrame } from './renderer'
import type { ConversionSettings } from './types'

export function renderFrame(
  source: CanvasImageSource,
  canvasEl: HTMLCanvasElement,
  hiddenEl: HTMLCanvasElement,
  settings: ConversionSettings,
  fontFamily: string,
  onConverted?: (rows: string[]) => void,
): boolean {
  const ctx = canvasEl.getContext('2d')
  const hiddenCtx = hiddenEl.getContext('2d')
  if (!ctx || !hiddenCtx) {
    return false
  }

  const { resolution, brightness, contrast, charset } = settings
  const charW = resolution * MONOSPACE_CHAR_WIDTH_RATIO
  const charH = resolution
  const cols = Math.floor(canvasEl.width / charW)
  const rows = Math.floor(canvasEl.height / charH)

  if (cols < 1 || rows < 1) {
    return false
  }

  hiddenEl.width = cols
  hiddenEl.height = rows

  const cells = convertImage(hiddenCtx, source, cols, rows, { brightness, contrast, charset })
  const { instructions, asciiRows } = computeFrame(cells, settings)
  paintFrame(ctx, instructions, resolution, fontFamily)
  onConverted?.(asciiRows)
  return true
}
