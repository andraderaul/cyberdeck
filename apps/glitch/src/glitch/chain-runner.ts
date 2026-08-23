// Who runs the Chain, and on which thread — ADR 0002. The shell asks a ChainRunner for a frame and
// paints whatever comes back; whether that was a Worker or the very same `applyChain` running here
// is the runner's business and nobody else's.

import { applyChain, type Chain } from './chain'
import { type ChainJob, type ChainResult, runChainJob } from './chain-job'
import type { PixelBuffer, Seed } from './types'

/**
 * Runs the Chain over one frame, wherever it runs.
 *
 * `run` resolves with `null` when the frame was **dropped**, which happens for exactly two reasons:
 * a newer frame arrived while this one was still waiting for its turn (the backpressure rule below),
 * or a Worker died holding this frame's pixels, which left with them. Both mean "no pixels for this
 * frame"; neither is an error, and neither leaves the runner unusable.
 */
export interface ChainRunner {
  run(buffer: PixelBuffer, chain: Chain, seed: Seed): Promise<PixelBuffer | null>
  dispose(): void
}

/**
 * The fallback: the Chain on the calling thread, exactly as it ran before ADR 0002's upgrade path
 * was taken. Used where `Worker` is unavailable, where constructing one throws, and from the moment
 * a live Worker dies — so the canvas has a way to paint in every case rather than a way to break.
 *
 * It never drops: there is nothing in flight to be superseded, so every call paints.
 */
export function createSyncChainRunner(): ChainRunner {
  return {
    run: (buffer, chain, seed) => Promise.resolve(applyChain(buffer, chain, seed)),
    dispose: () => {},
  }
}

/** One frame the runner owes an answer for. */
interface Pending {
  job: ChainJob
  settle: (buffer: PixelBuffer | null) => void
}

function toBuffer({ data, width, height }: ChainResult): PixelBuffer {
  return { data, width, height }
}

/**
 * The Chain on a Worker thread.
 *
 * **At most one frame in flight and one waiting.** A Live Source samples at ~15fps whatever the
 * Chain costs, and a heavy Chain over an 800×800 buffer costs far more than 66ms (`MAX_CHAIN_LENGTH`
 * measures it) — so frames arrive faster than they finish, for the whole time the user has a slow
 * look on screen. Queueing them would grow a backlog that never drains and put the preview minutes
 * behind the camera; every frame past the newest is therefore dropped, resolved `null`, and the
 * newest one takes the single waiting slot.
 *
 * The slot is what makes the rule safe for a Source Image too. A dropped frame on a Live Source is
 * corrected by the next tick of the loop, but a still image has no next tick: if the last edit a
 * user made could be the one that got dropped, the canvas would sit on a look they had already
 * moved past. Keeping the newest rather than dropping it is what guarantees the Chain on screen is
 * the Chain in the Editor — and it is why the shell keeps sampling on every throttled tick even
 * while the Worker is busy: a fresh sample *replaces* the waiting one, so what eventually runs is
 * the newest frame rather than the one that happened to arrive first.
 *
 * Takes the Worker rather than making one, so the drop rule and the transfers are testable against
 * a double without a Worker in the room (`createChainRunner` is the half that can't be).
 */
export function createWorkerChainRunner(worker: Worker): ChainRunner {
  let nextJobId = 0
  let inFlight: Pending | null = null
  let waiting: Pending | null = null
  // A Worker that has died is never coming back, so the runner stops being a Worker runner rather
  // than failing every frame from here on (ADR 0006 wants failures surfaced, but this one has a
  // correct answer to fall through to — a paint the user can't tell apart from the fast one).
  let fellBack = false

  const send = (pending: Pending): void => {
    inFlight = pending
    // Transfer, not copy: the sampled frame is 800×800×4 at the cap, and copying it on both legs
    // of every frame would put back on the main thread a good part of what moving the Chain off it
    // bought. The buffer is detached here the moment this returns — nothing reads it again.
    worker.postMessage(pending.job, [pending.job.data.buffer])
  }

  /**
   * Gives up on both slots, answering each frame with what is still true of it. The frame in flight
   * left with its pixels — they were transferred, so there is nothing here to re-run it from, and it
   * can only report dropped. Every promise this runner handed out is settled by the time this
   * returns; a caller left waiting forever is the one failure mode neither path may have.
   */
  const abandon = (answerWaiting: (pending: Pending) => PixelBuffer | null): void => {
    const stranded = waiting
    const lost = inFlight
    inFlight = null
    waiting = null
    lost?.settle(null)
    if (stranded) {
      stranded.settle(answerWaiting(stranded))
    }
  }

  const fallBack = (): void => {
    if (fellBack) {
      return
    }
    fellBack = true
    worker.terminate()
    // The waiting frame never left, so it can still be answered — on this thread.
    abandon((pending) => toBuffer(runChainJob(pending.job).result))
  }

  worker.addEventListener('message', (event: MessageEvent<ChainResult>) => {
    const result = event.data
    const answered = inFlight
    inFlight = null
    if (answered) {
      // The id cannot mismatch as things stand — one job is outstanding at a time, and both
      // `abandon` paths null `inFlight` before any later result could arrive. It is settled rather
      // than ignored anyway: an unsettled promise is a canvas that never paints and a render that
      // never reports, and that failure is invisible until someone is staring at a frozen frame.
      answered.settle(answered.job.id === result.id ? toBuffer(result) : null)
    }
    if (waiting) {
      const next = waiting
      waiting = null
      send(next)
    }
  })
  worker.addEventListener('error', fallBack)
  worker.addEventListener('messageerror', fallBack)

  return {
    run(buffer, chain, seed) {
      if (fellBack) {
        return Promise.resolve(applyChain(buffer, chain, seed))
      }
      return new Promise<PixelBuffer | null>((resolve) => {
        nextJobId += 1
        const pending: Pending = {
          job: {
            id: nextJobId,
            data: buffer.data,
            width: buffer.width,
            height: buffer.height,
            chain,
            seed,
          },
          settle: resolve,
        }
        if (inFlight === null) {
          send(pending)
          return
        }
        // The frame this one replaces is the dropped one — there is exactly one slot, and the
        // newest frame is always the one worth keeping.
        waiting?.settle(null)
        waiting = pending
      })
    },
    dispose() {
      fellBack = true
      worker.terminate()
      // Nothing is coming back from a terminated Worker, so the waiting frame is dropped too rather
      // than run here: dispose means this canvas is gone, and a frame painted after it is nobody's.
      abandon(() => null)
    },
  }
}

/**
 * The runner this app gets: a Worker where the browser has one, the synchronous core where it does
 * not.
 *
 * Construction is guarded as well as the global, because `new Worker` throws synchronously where a
 * Content-Security-Policy refuses worker scripts — and an app that shows a broken canvas on a
 * policy it can't see is worse than one that quietly runs the Chain where it always did.
 */
export function createChainRunner(): ChainRunner {
  if (typeof Worker === 'undefined') {
    return createSyncChainRunner()
  }
  try {
    return createWorkerChainRunner(
      new Worker(new URL('./chain-worker.ts', import.meta.url), { type: 'module' }),
    )
  } catch {
    return createSyncChainRunner()
  }
}
