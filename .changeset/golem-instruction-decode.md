---
'@cyberdeck/golem': patch
---

Spell an instruction's field layout and its opcode→mnemonic mapping once. The machine's `execute`
and the trace disassembler had each re-derived the seven encoded fields (`z`/`ux`/`uy`/`fx`/`fy`/
`im16`/`im26`) verbatim; both now share one `decode(word)` beside `packU`/`unpackU` in the ISA
tables. The trace's `BRANCHES` map and the mnemonic column of its `BINARY_U`/`BINARY_F` tables,
which re-listed what `INSTRUCTIONS` already holds, are gone: the disassembler reads a single
`MNEMONIC_BY_OPCODE` inverse instead, keeping only the printed symbol and FR/ER metadata that are
its own.

Behaviour is unchanged — every reference trace still diffs bit-for-bit — and a new `isa` test pins
the inverse and the decode for the opcodes no fixture traces.
