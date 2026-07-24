import { describe, expect, it } from 'vitest'
import { bitsAsFloat, floatBits, referenceExponent } from './float'

describe('floatBits', () => {
  it('encodes the value the reference trace shows', () => {
    // `2_fpu` divides 74 by 8 and reads 0x41140000 back out of z.
    expect(floatBits(9.25)).toBe(0x41140000)
    expect(floatBits(18.5)).toBe(0x41940000)
  })

  it('round-trips through bitsAsFloat', () => {
    for (const value of [0, 1, 9.25, 18.5, 4.625, -3.5]) {
      expect(bitsAsFloat(floatBits(value))).toBe(value)
    }
  })
})

describe('referenceExponent', () => {
  // The reference masks with 0x7F80000 where IEEE-754 puts the exponent at 0x7F800000 — one hex
  // digit short. Replicated on purpose, because it is what makes the fixture's cycle counts come
  // out: the divide costs 4 and the multiply 3 only under the broken mask.
  it('reproduces the cycle counts 2_fpu pins', () => {
    // 74 / 8: |exponent(74.0) - exponent(8.0)| + 1 = 4.
    expect(Math.abs(referenceExponent(74) - referenceExponent(8)) + 1).toBe(4)
    // 9.25 * 2: |exponent(9.25) - exponent(2.0)| + 1 = 3.
    expect(Math.abs(referenceExponent(9.25) - referenceExponent(2)) + 1).toBe(3)
  })

  it('is not the real IEEE-754 exponent, and is not meant to be', () => {
    // The true biased exponent of 74.0 is 133; the broken mask yields a small number instead.
    expect(referenceExponent(74)).not.toBe(133)
    expect(referenceExponent(74)).toBeLessThan(16)
  })
})
