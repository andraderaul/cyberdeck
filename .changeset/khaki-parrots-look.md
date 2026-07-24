---
'@cyberdeck/golem': minor
---

The DEVICES panel, where the invisible machinery becomes watchable: the Watchdog's counter
descending a tick per Step beside its enable bit, and the FPU's x, y and z as decoded floats
alongside the raw words they really are, with the in-flight operation and its remaining cycles.

The IE flag joins the named-flags display, so "interrupts are off" is legible at a glance rather
than something you deduce from a dispatch that never came.

Read-only like every panel but the Source editor — and more strictly than most, since even the
Console never writes a device register. Talking to Devices is the program's job.
