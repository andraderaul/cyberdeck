# ADR 0002 — Webcam live feed — rAF loop on the main thread

## Status

Accepted (amended in #316 — GLITCH//Studio took the Worker upgrade path; see Implementation Notes)

## Context

Webcam mode needs to sample frames from the `HTMLVideoElement` and render ASCII continuously. This
requires a per-frame loop that reads video pixels, converts them, and paints the canvas — without
janking the browser's main thread.

## Decision

Drive rendering with `requestAnimationFrame`, throttled to ~15fps, running entirely on the browser's
main thread. `renderFrame()` is called roughly every 66ms; the throttle compares timestamps and drops
a frame when the delta since the last render is under 66ms. Only frames with
`readyState >= HAVE_ENOUGH_DATA` are processed.

15fps is enough for live ASCII — the output does not carry the visual fidelity of real video, and the
eye does not perceive a difference above ~10fps for ASCII art. The implementation reuses
`renderFrame()`, already extracted from the static-image flow, with no new dependency.

## Considered Alternatives

- **Move to a Web Worker immediately.**
  - *Cons:* Adds ~2–3× complexity with no perceptible gain at 15fps.
  - *Rejected because:* The cost isn't worth paying until jank is actually reported.
- **`setTimeout` throttle.**
  - *Rejected because:* `rAF` is paused automatically when the tab is backgrounded, saving CPU;
    `setTimeout` keeps firing.

## Consequences

**Positive:**
- Zero new dependencies; reuses the existing static-image render path.
- rAF pauses in background tabs, so an idle webcam tab spends no CPU.

**Negative:**
- All conversion CPU runs on the UI thread, so very high resolutions or slow hardware can jank. The
  upgrade path (Web Worker) is recorded below. **GLITCH//Studio has taken it (#316);
  ASCII//Convert has not** — see the amendment.

## Related ADRs

- ADR 0005 — Pure/impure boundary with RenderInstruction.
- ADR 0017 — The composable Effect Chain: `applyChain` is the one pure function that crossed.
- ADR 0027 — The deck installs: the Worker chunk is part of the precached shell.

## Implementation Notes

### The upgrade path as originally sketched

Move `renderFrame()` into a `Worker` using `OffscreenCanvas`: transfer the visible canvas with
`transferControlToOffscreen()`, pass video frames as `ImageBitmap`, convert and render inside the
Worker, communicate with transferables.

### Amendment (#316) — GLITCH//Studio took it, and took it differently

The jank this ADR was waiting for arrived: eight Effects and Chains up to `MAX_CHAIN_LENGTH` put a
single frame far past the 66ms the loop budgets for it, and every millisecond of that was the UI
thread's. **GLITCH//Studio now runs the Chain on a dedicated Worker** (`src/glitch/chain-worker.ts`,
`chain-job.ts`, `chain-runner.ts`); the rAF loop and the ~15fps throttle above are unchanged, and
what they now throttle is how often the main thread *samples a frame and hands it over*.

**GLITCH went first because its core is one pure function.** `applyChain(PixelBuffer, Chain, Seed) →
PixelBuffer` is the whole of what runs per frame, and `PixelBuffer` was already DOM-free by ADR 0005 —
the shell was already unwrapping `ImageData` into one and wrapping it back. The hard half of a Worker
port, a core that touches no DOM, was done before the port started; what was left was a message and
a transfer list.

**OffscreenCanvas was not used, and the sketch above is superseded on that point.**
`transferControlToOffscreen()` is permanent: once control is transferred, `getContext('2d')`,
`toBlob` and `toDataURL` on the placeholder throw. This app's four output paths — PNG Export,
Capture, Copy and Recording — are all *reads of the visible canvas* (`apps/glitch/CONTEXT.md`), so
transferring it would have traded the jank for losing every way out of the program. Only the fold
crosses; the sampling draw and the `putImageData` stay here, where the DOM is.

Three rules make it work:

- **Transfer, not copy, in both directions.** The sampled buffer is up to 800×800×4 (ADR 0001's
  sampling cap), and cloning it on both legs of every frame would hand back a good share of what
  moving the Chain off-thread bought.
- **Drop frames, never queue them.** At most one frame is in flight and one waiting; a newer frame
  replaces the waiting one, and the frame it replaced is dropped. A queue would grow for as long as
  a slow Chain is on screen and put the preview minutes behind the camera. The single waiting slot
  is what keeps the rule safe for a Source Image, which has no next frame to correct a drop with:
  the newest edit is always the one that survives, so the canvas shows the Chain the Editor holds.
  The shell keeps sampling on every throttled tick even while the Worker is busy, which is the
  other half of that: a fresh sample *replaces* the waiting one, so what eventually runs is the
  newest frame rather than whichever arrived first.
- **A Source Image asks once more when its frame is dropped, and the case is not backpressure.**
  Backpressure cannot reach that branch at all — the only thing that drops the newest Source Image
  render is a newer one, and React runs the older effect's cleanup before the newer render is
  submitted, so it is already cancelled by the time the drop lands. What reaches it is a **Worker
  that died holding the frame's pixels**: they were transferred and left with it, so there is
  nothing here to re-run them from, and a still image has no next tick to correct that with. One
  re-ask is enough and cannot spin, because by then the runner *is* the synchronous core and has
  nothing to drop with.
- **A synchronous fallback, always.** Where `Worker` is undefined, where constructing one throws
  (a Content-Security-Policy that refuses worker scripts), and from the moment a live Worker dies,
  the same `applyChain` runs on the calling thread. There is no state in which the program has no
  way to paint.

The Effects and `applyChain` did not change and are still unit-tested with no Worker in the room —
the Worker is shell. `chain-job.test.ts` pins the pixels of all ten Presets by digest, recorded from
`main` before the port, which is the assertion the whole change had to answer to.

**The paint is now asynchronous, and one behaviour follows from that.** PNG Export, Capture and
Copy are reads of the visible canvas, and the canvas is written a Worker round trip after the edit
that caused it rather than inside the same commit. So an Export fired within that window — a slider
moved and the button hit in the same breath, on a Chain slow enough to make the window worth
noticing — takes the frame before the edit. It is a valid render of a Chain the user held a moment
earlier, never a torn or half-painted one, and it self-corrects on the next Export. It is left
unhandled rather than unremarked: fixing it means the output panel awaiting the runner, which
threads a render concern through three components that have no other reason to know one exists. If
it is ever reported, that is the shape of the fix, and this paragraph is where it should be read
from.

**The cost is a second copy of the pipeline in the build.** A Worker is its own top-level module
graph, so Vite emits it as a separate chunk (~2.45 kB gzipped) and the entry chunk still carries the
pipeline for the fallback. That chunk is the first entry in GLITCH's `lazy` bundle-budget row, which
was `0` until now; it is fetched when a Source is opened, never at first paint, and it *is* part of
the precached shell (ADR 0027) — a running program fetches it, and an offline user who could not
would silently drop to the slow path.

### ASCII//Convert has not taken it

Its per-frame work is not one function but a pure conversion, a pure `computeFrame`, and a
`paintFrame` that draws a glyph per cell straight onto the canvas. Only the first two could cross
without `OffscreenCanvas`, and the paint is a real share of its frame — so the port is a different
decision there, not the same one applied twice. `ascii-canvas.tsx` still carries the pointer here.
