import { describe, expect, it } from 'vitest'
import { assemble, wordIndexForLine } from './assembler'

function wordsOf(source: string): number[] {
  const result = assemble(source)
  if (!result.ok) {
    throw new Error(`expected a clean assemble, got ${JSON.stringify(result.errors)}`)
  }
  return result.image.words
}

function errorsOf(source: string) {
  const result = assemble(source)
  if (result.ok) {
    throw new Error('expected errors, got an Image')
  }
  return result.errors
}

describe('encoding', () => {
  it('puts the destination in z for type U, not in field order', () => {
    // add r7, r1, r4 -> z=7, x=1, y=4
    expect(wordsOf('add r7, r1, r4')).toEqual([(7 << 10) | (1 << 5) | 4])
  })

  it('encodes addi with the immediate in bits 25-10', () => {
    // Cross-checked against 1_fibonacci, where `addi r6, r0, 1` is 0x040004C0.
    expect(wordsOf('addi r6, r0, 1')).toEqual([0x040004c0])
  })

  // Six-bit register fields in type U: the sixth bit sits apart, at bits 17/16/15.
  it('addresses a special register in type U via the detached sixth bit', () => {
    // cmp pc, pc -> x=32, y=32, so bit 16 and bit 15 are both set.
    expect(wordsOf('cmp pc, pc')).toEqual([((0x08 << 26) | (1 << 16) | (1 << 15)) >>> 0])
  })

  it('rejects a special register where type F has no room for one', () => {
    expect(errorsOf('addi pc, r0, 0')[0].message).toMatch(/no field wide enough/)
  })

  // There is no shift of zero, so the field counts from one and stores N-1.
  it('stores a shift as N-1', () => {
    // 1_limits assembles `shl r2, r2, 16` to a y field of 15.
    expect(wordsOf('shl r2, r2, 16')).toEqual([0x2800084f])
  })

  it('rejects a shift outside 1..64', () => {
    expect(errorsOf('shl r1, r1, 0')[0].message).toMatch(/out of range/)
    expect(errorsOf('shl r1, r1, 65')[0].message).toMatch(/out of range/)
  })

  // The inherited asymmetry: stores put the immediate in the middle, loads do not.
  it('keeps the store operand order distinct from the load one', () => {
    expect(wordsOf('stw r4, 0, r2')).toEqual([((0x16 << 26) | (4 << 5) | 2) >>> 0])
    expect(wordsOf('ldw r5, r4, 0')).toEqual([((0x14 << 26) | (5 << 5) | 4) >>> 0])
  })

  it('assembles nop to the zero word', () => {
    expect(wordsOf('nop')).toEqual([0])
  })

  it('encodes int 0 as the halt word the fixtures end on', () => {
    expect(wordsOf('int 0')).toEqual([0xfc000000])
  })
})

describe('aliases', () => {
  it.each([
    ['halt 0', 'int 0'],
    ['jmp 4', 'bun 4'],
    ['jle 4', 'ble 4'],
    ['lsl r1, r1, 2', 'shl r1, r1, 2'],
    ['load r1, r0, 0', 'ldw r1, r0, 0'],
    ['storeb r1, 0, r2', 'stb r1, 0, r2'],
  ])('accepts %s wherever %s is accepted', (alias, canonical) => {
    expect(wordsOf(alias)).toEqual(wordsOf(canonical))
  })
})

describe('labels', () => {
  it('resolves a label to its word index, forward and backward', () => {
    const source = ['bun forward', 'nop', 'forward:', 'bun forward', 'back:', 'bun back'].join('\n')

    // forward sits at word 2, back at word 3.
    expect(wordsOf(source)).toEqual([
      ((0x1a << 26) | 2) >>> 0,
      0,
      ((0x1a << 26) | 2) >>> 0,
      ((0x1a << 26) | 3) >>> 0,
    ])
  })

  it('lets a label share a line with the instruction it names', () => {
    expect(wordsOf('start:\tbun start')).toEqual(wordsOf('start:\nbun start'))
  })

  it('counts a data word when fixing later labels', () => {
    // The data word occupies word 0, so `after` is word 1.
    expect(wordsOf('42\nafter:\nbun after')).toEqual([42, ((0x1a << 26) | 1) >>> 0])
  })

  it('names an undefined label in the error', () => {
    expect(errorsOf('bun nowhere')).toEqual([{ line: 1, message: 'Undefined label "nowhere"' }])
  })

  it('reports a label defined twice', () => {
    expect(errorsOf('a:\nnop\na:\nnop')[0].message).toMatch(/defined twice/)
  })
})

describe('data', () => {
  it('accepts decimal and hex words', () => {
    expect(wordsOf('10\n0x0000888B')).toEqual([10, 0x0000888b])
  })

  // Big-endian within the word, so `ldb` reads the characters back in written order.
  it('packs a string into bytes and NUL-terminates it', () => {
    expect(wordsOf('"AB"')).toEqual([0x41420000])
  })

  it('honours escapes', () => {
    expect(wordsOf('"A\\n"')).toEqual([0x410a0000])
  })

  it('spills a long string across words', () => {
    // "Hello" is 5 bytes plus a NUL, so two words.
    expect(wordsOf('"Hello"')).toHaveLength(2)
  })

  it.each([
    ['"unterminated', /missing its closing quote/],
    ['"bad\\q"', /Unknown escape/],
    ['"trailing" junk', /Unexpected/],
  ])('reports %s as a malformed string', (source, message) => {
    const [error] = errorsOf(source)

    expect(error.line).toBe(1)
    expect(error.message).toMatch(message)
  })
})

describe('errors', () => {
  it('returns errors rather than throwing', () => {
    expect(() => assemble('nonsense r1')).not.toThrow()
  })

  it('names an invalid register and the line it is on', () => {
    expect(errorsOf('addi r1, r0, 1\naddi r99, r0, 1')).toEqual([
      { line: 2, message: '"r99" is not a register' },
    ])
  })

  it('rejects an out-of-range immediate instead of truncating it', () => {
    const [error] = errorsOf('addi r1, r0, 70000')

    expect(error.line).toBe(1)
    expect(error.message).toMatch(/does not fit in 16 bits/)
  })

  // -1 would silently encode as 65535, since the machine reads im16 unsigned.
  it('rejects a negative immediate and points at subi', () => {
    expect(errorsOf('addi r1, r0, -1')[0].message).toMatch(/unsigned here, use subi/)
  })

  it('reports wrong operand counts', () => {
    expect(errorsOf('add r1, r2')[0].message).toMatch(/takes 3 operands, got 2/)
  })

  // A program with three typos should take one pass to fix, not three.
  it('reports every error, not just the first', () => {
    expect(errorsOf('addi r99, r0, 1\nbun nowhere\nadd r1, r2')).toHaveLength(3)
  })
})

describe('source mapping', () => {
  it('strips // comments and ignores indentation', () => {
    const source = ['// leading', '\t addi r1, r0, 5   // trailing', '', '  int 0'].join('\n')

    expect(wordsOf(source)).toEqual(wordsOf('addi r1, r0, 5\nint 0'))
  })

  it('maps each word back to the source line that produced it', () => {
    const result = assemble('// comment\naddi r1, r0, 1\n\nint 0')
    if (!result.ok) {
      throw new Error('expected a clean assemble')
    }

    expect(result.image.lineForWord).toEqual([2, 4])
  })

  it('exposes the inverse mapping breakpoints resolve through', () => {
    const result = assemble('addi r1, r0, 1\n\nint 0')
    if (!result.ok) {
      throw new Error('expected a clean assemble')
    }

    expect(wordIndexForLine(result.image)).toEqual(
      new Map([
        [1, 0],
        [3, 1],
      ]),
    )
  })
})

// The assembler's first Macro, and the only one. What makes it a macro rather than an alias is
// that it expands to *two* words — see CONTEXT.md.
describe('the enai macro', () => {
  it('expands to the two words the reference assembler emits', () => {
    // Pinned by all three unit-2 .hex fixtures, which carry exactly this pair.
    expect(wordsOf('enai r1')).toEqual([0x04010020, 0x40030c61])
  })

  it('uses its operand register as the scratch, so a different register moves both words', () => {
    const [load, or] = wordsOf('enai r2')

    expect(load).not.toBe(0x04010020)
    expect(or).not.toBe(0x40030c61)
  })

  // Two words from one line: a label after `enai` must land past both, or every jump in a
  // reference program would be off by one.
  it('advances the label counter by two', () => {
    const result = assemble('enai r1\nafter:\nbun after')
    if (!result.ok) {
      throw new Error(`expected a clean assemble, got ${JSON.stringify(result.errors)}`)
    }

    expect(result.image.words).toHaveLength(3)
    // `bun` to word 2 — the instruction after the expansion.
    expect(result.image.words[2] & 0x3ffffff).toBe(2)
  })

  it('maps both of its words back to the one line that wrote them', () => {
    const result = assemble('addi r1, r0, 1\nenai r1\nint 0')
    if (!result.ok) {
      throw new Error('expected a clean assemble')
    }

    expect(result.image.lineForWord).toEqual([1, 2, 2, 3])
  })
})

describe('unit-2 operand errors', () => {
  it('rejects enai with no register, naming the line', () => {
    expect(errorsOf('addi r1, r0, 1\nenai')).toEqual([
      { line: 2, message: '"enai" takes one register, e.g. enai r1' },
    ])
  })

  it('rejects enai with more than one operand', () => {
    expect(errorsOf('enai r1, r2')[0].message).toMatch(/takes one register/)
  })

  it('rejects enai on something that is not a register', () => {
    expect(errorsOf('enai banana')).toEqual([{ line: 1, message: '"banana" is not a register' }])
  })

  it('rejects isr without its target', () => {
    expect(errorsOf('isr r31, r30')).toHaveLength(1)
  })

  it('rejects reti with no register', () => {
    expect(errorsOf('reti')).toHaveLength(1)
  })

  it('rejects int without a code', () => {
    expect(errorsOf('int')).toHaveLength(1)
  })
})
