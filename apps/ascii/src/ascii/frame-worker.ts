// The Worker entry — ADR 0002's upgrade path, taken here after GLITCH//Studio. Deliberately three
// lines: everything it could get wrong lives in `runFrameJob`, which is a pure function with its
// own tests. What is left here is wiring no test can reach and the browser check covers.

import { type AsciiFrameJob, type AsciiFrameResult, runFrameJob } from './frame-job'

/**
 * `self` in a Worker is a `DedicatedWorkerGlobalScope`, but this app's tsconfig carries the DOM lib
 * and adding `webworker` beside it collides on every global the two share. So the worker half of
 * the global is spelled here, once, rather than pulled in as a lib.
 */
const scope = self as unknown as {
  addEventListener(type: 'message', listener: (event: MessageEvent<AsciiFrameJob>) => void): void
  postMessage(message: AsciiFrameResult): void
}

// No transfer list: what goes back is instructions and text, and neither type is a Transferable
// (`frame-job.ts`). The inbound leg is the one that transfers, and the runner owns that.
scope.addEventListener('message', (event) => {
  scope.postMessage(runFrameJob(event.data))
})
