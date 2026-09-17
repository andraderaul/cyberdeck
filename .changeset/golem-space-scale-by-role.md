---
'@cyberdeck/golem': patch
---

Promoted to the role-named space ruler (ADR 0030): `gap-sm` becomes `gap-item`, `px-2xs` becomes
`px-tight`, and so on across the console's panels.

Three classes go 4px → 6px: the Panel's header padding, the Cache's byte padding, and the Cache's
line grid — that last one is a grid rather than a shift, so the block grows by a row gap.
