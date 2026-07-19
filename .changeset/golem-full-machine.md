---
'@cyberdeck/golem': minor
---

The machine executes all 42 instructions: arithmetic and logic with correct flags, word and byte
memory addressing, the stack through `push`/`pop`, `call`/`ret`, and the memory-mapped Terminal.

Every vendored reference program now runs step-for-step identically to the trace the reference
emulator produced — 846 assertions over 644 executed instructions. `ble` implements `LT ∨ EQ`,
diverging deliberately from the reference's typo, and it is covered by hand-written tests along
with `blt`, `bnz` and `bni`, which no reference program executes.
