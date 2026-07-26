# ADR 0002 — Webcam live feed — rAF loop on the main thread

## Status

Accepted

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
  upgrade path (Web Worker + OffscreenCanvas) is recorded below rather than built now.

## Related ADRs

- ADR 0005 — Pure/impure boundary with RenderInstruction.

## Implementation Notes

Upgrade path if jank is reported (especially at high resolution or on slow hardware): move
`renderFrame()` into a `Worker` using `OffscreenCanvas`.

1. Transfer the visible canvas to the Worker via `canvas.transferControlToOffscreen()`.
2. Pass video frames as `ImageBitmap` (created with `createImageBitmap(videoEl)` on the main thread).
3. The Worker receives the `ImageBitmap`, runs `convertImage()`, and renders to the `OffscreenCanvas`.
4. Communication is via `postMessage` with transferables — no memory copies.

This moves all conversion CPU off the UI thread, eliminating the jank risk. The refactor is isolated to
`ascii-canvas.tsx` and the new worker — the component's public API does not change.
