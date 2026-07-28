---
'@cyberdeck/glitch': patch
---

The EDIT tab's mobile layout reclaims its cramped Chain row and surfaces the whole palette:

- Re-roll collapses to its ⟳ icon on mobile so it stops reserving ~90px on the Chain row; the "re-roll" label returns from `sm` up.
- The add-effect "+" chip grows to match that icon's 60×44 footprint on mobile so the two read as a matched pair, and shrinks back to a chip on desktop.
- The "add effect" palette wraps instead of scrolling horizontally, so every Effect is visible at once on a phone rather than hidden behind a scroll.
