---
'@cyberdeck/glitch': patch
---

The duplicate and remove controls on the focused Link no longer sit flush against each other. They
were separated by a gap step that does not exist in the deck's scale, so Tailwind generated no class
at all and the two controls — one of them destructive — touched.
