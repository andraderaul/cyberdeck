# GOLEM inherits the Poxim ISA bit-for-bit, and keeps its mnemonics canonical

GOLEM//Console's instruction set is not designed — it is inherited, unchanged at the bit level, from
**Poxim**, the didactic 32-bit architecture used in the Arquitetura de Computadores course (UFS, 2017).
"GOLEM" is the name and the fiction; the encoding, the register file (`R0–R31` plus `PC`, `IR`, `ER`,
`FR`, `CR`, `IPC`), the memory-mapped Terminal at `0x0000888B` and the 42 mnemonics are Poxim's. The
original mnemonics stay canonical; readable **aliases** (`jmp` for `bun`, `halt` for `int`) are accepted
alongside them.

## Why not design our own ISA

Because the reference material buys two test oracles that a new ISA would throw away, and both were
verified before this was decided:

- **Emulator oracle** — the original C emulator (three programs, one per course unit) still compiles
  clean under clang in 2026 and emits a line-by-line trace with register state. Any GOLEM program can
  be diffed against it.
- **Assembler oracle** — the course ships 10+ programs as paired `.s` / `.hex` / `.out` files. The
  assembler is the half that never existed and must be written from scratch; these pairs are its
  fixtures.

The oracle is worth more than authorship here. Writing an emulator without a reference is like writing
a parser without a grammar — you find the bugs months later, by accident. Concretely: the reference
revealed that `R0` is forced to zero every cycle, which a from-memory reimplementation would have
turned into a ghost bug. Divergence stays available later, once the machine runs and is tested, which
is the cheap moment for it.

## Why aliases instead of renaming

Renaming the mnemonics outright looked nearly free until the fixtures were examined: they are written
in `bun`, `bzd`, `ldw`. An assembler that only accepts `jmp`, `jz`, `load` cannot read them, so
renaming costs the assembler oracle — the safety net for the riskiest, least-referenced part of the
project. An alias table is a few dozen lines and gives both: the course fixtures assemble untouched,
and new GOLEM programs are written in legible names.

## Consequences

- **The course material is never versioned.** It is third-party work and contains other students'
  submissions with names and enrolment numbers. `.gitignore` excludes it; it is a local reference only.
- **`ISA.md` is written in our own words.** `formato_de_saida.txt` already specifies all 42
  instructions formally, but it is the professor's text — the published spec restates it rather than
  redistributing it, and the README credits the origin.
- **Poxim's didactic quirks come along.** The `0x0000888B` Terminal and the cycle-counting FPU are
  teaching choices, not design ones. They are kept because they are what the oracles encode.
- **Its bugs do not.** The reference's `ble` is broken by a typo (`0x20` for `0x02`) and never
  branches on "less than"; GOLEM implements it correctly. This costs no oracle coverage — no fixture
  uses `ble`, which is precisely why the bug survived. `ISA.md` records this and every other
  deliberate divergence.
- **The oracle's coverage is uneven, and that is now documented.** Four of eleven branches are never
  executed by any reference program, so a green diff does not mean a correct implementation. Those
  need hand-written tests; `ISA.md` lists which.
