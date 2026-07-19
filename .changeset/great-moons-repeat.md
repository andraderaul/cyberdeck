---
'@cyberdeck/golem': minor
---

ISRs are writable: `isr` and `reti` assemble and execute per the reference spec, and `enai` enters
as the assembler's first macro — expanding to the two words the reference assembler emits, scratch
register and all.

The remaining software-interrupt causes land with them. A division by zero raises cause `0x01` and
an invalid instruction cause `0x2A`, both gated on `IE`, and an invalid instruction names its PC in
the trace. Malformed `isr`, `reti`, `int` and `enai` operands now fail at assemble time with a line
number and a specific message.

A breakpoint on an ISR line pauses a run inside the handler — an ISR is a line like any other, so
debugging one needs no new grammar.

`2_interruption` now assembles word-for-word to its `.hex` and runs trace-for-trace against its
`.out`.
