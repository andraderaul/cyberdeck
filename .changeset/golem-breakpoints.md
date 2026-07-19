---
'@cyberdeck/golem': minor
---

Debugging at the points you care about. `break <line>` pauses a run when the machine reaches that
line, `breaks` lists them and `unbreak` clears one or all. Breakpoints survive `reset`, since
repeated debugging runs are the normal case.

The locked Source becomes a listing with a gutter: the line the PC is on is marked and follows it
through a run, a step or a pause, and breakpointed lines carry a dot. Both are read-only marks —
a breakpoint is set with a command, never by clicking.
