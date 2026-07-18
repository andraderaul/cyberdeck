---
"@cyberdeck/ascii": patch
"@cyberdeck/glitch": patch
---

Migrate the remaining byte-identical `ui/` primitives into `@cyberdeck/deck-kit/ui` (ADR 0014):
`chip`, `label`, `slider`, `toast`, `toggle-group`, `source-image-drop-zone`, `error-boundary`,
`toast-provider`, and `mobile-bottom-sheet`, with their colocated tests. Both apps import them from
the kit; the copies are deleted. Internal refactor — no behavior change.
