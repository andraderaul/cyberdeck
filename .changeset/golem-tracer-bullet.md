---
'@cyberdeck/golem': minor
---

GOLEM//Console executes its first program. Write assembly in the Source editor, `asm` it, and
`step` through it while the register panel updates — a narrow slice of the ISA (`add`, `addi`,
`int`) carried end to end.

The three-state model is enforced rather than documented: the editor is writable only while no
Machine exists, `asm` freezes the Source and instantiates one, and `reset` destroys it and gives
editing back. The Console is the only control grammar — no buttons, and unknown commands suggest
the nearest real one.
