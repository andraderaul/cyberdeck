---
'@cyberdeck/ascii': patch
---

The canvas overlay's controls — mirror, switch camera, clear, and the REC badge that stops a take —
now answer a 44x44 pointer target. They stood at ~32px tall, and the icon-only ones at ~27px wide on
touch.

They stand on the artwork, so the height comes from an invisible overlay and the chips draw exactly
as they did before; only the icon-only ones take real width, which no height overlay could give them.
