---
'@cyberdeck/ascii': patch
---

The authored-Charset field drew 160x42.8 — 1.2px under the deck's 44x44 target, and the only control
here sized purely by its padding and its line box with no floor under either (#355). It takes a real
`min-h-[44px]`: an `<input>` renders no `::after` for `ui/touch-target.ts` to hang an overlay on, and
the Chips it stands beside in the scrolling row are already 44px tall, so the missing pixel and a bit
costs the panel nothing.
