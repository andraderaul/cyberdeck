---
'@cyberdeck/ascii': patch
---

The `about` trigger leaves the header for a new ultra-thin footer on the empty state. The footer
also carries the `source code →` and `author →` links — attribution that used to hide inside the
About modal. It shows only before a Source loads: once the Control Strip owns the bottom edge, a
footer under it would just invite a mis-tap. The modal keeps the longer narrative (the intro, `ai
scan`, and `made with ai`), so the header sheds a secondary control and the About content splits by
how often you reach for it.
