// What crosses the thread boundary, and the one function that runs on the far side of it — see
// ADR 0002, whose Web Worker upgrade path this app took after GLITCH//Studio (#316). Kept apart
// from `frame-worker.ts` so the *work* is a plain pure function a test can call, and the worker
// entry is only the three lines of wiring no test can reach.
//
// The split is this program's own, and it is not GLITCH's: only the two pure stages cross. The
// sampling draw stays on the main thread because the hidden canvas is a DOM object (ADR 0001), and
// `paintFrame` stays there because it is the single point that writes to the visible canvas
// (ADR 0005). What travels is pixels one way and drawing instructions the other.

import { convertImage } from './converter'
import { sliceToRegion } from './fit'
import { computeFrame, type RenderInstruction } from './renderer'
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
  instructions: RenderInstruction[]
  /** The cropped grid both text Exports read, or `null` when the job did not ask for one. */
  cropped: { asciiRows: string[]; instructions: RenderInstruction[] } | null
}

/**
 * The worker's whole body, as a pure function: the two pure stages of the pipeline, back to back.
 *
 * `convertImage` and `computeFrame` are unchanged and stay pure (ADR 0005) — moving them to another
 * thread changed where they are called from and nothing about what they compute, which is what lets
 * them keep being unit-tested with no Worker anywhere near them.
 *
 * **Nothing is transferred back, and nothing can be.** `RenderInstruction[]` is an array of objects
 * and `asciiRows` an array of strings; neither is a Transferable, so both legs cannot be symmetric
 * the way GLITCH's are. The transfer that matters is the inbound one — the sampled buffer, which is
 * `cols × rows × 4` and the only large value in the message (`frame-runner.ts` names it).
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
    instructions: computeFrame(cells, settings).instructions,
    // Recomputing over the cropped cells rather than slicing the instructions is what rebases each
    // x/y onto the cropped grid's own origin — a sliced instruction would carry a coordinate the
    // exported document no longer has a cell for.
    cropped: cropped ? computeFrame(sliceToRegion(cells, region), settings) : null,
  }
}
