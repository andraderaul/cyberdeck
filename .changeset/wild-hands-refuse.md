---
'@cyberdeck/golem': patch
---

`asm` and `run` refuse a Source that assembles to zero words — blank lines and comments produced
an empty image without error, and `run` over it started a run that could never halt: every fetch
of zeroed memory is an implicit nop, and no `int 0` ever arrives. The Console now answers
`nothing to assemble — the Source has no instructions` and leaves the editor unlocked.
