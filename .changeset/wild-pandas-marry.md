---
'@cyberdeck/golem': minor
---

`int N` with a nonzero code now dispatches a software interrupt — the cause lands in `CR`, the
interrupted PC in `IPC`, and the PC jumps to the software vector, gated on the `IE` flag. `int 0`
still ends the simulation, and `halt` is still its alias.

The Console narrates every dispatch on its own surface, naming the cause and the vector, so an
interrupt taken mid-`run` is something you watch rather than deduce from a changed PC. Exported
traces carry the reference emulator's `[SOFTWARE INTERRUPTION]` marker, so they stay diffable.
