import { describe, expect, it } from 'vitest'
import { assemble } from './assembler'

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

describe('assemble', () => {
  it('encodes addi with the immediate in bits 25-10 and the destination in x', () => {
    // Cross-checked against the 1_fibonacci fixture, where `addi r6, r0, 1` is 0x040004C0.
    expect(wordsOf('addi r6, r0, 1')).toEqual([0x040004c0])
  })

  it('encodes add with z as the destination, not the field order', () => {
    // add r7, r1, r4 -> z=7, x=1, y=4
    expect(wordsOf('add r7, r1, r4')).toEqual([(7 << 10) | (1 << 5) | 4])
  })

  it('encodes int 0 as the halt word the fixtures end on', () => {
    expect(wordsOf('int 0')).toEqual([0xfc000000])
  })

  it('accepts halt as an alias for int', () => {
    expect(wordsOf('halt 0')).toEqual(wordsOf('int 0'))
  })

  it('strips // comments and ignores indentation', () => {
    const source = ['// leading comment', '\t addi r1, r0, 5   // trailing', '', '  int 0'].join(
      '\n',
    )

    expect(wordsOf(source)).toEqual(wordsOf('addi r1, r0, 5\nint 0'))
  })

  it('maps each word back to the source line that produced it', () => {
    const result = assemble('// comment\naddi r1, r0, 1\n\nint 0')
    if (!result.ok) {
      throw new Error('expected a clean assemble')
    }

    expect(result.image.lineForWord).toEqual([2, 4])
  })

  it('accepts special registers by name', () => {
    expect(wordsOf('addi pc, r0, 0')).toEqual([(0x01 << 26) | (32 << 5)])
  })
})

describe('assemble errors', () => {
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

  it('reports an unknown instruction by name', () => {
    expect(errorsOf('frobnicate r1, r2, r3')).toEqual([
      { line: 1, message: 'Unknown instruction "frobnicate"' },
    ])
  })

  it('reports wrong operand counts', () => {
    expect(errorsOf('add r1, r2')[0].message).toMatch(/takes 3 operands, got 2/)
  })

  // A program with three typos should take one pass to fix, not three.
  it('reports every error, not just the first', () => {
    expect(errorsOf('addi r99, r0, 1\nbogus\nadd r1, r2')).toHaveLength(3)
  })
})
