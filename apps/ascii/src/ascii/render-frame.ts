import { convertImage } from './converter'
import { computeContainFit, sliceToRegion } from './fit'
import { computeFrame, paintFrame, type RenderInstruction } from './renderer'
import { type ConversionSettings, MONOSPACE_CHAR_WIDTH_RATIO } from './types'

/**
 * Intrinsic pixel dimensions of the Source, by type. Used to preserve its
 * aspect ratio when fitting into the char grid (ADR 0010).
 */
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

/**
 * The char grid a canvas of this size holds at this Resolution — both floored, because a partial
 * cell has no character to put in it.
 *
 * Exported rather than inlined because the Preset thumbnails need the *cost* of a conversion before
 * they run one per Preset, and a second copy of this arithmetic could drift into reporting a price
 * the pipeline does not charge.
 */
export function gridSize(
  width: number,
  height: number,
  resolution: number,
): { cols: number; rows: number } {
  return {
    cols: Math.floor(width / (resolution * MONOSPACE_CHAR_WIDTH_RATIO)),
    rows: Math.floor(height / resolution),
  }
}

/**
 * The mono stack `renderFrame` paints in, read off the deck's token.
 *
 * Both callers want the same one: the canvas, and the Preset thumbnails that advertise it. A
 * thumbnail drawn in a different family would report glyph metrics the canvas does not have.
 */
export function monoFontFamily(): string {
  return getComputedStyle(document.body).getPropertyValue('--font-mono').trim() || 'monospace'
}

/**
 * Mirror flips the Source on the sampling draw, *before* the pixels become cells (ADR 0016) —
 * not with a CSS transform on the visible canvas, which mirrored the preview alone and left both
 * Exports disagreeing with it. The character grid is genuinely mirrored, so every Export follows.
 *
 * @param onConverted receives the region-cropped result both text Exports read: the plain rows for
 *   TXT Export, and the same grid as RenderInstructions — character *and* colour — for HTML Export.
 * @returns `false` when the render was skipped — no 2D context, or the canvas is too
 *   small to fit a single character. `true` when a frame was painted.
 */
export function renderFrame(
  source: CanvasImageSource,
  canvasEl: HTMLCanvasElement,
  hiddenEl: HTMLCanvasElement,
  settings: ConversionSettings,
  fontFamily: string,
  onConverted?: (rows: string[], instructions: RenderInstruction[]) => void,
  isMirrored = false,
): boolean {
  const ctx = canvasEl.getContext('2d')
  const hiddenCtx = hiddenEl.getContext('2d')
  if (!ctx || !hiddenCtx) {
    return false
  }

  const { resolution, brightness, contrast, charset, edgeGlyphs, dithering } = settings
  const { cols, rows } = gridSize(canvasEl.width, canvasEl.height, resolution)

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
    { brightness, contrast, charset, edgeGlyphs, dithering },
    region,
    isMirrored,
  )
  const { instructions } = computeFrame(cells, settings)
  paintFrame(ctx, instructions, resolution, fontFamily)

  if (onConverted) {
    // PNG keeps the framed canvas (painted above); the text Exports get the region cropped tight,
    // with no letterbox padding (ADR 0010). Recomputing over the cropped cells rather than slicing
    // the instructions is what rebases each x/y onto the cropped grid's own origin — a sliced
    // instruction would carry a coordinate the exported document no longer has a cell for.
    const cropped = computeFrame(sliceToRegion(cells, region), settings)
    onConverted(cropped.asciiRows, cropped.instructions)
  }
  return true
}
