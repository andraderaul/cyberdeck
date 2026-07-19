---
'@cyberdeck/golem': minor
---

Getting work out of the deck. `export hex` downloads the assembled Image in the reference `.hex`
format so it can run in another implementation of this ISA; `export trace` downloads the
execution log so it can be diffed against a reference emulator.

The trace formatter is a pure function kept deliberately outside `step`, which is what lets the
log be compared against the oracle without the log's format becoming part of the machine's
semantics. A test asserts every vendored program's trace diffs clean against its `.out`.
