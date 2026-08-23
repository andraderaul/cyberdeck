// What crosses the thread boundary, and the one function that runs on the far side of it — see
// ADR 0002, whose Web Worker upgrade path this app took. Kept apart from `chain-worker.ts` so the
// *work* is a plain pure function a test can call, and the worker entry is only the three lines of
// wiring no test can reach.

import { applyChain, type Chain } from './chain'
import type { PixelBuffer, Seed } from './types'

/**
 * One frame's work, as it goes over `postMessage`: the sampled pixels, plus the look to run over
 * them.
 *
 * `data` is spelled out beside `width` and `height` rather than nested as a `PixelBuffer`, because
 * the transfer list has to name the buffer and a flat shape keeps that name one hop away. The `id`
 * is what lets a result be matched to the frame that asked for it — a result whose job the runner
 * has already abandoned is dropped rather than painted.
 */
export interface ChainJob {
  id: number
  data: PixelBuffer['data']
  width: number
  height: number
  chain: Chain
  seed: Seed
}

/** What comes back: the same id, and the pixels the Chain produced. */
export interface ChainResult {
  id: number
  data: PixelBuffer['data']
  width: number
  height: number
}

/**
 * A finished job together with **the transfer list it must be posted with**.
 *
 * The two travel as one value so the return leg cannot be transferred by accident or forgotten by
 * accident: `chain-worker.ts` posts what this hands it, and a test can assert that the list really
 * names the result's buffer. That leg would otherwise be pinned nowhere — the worker entry is the
 * one file no test can reach.
 */
export interface ChainJobOutcome {
  result: ChainResult
  transfer: Transferable[]
}

/**
 * The worker's whole body, as a pure function — unwraps the job, folds the Chain, wraps the result,
 * and says which buffer goes on the transfer list.
 *
 * `applyChain` stays the only place Effects run (ADR 0017) and stays pure (ADR 0005): moving it to
 * another thread changed where it is called from and nothing about what it computes, which is what
 * lets the Effects and the Chain keep being unit-tested without a Worker anywhere near them.
 *
 * Every Effect allocates its own output, so the buffer named here is the worker's own — except for
 * an empty Chain, where it is the very buffer that was transferred in and is the worker's to give
 * back either way.
 */
export function runChainJob({ id, data, width, height, chain, seed }: ChainJob): ChainJobOutcome {
  const glitched: PixelBuffer = applyChain({ data, width, height }, chain, seed)
  const result: ChainResult = {
    id,
    data: glitched.data,
    width: glitched.width,
    height: glitched.height,
  }
  return { result, transfer: [result.data.buffer] }
}
