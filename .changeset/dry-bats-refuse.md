---
'@cyberdeck/golem': patch
---

One hardware dispatch per Step. When the Watchdog and the FPU run out on the same Step, the
Watchdog takes it and the FPU's interrupt stays pending, landing whole on the Step after — where
before the second dispatch overwrote `CR`/`IPC` with the hardware-1 vector as the return address,
losing the Watchdog's interrupt to a clobber inherited from the reference emulator.

The DEVICES panel now shows the FPU registers' raw words in the machine's own value-dependent
encoding, so the word beside `z = 19` is the `0x00000013` a program would actually read back.
