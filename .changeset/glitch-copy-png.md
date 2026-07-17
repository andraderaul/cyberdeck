---
'@cyberdeck/glitch': minor
---

GLITCH//Studio: Copy. A **copy** control beside PNG Export writes the glitched result to the
clipboard as a PNG, so it pastes straight into a post or chat. Copy is PNG Export on a different
destination — it reads the canvas as-is, which makes it work identically for a Source Image and a
Live Source, and leaves the rAF loop untouched.

`copyCanvasToClipboard` hands the `ClipboardItem` the *pending* blob promise rather than an awaited
blob: Safari resolves the write against the gesture that constructed the item, so awaiting first
loses the gesture and the write is refused.

Since a Copy leaves the screen unchanged, it confirms with an info toast. Clipboard failures surface
as an error toast via the operational `AppError` flow (ADR 0006), split in two: a browser that can't
write images at all gets pointed to Export, since "try again" is advice that can never come good.
