---
'@cyberdeck/glitch': minor
---

GLITCH//Studio: mobile layout, an empty-state refresh, and error-toast coverage across the failure
paths — the final polish slice.

On mobile the controls move into a slide-up bottom sheet reached from a floating **⚙ controls**
button, so the canvas gets the whole screen; the sheet carries the same stack the desktop aside does
— Presets first, the per-Effect panel folded behind **advanced**. `mobile-bottom-sheet` and its
`use-dialog` (focus trap, scroll lock, Escape, swipe-to-dismiss) are hand-copies of
ASCII//Convert's (ADR 0011); `MobileControls` is this app's own, without ASCII's source/settings
tabs — the Source is chosen from the empty state and cleared from the canvas, so the sheet is only
ever the look's tweak surface.

The empty state now presents its two ways in — drop a Source Image, or go to the Live Source — side
by side as equal choices, rather than the webcam trailing behind an "or".

Operational failures are surfaced consistently as toasts via the AppError flow (ADR 0006): Export,
Capture, Copy, and a denied camera each say what went wrong instead of failing quietly.
