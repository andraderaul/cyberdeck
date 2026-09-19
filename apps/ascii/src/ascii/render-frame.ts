import { sampleSource } from './converter'
import { computeContainFit } from './fit'
import type { AsciiFrameRunner } from './frame-runner'
import type { PackedFrame } from './packed-frame'
import { paintFrame } from './renderer'
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
 * What became of one frame.
 *
 * `dropped` is not a failure: it is the runner saying this frame has no cells coming — either a
 * newer frame took its place, or the Worker died holding its pixels (`frame-runner.ts`). A Live
 * Source ignores it, since the next tick brings a fresher frame anyway; a Source Image, which has
 * no next tick, asks again.
 */
export type AsciiFrameOutcome = 'painted' | 'dropped' | 'skipped'

/**
 * Impure: the shell around the pure core. Sizes the hidden sampling canvas (ADR 0001), draws the
 * Source onto it, hands the pixels to the runner, and paints what comes back. It is the only place
 * the DOM and the pure core meet (ADR 0005).
 *
 * The conversion itself runs on a Worker thread (ADR 0002), which is why this is async. `sampleSource`
 * and `paintFrame` stay here: the hidden canvas is a DOM object, and `paintFrame` is the single
 * point that writes to the visible one. Only `convertImage` and `computeFrame` cross, and the
 * sampled buffer crosses with them by transfer — so nothing here may read it after handing it over.
 *
 * Mirror flips the Source on the sampling draw, *before* the pixels become cells (ADR 0016) —
 * not with a CSS transform on the visible canvas, which mirrored the preview alone and left both
 * Exports disagreeing with it. The character grid is genuinely mirrored, so every Export follows.
 *
 * The sampling happens before the runner is asked, even when the runner is busy and will drop the
 * frame. That is deliberate: a fresh sample replaces the one waiting its turn, so what eventually
 * runs is the newest frame rather than the oldest queued one (`frame-runner.ts`).
 *
 * @param onConverted receives the region-cropped frame both text Exports read — the characters TXT
 *   Export writes and the colours HTML Export puts on them, as the packed arrays that came back.
 * @returns `skipped` when there was nothing to render — no 2D context, or a canvas too small to fit
 *   a single character; `dropped` when the frame has no cells coming; `painted` when the canvas was
 *   written.
 */
export async function renderFrame(
  source: CanvasImageSource,
  canvasEl: HTMLCanvasElement,
  hiddenEl: HTMLCanvasElement,
  settings: ConversionSettings,
  fontFamily: string,
  runner: AsciiFrameRunner,
  onConverted?: (cropped: PackedFrame) => void,
  isMirrored = false,
): Promise<AsciiFrameOutcome> {
  const ctx = canvasEl.getContext('2d')
  const hiddenCtx = hiddenEl.getContext('2d')
  if (!ctx || !hiddenCtx) {
    return 'skipped'
  }

  const { resolution } = settings
  const { cols, rows } = gridSize(canvasEl.width, canvasEl.height, resolution)

  if (cols < 1 || rows < 1) {
    return 'skipped'
  }

  hiddenEl.width = cols
  hiddenEl.height = rows

  const { w: srcW, h: srcH } = sourceDimensions(source)
  const region = computeContainFit(srcW, srcH, cols, rows)

  const pixels = sampleSource(hiddenCtx, source, cols, rows, region, isMirrored)
  const result = await runner.run({ pixels, cols, rows, settings, region, cropped: !!onConverted })
  if (result === null) {
    return 'dropped'
  }

  paintFrame(ctx, result.frame, resolution, fontFamily)

  // PNG keeps the framed canvas (painted above); the text Exports get the region cropped tight,
  // with no letterbox padding (ADR 0010).
  if (onConverted && result.cropped) {
    onConverted(result.cropped)
  }
  return 'painted'
}
