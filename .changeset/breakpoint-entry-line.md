---
'@cyberdeck/golem': patch
---

Check breakpoints before stepping, so a breakpoint on the line the PC starts at pauses a fresh `run` instead of being silently executed through. Resuming still moves off the line it stopped on.
