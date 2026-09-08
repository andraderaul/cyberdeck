// Who runs the two pure stages, and on which thread — ADR 0002. The shell asks a FrameRunner for a
// frame and paints whatever comes back; whether that was a Worker or the very same `convertImage` /
// `computeFrame` running here is the runner's business and nobody else's.
//
// Shaped after GLITCH//Studio's `chain-runner.ts` on purpose: the drop rule, the fallback and the
// death handling are the same three problems, and a second answer to them would be a second thing
// to keep correct.

import {
  type AsciiFrameJob,
  type AsciiFrameRequest,
  type AsciiFrameResult,
  runFrameJob,
} from './frame-job'

/**
 * Runs one frame's conversion, wherever it runs.
 *
 * `run` resolves with `null` when the frame was **dropped**, which happens for exactly two reasons:
 * a newer frame arrived while this one was still waiting for its turn (the backpressure rule below),
 * or a Worker died holding this frame's pixels, which left with them. Both mean "nothing to paint
 * for this frame"; neither is an error, and neither leaves the runner unusable.
 */
export interface AsciiFrameRunner {
  run(request: AsciiFrameRequest): Promise<AsciiFrameResult | null>
  dispose(): void
}

/**
 * The fallback: the conversion on the calling thread, exactly as it ran before ADR 0002's upgrade
 * path was taken. Used where `Worker` is unavailable, where constructing one throws (a
 * Content-Security-Policy that refuses worker scripts), and from the moment a live Worker dies — so
 * the canvas has a way to paint in every case rather than a way to break.
 *
 * It never drops: there is nothing in flight to be superseded, so every call paints. That is also
 * what makes it the right runner for the PRESETS row (`thumbnail.ts`), which asks for ten frames in
 * a burst and would see nine of them dropped by the rule below.
 */
export function createSyncFrameRunner(): AsciiFrameRunner {
  return {
    // The id is the Worker's way of matching a result to its frame; on this thread the answer is
    // the return value, so there is nothing to match and nothing to count.
    run: (request) => Promise.resolve(runFrameJob({ ...request, id: 0 })),
    dispose: () => {},
  }
}

/** One frame the runner owes an answer for. */
interface Pending {
  job: AsciiFrameJob
  settle: (result: AsciiFrameResult | null) => void
}

/**
 * The conversion on a Worker thread.
 *
 * **At most one frame in flight and one waiting.** A Live Source samples at ~15fps whatever the
 * conversion costs, and a fine Resolution over a full canvas costs a real share of that budget — so
 * frames can arrive faster than they finish for as long as the user holds that Resolution. Queueing
 * them would grow a backlog that never drains and put the preview behind the camera; every frame
 * past the newest is therefore dropped, resolved `null`, and the newest one takes the single
 * waiting slot.
 *
 * The slot is what makes the rule safe for a Source Image too. A dropped frame on a Live Source is
 * corrected by the next tick of the loop, but a still image has no next tick: if the last edit a
 * user made could be the one that got dropped, the canvas would sit on a look they had already
 * moved past. Keeping the newest rather than dropping it is what guarantees the grid on screen is
 * the one the Editor holds — and it is why the shell keeps sampling on every throttled tick even
 * while the Worker is busy: a fresh sample *replaces* the waiting one, so what eventually runs is
 * the newest frame rather than the one that happened to arrive first.
 *
 * Takes the Worker rather than making one, so the drop rule and the transfer are testable against a
 * double without a Worker in the room (`createFrameRunner` is the half that can't be).
 */
export function createWorkerFrameRunner(worker: Worker): AsciiFrameRunner {
  let nextJobId = 0
  let inFlight: Pending | null = null
  let waiting: Pending | null = null
  // A Worker that has died is never coming back, so the runner stops being a Worker runner rather
  // than failing every frame from here on (ADR 0006 wants failures surfaced, but this one has a
  // correct answer to fall through to — a paint the user can't tell apart from the fast one).
  let fellBack = false

  const send = (pending: Pending): void => {
    inFlight = pending
    // Transfer, not copy, on the leg where the type allows it: the sampled buffer is the only large
    // value in the message, and copying it on every frame would put back on the main thread a share
    // of what moving the conversion off it bought. The buffer is detached the moment this returns —
    // nothing reads it again, and the hidden canvas is redrawn from scratch for the next frame
    // anyway (ADR 0001). What comes *back* cannot transfer: see `frame-job.ts`.
    worker.postMessage(pending.job, [pending.job.pixels.buffer])
  }

  /**
   * Gives up on both slots, answering each frame with what is still true of it. The frame in flight
   * left with its pixels — they were transferred, so there is nothing here to re-run it from, and it
   * can only report dropped. Every promise this runner handed out is settled by the time this
   * returns; a caller left waiting forever is the one failure mode neither path may have.
   */
  const abandon = (answerWaiting: (pending: Pending) => AsciiFrameResult | null): void => {
    const stranded = waiting
    const lost = inFlight
    inFlight = null
    waiting = null
    lost?.settle(null)
    if (stranded) {
      // `answerWaiting` runs a real conversion on the fallback path, and a throw out of it would
      // leave this promise unsettled for good — `inFlight` and `waiting` are already null, so
      // nothing left can answer it, and the paragraph above would be a lie. `finally` is what keeps
      // the promise of it. The error still propagates; it just no longer takes a frame with it —
      // and it propagates to the *global* handler rather than to a caller, because the only path
      // that can throw here is `fallBack`, which the browser calls from the Worker's `error`
      // listener. There is no caller on that stack to catch it, which is what makes settling the
      // frame the whole job.
      let answer: AsciiFrameResult | null = null
      try {
        answer = answerWaiting(stranded)
      } finally {
        stranded.settle(answer)
      }
    }
  }

  const fallBack = (): void => {
    if (fellBack) {
      return
    }
    fellBack = true
    worker.terminate()
    // The waiting frame never left, so it can still be answered — on this thread.
    abandon((pending) => runFrameJob(pending.job))
  }

  worker.addEventListener('message', (event: MessageEvent<AsciiFrameResult>) => {
    const result = event.data
    const answered = inFlight
    inFlight = null
    if (answered) {
      // The id cannot mismatch as things stand — one job is outstanding at a time, and both
      // `abandon` paths null `inFlight` before any later result could arrive. It is settled rather
      // than ignored anyway: an unsettled promise is a canvas that never paints and a render that
      // never reports, and that failure is invisible until someone is staring at a frozen frame.
      answered.settle(answered.job.id === result.id ? result : null)
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
    run(request) {
      if (fellBack) {
        return Promise.resolve(runFrameJob({ ...request, id: 0 }))
      }
      return new Promise<AsciiFrameResult | null>((resolve) => {
        nextJobId += 1
        const pending: Pending = { job: { ...request, id: nextJobId }, settle: resolve }
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
 * The runner the canvas gets: a Worker where the browser has one, the synchronous core where it
 * does not.
 *
 * Construction is guarded as well as the global, because `new Worker` throws synchronously where a
 * Content-Security-Policy refuses worker scripts — and an app that shows a broken canvas on a
 * policy it can't see is worse than one that quietly converts where it always did.
 */
export function createFrameRunner(): AsciiFrameRunner {
  if (typeof Worker === 'undefined') {
    return createSyncFrameRunner()
  }
  try {
    return createWorkerFrameRunner(
      new Worker(new URL('./frame-worker.ts', import.meta.url), { type: 'module' }),
    )
  } catch {
    return createSyncFrameRunner()
  }
}
