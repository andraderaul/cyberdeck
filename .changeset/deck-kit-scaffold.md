---
"@cyberdeck/ascii": patch
"@cyberdeck/glitch": patch
---

Extract the first shared package on the deck, `@cyberdeck/deck-kit` (ADR 0014). The visual language
(`tokens.css` + Tailwind preset), the `cn` / `share` / `device` / `load-image-file` utils, and the
`Button` primitive now live in the kit and are consumed as source by both apps. Internal refactor —
no behavior change.
