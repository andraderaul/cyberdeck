import type { Chain } from './chain'
import type { ChainRunner } from './chain-runner'
import { type GlitchSource, sampleDimensions, sourceDimensions } from './image-utils'
import type { Seed } from './types'

/**
 * What became of one frame.
 *
 * `dropped` is not a failure: it is the runner saying this frame has no pixels coming — either a
 * newer frame took its place, or the Worker died holding it (`chain-runner.ts`). A Live Source
 * ignores it, since the next tick brings a fresher frame anyway; a Source Image, which has no next
 * tick, asks again.
 */
export type GlitchFrameOutcome = 'painted' | 'dropped' | 'skipped'

/**
 * One frame's worth of instructions: what to sample, where to put it, and the look to run over it.
 *
 * A record rather than seven positional parameters — four of them canvases and runners that read
 * alike at a callsite, and a trailing boolean nobody can name from position. It also lets the
 * Source Image path re-ask with the identical frame by passing the same value twice.
 */
export interface GlitchFrame {
  source: GlitchSource
  /** The visible canvas — sized to the sampled dimensions, so it *is* the output. */
  canvas: HTMLCanvasElement
  /** The off-screen sampling canvas (ADR 0001), never rendered. */
  hidden: HTMLCanvasElement
  runner: ChainRunner
  chain: Chain
  seed: Seed
  isMirrored?: boolean
}

/**
 * Impure: the shell around the pure core. Draws the Source onto the hidden sampling canvas
 * (ADR 0001), unwraps the real ImageData into a PixelBuffer, hands it to the ChainRunner, and wraps
 * what comes back into ImageData to paint. It is the only place the DOM and the pure core meet
 * (ADR 0005).
 *
 * The Chain itself runs on a Worker thread (ADR 0002), which is why this is async: the sampling and
 * the paint stay here on the main thread, and only the fold between them crosses. The buffer moves
 * by transfer in both directions, so nothing here may read `imageData.data` after handing it over —
 * it is detached from that moment.
 *
 * The visible canvas is sized to the sampled dimensions, so the painted buffer *is* the output —
 * PNG Export takes the canvas as-is, with no letterboxing to crop back out. CSS handles the fit.
 *
 * Mirror flips the Source on this sampling draw, *before* the Chain (ADR 0016) — not with a CSS
 * transform on the visible canvas, which would leave Export disagreeing with the preview. Effects
 * then apply on top of the already-flipped buffer, and the exported canvas carries the flip.
 *
 * A Live Source (webcam) goes through the very same path — one frame of video is just another
 * Source to sample. Nothing here is stateful across calls, so the rAF loop re-entering it at
 * ~15fps with a fixed Seed repaints the same arrangement rather than boiling.
 *
 * The sampling happens before the runner is asked, even when the runner is busy and will drop the
 * frame. That is deliberate: a fresh sample replaces the one waiting its turn, so what eventually
 * runs is the newest frame rather than the oldest queued one (`chain-runner.ts`).
 *
 * @returns `skipped` when there was nothing to render — no 2D context, or the Source has no
 *   intrinsic size yet (an image still decoding, or a webcam with no frame yet); `dropped` when the
 *   frame has no pixels coming; `painted` when the canvas was written.
 */
export async function renderGlitchFrame({
  source,
  canvas,
  hidden,
  runner,
  chain,
  seed,
  isMirrored = false,
}: GlitchFrame): Promise<GlitchFrameOutcome> {
  const ctx = canvas.getContext('2d')
  const hiddenCtx = hidden.getContext('2d')
  if (!ctx || !hiddenCtx) {
    return 'skipped'
  }

  const { w: srcW, h: srcH } = sourceDimensions(source)
  const { w, h } = sampleDimensions(srcW, srcH)
  if (w < 1 || h < 1) {
    return 'skipped'
  }

  hidden.width = w
  hidden.height = h
  // drawImage composites source-over, so a Source with an alpha channel would blend onto whatever
  // this canvas still holds — sampled pixels that depend on how many renders came before, with
  // applyChain still perfectly pure. The resize above is not the clear: assigning the width a
  // value it already has is a no-op, which is every frame of a Live Source. See ADR 0001 for why
  // clearRect and not a 'copy' composite or a resize.
  hiddenCtx.clearRect(0, 0, w, h)
  if (isMirrored) {
    hiddenCtx.save()
    hiddenCtx.translate(w, 0)
    hiddenCtx.scale(-1, 1)
    hiddenCtx.drawImage(source, 0, 0, w, h)
    hiddenCtx.restore()
  } else {
    hiddenCtx.drawImage(source, 0, 0, w, h)
  }

  const imageData = hiddenCtx.getImageData(0, 0, w, h)
  const glitched = await runner.run({ data: imageData.data, width: w, height: h }, chain, seed)
  if (glitched === null) {
    return 'dropped'
  }

  canvas.width = w
  canvas.height = h
  ctx.putImageData(new ImageData(glitched.data, w, h), 0, 0)
  return 'painted'
}
