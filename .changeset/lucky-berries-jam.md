---
'@cyberdeck/golem': minor
---

A byte written to the Terminal now stays readable at its address, so a program can `ldb` back what
it just printed. The Terminal is a device *and* an address; the character still echoes to the
Terminal panel exactly as before.

Exported traces gained the reference emulator's `[TERMINAL]` section, which carries the program's
output under the trace and only appears when the program printed something.

With those two, `2_hello_world` — the first unit-2 reference program — assembles word-for-word to
its `.hex` and runs trace-for-trace against its `.out`.
