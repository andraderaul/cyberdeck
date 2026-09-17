---
'@cyberdeck/ascii': patch
---

Promoted to the role-named space ruler (ADR 0030): `gap-sm` becomes `gap-item`, `px-2xs` becomes
`px-tight`, and so on across every panel. Behaviour and layout are unchanged except where the note
below says otherwise.

The LIVE / REC cluster over the canvas takes `hairline` — the 4px that keeps the overlay's footprint
off the user's artwork (ADR 0013) — so it does not move a pixel. Twelve classes elsewhere in the
chrome go 4px → 6px: the mode row, the AI banner, the Analysis modal and the out panel. Two of
those sit on wrapping rows (the modal's tag list and the out panel's action row), where the extra
2px can send an item to a new line on a narrow screen.
