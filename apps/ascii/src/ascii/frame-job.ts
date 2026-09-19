// What crosses the thread boundary, and the one function that runs on the far side of it — see
// ADR 0002, whose Web Worker upgrade path this app took after GLITCH//Studio (#316). Kept apart
// from `frame-worker.ts` so the *work* is a plain pure function a test can call, and the worker
// entry is only the three lines of wiring no test can reach.
//
// The split is this program's own, and it is not GLITCH's: only the two pure stages cross. The
// sampling draw stays on the main thread because the hidden canvas is a DOM object (ADR 0001), and
// `paintFrame` stays there because it is the single point that writes to the visible canvas
// (ADR 0005). What travels is pixels one way and packed frames the other — typed arrays on both
// legs, transferred on both legs.

import { convertImage } from './converter'
import { sliceToRegion } from './fit'
import type { PackedFrame } from './packed-frame'
import { computeFrame } from './renderer'
import type { ConversionSettings, FitRegion } from './types'

/**
 * One frame's work, as it goes over `postMessage`: the sampled pixels, the grid they fill, and the
 * ConversionSettings to read them under.
 *
 * `pixels` is spelled beside `cols` and `rows` rather than wrapped, because the transfer list has
 * to name the buffer and a flat shape keeps that name one hop away.
 */
export interface AsciiFrameRequest {
  pixels: Uint8ClampedArray
  cols: number
  rows: number
  settings: ConversionSettings
  region: FitRegion
  /**
   * Whether the text Exports' grid is wanted — a second `computeFrame` over the cells cropped to
   * the fit region (ADR 0010). A Live Source asks for it on no frame at all: nothing consumes a
   * converted frame at 15fps, and the loop is why this is a request field rather than something
   * the worker always computes.
   */
  cropped: boolean
}

/** A request with the id that lets a result be matched to the frame that asked for it. */
export interface AsciiFrameJob extends AsciiFrameRequest {
  id: number
}

/** What comes back: the same id, and everything the shell paints or exports from. */
export interface AsciiFrameResult {
  id: number
  /** The full grid, letterbox bands included — what `paintFrame` draws and what PNG Export keeps. */
  frame: PackedFrame
  /** The cropped grid both text Exports read, or `null` when the job did not ask for one. */
  cropped: PackedFrame | null
}

/**
 * The buffers a result owns, for the Worker to name in its transfer list — every one of them, so
 * the return leg **moves** rather than copies.
 *
 * Here rather than in `frame-worker.ts` for the reason the whole file exists: the entry is wiring no
 * test can reach, and a transfer list that silently misses a buffer is a structured clone nothing
 * would report. Detaching is safe because `runFrameJob` built these arrays for this message and
 * nothing on the Worker side reads them again.
 */
export function frameResultTransfers({ frame, cropped }: AsciiFrameResult): Transferable[] {
  const buffers: Transferable[] = [frame.chars.buffer, frame.colors.buffer]
  if (cropped) {
    buffers.push(cropped.chars.buffer, cropped.colors.buffer)
  }
  return buffers
}

/**
 * The worker's whole body, as a pure function: the two pure stages of the pipeline, back to back.
 *
 * `convertImage` and `computeFrame` are unchanged and stay pure (ADR 0005) — moving them to another
 * thread changed where they are called from and nothing about what they compute, which is what lets
 * them keep being unit-tested with no Worker anywhere near them.
 *
 * **Both legs transfer.** The sampled buffer comes in by transfer and the packed frame goes back the
 * same way (`frameResultTransfers`) — the shape `computeFrame` emits is typed arrays, so there is
 * nothing to encode on either side of the boundary and nothing left to clone.
 */
export function runFrameJob({
  id,
  pixels,
  cols,
  rows,
  settings,
  region,
  cropped,
}: AsciiFrameJob): AsciiFrameResult {
  const cells = convertImage(pixels, cols, rows, settings, region)
  return {
    id,
    frame: computeFrame(cells, settings),
    // Recomputing over the cropped cells rather than slicing the full frame is what rebases the
    // grid onto the crop's own origin and width — a sliced row would land at a column the exported
    // document no longer has a cell for.
    cropped: cropped ? computeFrame(sliceToRegion(cells, region), settings) : null,
  }
}
