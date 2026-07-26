# ADR 0007 — Recording — progressive enhancement, no GIF fallback

## Status

Accepted

## Context

The Recording feature needs to record the ASCII canvas as video in the browser, with no backend.
The central question is: what to do in browsers that do not reliably support
`canvas.captureStream()` + `MediaRecorder` (mainly iOS Safari)?

## Decision

Implement Recording with `canvas.captureStream(15)` + `MediaRecorder` and runtime format detection.
In browsers without support, the Record control is simply not shown — **no fallback to GIF or any
other format**.

The alternative path — GIF via `gif.js` with a Web Worker — would work in every browser but
introduces a third-party dependency with a heavy JS encoder, encoding slower than real time, and
visibly inferior quality (256-color palette). For an app whose differentiator is the visual quality
of the ASCII canvas, GIF would be a perceptible degradation.

`MediaRecorder` with format detection (`isTypeSupported`) covers Chrome, Firefox, and Edge with no
new dependencies. Safari desktop works with `video/mp4`. iOS Safari is the only problematic case —
and the app's primary target audience is desktop.

Hiding the button instead of degrading preserves the perception of quality: the user on an iPhone
simply does not see the option, rather than receiving a lower-quality GIF.

## Considered Alternatives

- **GIF via `gif.js` + Web Worker.**
  - *Cons:* new dependency, slow encoding, inferior quality (256 colors), larger bundle.
  - *Rejected because:* it would degrade the very thing the app is built around — canvas visual
    quality.
- **ffmpeg.wasm.**
  - *Cons:* ~30MB bundle, initialization latency.
  - *Rejected because:* the complexity is disproportionate to the scope.

## Consequences

**Positive:**
- Zero new dependencies; maximum quality where the platform supports it.
- No quality-degrading fallback ships — the ASCII canvas fidelity is never compromised.

**Negative:**
- On iOS Safari the Record control is absent entirely — a silent absence rather than a message.
- Relies on runtime feature detection, so support is discovered per-browser rather than declared
  up front.

## Related ADRs

- None.

## Implementation Notes

Format detection — preference order tested at runtime:

1. `video/webm;codecs=vp9`
2. `video/webm;codecs=vp8`
3. `video/webm`
4. `video/mp4`

The first type supported by the browser is used. The exported file's extension is mapped from the
resulting `mimeType`.
