---
'@cyberdeck/golem': minor
---

The FPU — the second Device, driven entirely by the program through memory-mapped `x`, `y`, `z`
and `control` registers. Writing an operation to `control` starts work that costs cycles, consumed
one per Step, and completion fires hardware interrupt 2. Faults — a zero divisor, an undefined
operation — raise an error bit the program can read back.

Devices are now intercepted on the machine's single memory-access path, so `ldw`, `stw`, `push` and
`pop` all agree about them without four copies of the same check.

`2_fpu` runs end to end, which makes all four unit-2 reference programs green — the whole of the
unit, against the reference oracle.
