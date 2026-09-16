---
'@cyberdeck/ascii': minor
---

The conversion moves off the main thread — the second half of ADR 0002's upgrade path.

`convertImage()` and `computeFrame()` now run on a Worker; the sampling draw and `paintFrame()` stay
in the shell, because the hidden canvas is a DOM object (ADR 0001) and `paintFrame()` is still the
only function writing to the visible one (ADR 0005). The sampled pixels cross by transfer; the
instructions and rows come back by copy, since neither type is a Transferable. A Live Source drops
frames rather than queueing them, and a synchronous fallback runs wherever `Worker` is missing,
refused or dead — so there is no state in which the canvas has no way to paint.

The output is unchanged, byte for byte, and a test pins all three Exports for all ten Presets
against digests recorded before the port. The Mirror still rides on the sampling draw, so the
preview, the PNG, the TXT and the HTML go on agreeing.
