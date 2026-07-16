import { sampleDimensions, sourceDimensions } from './image-utils'
import { applyPipeline } from './pipeline'
import type { GlitchSettings, PixelBuffer } from './types'

/**
 * Impure: the shell around the pure Pipeline. Draws the Source onto the hidden sampling canvas
 * (ADR 0001), unwraps the real ImageData into a PixelBuffer, runs applyPipeline, and wraps the
 * result back into ImageData to paint. It is the only place the DOM and the pure core meet
 * (ADR 0005).
 *
 * The visible canvas is sized to the sampled dimensions, so the painted buffer *is* the output —
 * PNG Export takes the canvas as-is, with no letterboxing to crop back out. CSS handles the fit.
 *
 * @returns `false` when the render was skipped — no 2D context, or the Source has no intrinsic
 *   size yet (e.g. an image still decoding). `true` when a frame was painted.
 */
export function renderGlitchFrame(
  source: HTMLImageElement,
  canvasEl: HTMLCanvasElement,
  hiddenEl: HTMLCanvasElement,
  settings: GlitchSettings,
): boolean {
  const ctx = canvasEl.getContext('2d')
  const hiddenCtx = hiddenEl.getContext('2d')
  if (!ctx || !hiddenCtx) {
    return false
  }

  const { w: srcW, h: srcH } = sourceDimensions(source)
  const { w, h } = sampleDimensions(srcW, srcH)
  if (w < 1 || h < 1) {
    return false
  }

  hiddenEl.width = w
  hiddenEl.height = h
  hiddenCtx.drawImage(source, 0, 0, w, h)

  const imageData = hiddenCtx.getImageData(0, 0, w, h)
  const glitched: PixelBuffer = applyPipeline(
    { data: imageData.data, width: w, height: h },
    settings,
  )

  canvasEl.width = w
  canvasEl.height = h
  ctx.putImageData(new ImageData(glitched.data, w, h), 0, 0)
  return true
}
