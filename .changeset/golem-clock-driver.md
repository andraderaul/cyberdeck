---
'@cyberdeck/golem': minor
---

Execution you can watch. `run` executes continuously, animated at a readable default rate so you
see the PC descend through the code rather than a final state appear. `clock N` sets the rate and
`clock max` runs at the frame budget's limit.

The driver always yields to the browser between frames, so an infinite loop in user code cannot
freeze the tab and `stop` always lands — verified in a real browser at ~600k steps/second, where
the page still responds in a millisecond. The Clock is presentation state: its rate survives
`reset`.
