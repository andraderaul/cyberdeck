---
'@cyberdeck/glitch': patch
---

Promoted to the role-named space ruler (ADR 0030): `gap-sm` becomes `gap-item`, `px-2xs` becomes
`px-tight`, and so on across the Chain editor, the Preset row and the out panel.

The LIVE / REC cluster over the canvas takes `hairline` — the 4px that keeps the overlay's footprint
off the user's artwork (ADR 0013) — so it does not move a pixel. Three classes go 4px → 6px, all in
the Chain editor and the out panel's action rows.
