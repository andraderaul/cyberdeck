// The Worker entry — ADR 0002's upgrade path, taken here. Deliberately three lines: everything it
// could get wrong, the transfer list included, lives in `runChainJob`, which is a pure function
// with its own tests. What is left here is wiring no test can reach and the browser check covers.

import { type ChainJob, type ChainResult, runChainJob } from './chain-job'

/**
 * `self` in a Worker is a `DedicatedWorkerGlobalScope`, but this app's tsconfig carries the DOM lib
 * and adding `webworker` beside it collides on every global the two share. So the worker half of
 * the global is spelled here, once, rather than pulled in as a lib.
 */
const scope = self as unknown as {
  addEventListener(type: 'message', listener: (event: MessageEvent<ChainJob>) => void): void
  postMessage(message: ChainResult, transfer: Transferable[]): void
}

scope.addEventListener('message', (event) => {
  // Transfer, not copy — on this leg as on the other. The list arrives with the result rather than
  // being assembled here, so the one file no test can reach is not the file that gets it wrong.
  const { result, transfer } = runChainJob(event.data)
  scope.postMessage(result, transfer)
})
