// The encoding-table invariants the fixtures cannot reach. A green trace diff exercises only the
// opcodes the reference programs actually run — 7 of 11 branches, per CLAUDE.md — so `decode` and
// the opcode→mnemonic inverse are pinned here directly rather than left to the oracle.

import { describe, expect, it } from 'vitest'
import { BRANCH_OPCODE_SET, decode, INSTRUCTIONS, MNEMONIC_BY_OPCODE, packU } from './isa'

describe('decode', () => {
  it('unpacks the type U register fields, sixth bit included', () => {
    // pc is register 33 — reachable only because a U field is six bits wide.
    const word = ((0x00 << 26) | packU('z', 33) | packU('x', 5) | packU('y', 17)) >>> 0
    const { opcode, z, ux, uy } = decode(word)

    expect(opcode).toBe(0x00)
    expect(z).toBe(33)
    expect(ux).toBe(5)
    expect(uy).toBe(17)
  })

  it('unpacks the type F five-bit registers and the im16', () => {
    const word = ((0x01 << 26) | (0x1234 << 10) | (7 << 5) | 12) >>> 0
    const { opcode, fx, fy, im16 } = decode(word)

    expect(opcode).toBe(0x01)
    expect(fx).toBe(7)
    expect(fy).toBe(12)
    expect(im16).toBe(0x1234)
  })

  it('unpacks the 26-bit immediate of a type S word', () => {
    const word = ((0x3f << 26) | 0x123456) >>> 0
    const { opcode, im26 } = decode(word)

    expect(opcode).toBe(0x3f)
    expect(im26).toBe(0x123456)
  })
})

describe('MNEMONIC_BY_OPCODE', () => {
  it('is a faithful inverse of INSTRUCTIONS for every mnemonic', () => {
    for (const [mnemonic, spec] of Object.entries(INSTRUCTIONS)) {
      expect(MNEMONIC_BY_OPCODE[spec.opcode]).toBe(mnemonic)
    }
  })

  it('collapses no two mnemonics onto one opcode', () => {
    expect(Object.keys(MNEMONIC_BY_OPCODE)).toHaveLength(Object.keys(INSTRUCTIONS).length)
  })
})

describe('BRANCH_OPCODE_SET', () => {
  it('is the eleven S-form conditional branches, without int', () => {
    expect(BRANCH_OPCODE_SET.size).toBe(11)
    for (const opcode of BRANCH_OPCODE_SET) {
      expect(INSTRUCTIONS[MNEMONIC_BY_OPCODE[opcode]].form).toBe('S')
    }
    expect(BRANCH_OPCODE_SET.has(INSTRUCTIONS.int.opcode)).toBe(false)
  })
})
