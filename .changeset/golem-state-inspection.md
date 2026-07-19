---
'@cyberdeck/golem': minor
---

Seeing what the machine did. `reg <name>` prints one register in hex and decimal; `mem <start>
[count] [words|bytes]` dumps a range as words or as bytes, so the view matches the instruction
that wrote the region. A byte dump carries an ASCII gutter.

The flags stop being a hex blob: a Flags panel names EQ, LT, GT, ZD, OV and IV and lights the
ones that are set, and a Memory panel follows the machine as it runs. Everything stays read-only.
