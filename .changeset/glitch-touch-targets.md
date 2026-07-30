---
'@cyberdeck/glitch': patch
---

The canvas overlay's controls — mirror, switch camera, clear, and the REC badge that stops a take —
now answer a 44x44 pointer target, as do duplicate and remove on the focused Link. The overlay chips
stood at ~32px tall and the Link actions at roughly 21x24px.

The overlay chips stand on the artwork, so their height comes from an invisible overlay and they draw
exactly as before. The LIVE badge wears the same shared chrome but is not a control, so it
deliberately gains no target.
