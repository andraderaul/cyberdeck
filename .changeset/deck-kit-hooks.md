---
"@cyberdeck/ascii": patch
"@cyberdeck/glitch": patch
---

Migrate the framework-neutral hooks `use-dialog` and `use-toast` into
`@cyberdeck/deck-kit/hooks` (ADR 0014). Both apps import them from the kit; the copies are deleted.
Internal refactor — no behavior change.
