---
'@cyberdeck/golem': minor
---

The assembler handles the full ISA: all 42 instructions in their three encoding forms, labels
resolved in two passes to word indices, bare data as decimal, hex or NUL-terminated strings with
escapes, and the readable mnemonic aliases (`jmp`, `halt`, `load`) alongside the canonical names.

Errors come back as a list carrying line numbers — undefined label named, invalid register,
out-of-range immediate, malformed string — so a program with three typos takes one pass to fix.

All five inherited reference programs now assemble word-for-word equal to their `.hex`.
