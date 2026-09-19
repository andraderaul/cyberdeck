---
'@cyberdeck/ascii': patch
---

The Worker's return leg transfers instead of cloning. A converted frame comes back as a
**PackedFrame** — one code point and one packed colour per cell, in two `Uint32Array`s — rather than
an array of `{char, x, y, color}` objects: x and y are arithmetic on the index and `cols`, and the
rows TXT Export writes are derived at the click rather than carried on every frame. Measured at the
two grids ADR 0002 records, the main thread's share of the return leg goes from ~4–5 ms at 24,000
cells and ~28–34 ms at 150,000 to nothing measurable at either, against a 66 ms frame budget.

The output is identical, and the thirty digests that pin every Export of every Preset pass
unregenerated.
