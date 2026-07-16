import { convertImage } from './converter'
import { computeContainFit, sliceToRegion } from './fit'
import { computeFrame, MONOSPACE_CHAR_WIDTH_RATIO, paintFrame } from './renderer'
import type { ConversionSettings } from './types'

// Intrinsic pixel dimensions of the Source, by type. Used to preserve its
// aspect ratio when fitting into the char grid (ADR 0010).
function sourceDimensions(source: CanvasImageSource): { w: number; h: number } {
  if (typeof HTMLVideoElement !== 'undefined' && source instanceof HTMLVideoElement) {
    return { w: source.videoWidth, h: source.videoHeight }
  }
  if (typeof HTMLImageElement !== 'undefined' && source instanceof HTMLImageElement) {
    return { w: source.naturalWidth, h: source.naturalHeight }
  }
  // HTMLCanvasElement (resized Source Image), ImageBitmap, OffscreenCanvas…
  const sized = source as { width?: number; height?: number }
  return { w: sized.width ?? 0, h: sized.height ?? 0 }
}

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

  const { w: srcW, h: srcH } = sourceDimensions(source)
  const region = computeContainFit(srcW, srcH, cols, rows)

  const cells = convertImage(
    hiddenCtx,
    source,
    cols,
    rows,
    { brightness, contrast, charset },
    region,
  )
  const { instructions, asciiRows } = computeFrame(cells, settings)
  paintFrame(ctx, instructions, resolution, fontFamily)
  // PNG keeps the framed canvas (painted above); TXT Export gets the region
  // cropped tight, with no letterbox padding. See ADR 0010.
  onConverted?.(sliceToRegion(asciiRows, region))
  return true
}
