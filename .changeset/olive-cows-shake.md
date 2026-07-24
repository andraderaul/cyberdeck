---
'@cyberdeck/golem': minor
---

The Watchdog — the first Device with a clock. Its control register is memory-mapped at word
`0x2020`, holding an enable bit and a countdown; a program arms it by writing both. The counter
decrements once per Step, in lockstep with execution, and fires hardware interrupt 1 when it runs
out, narrated on the Console and marked `[HARDWARE INTERRUPTION 1]` in the trace.

`2_watchdog` now runs end to end, which makes the signature scene real: `load watchdog`, `run`, and
watch an infinite loop lose to a countdown.
