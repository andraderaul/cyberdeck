import { describe, expect, it } from 'vitest'
import {
  type FixtureName,
  GENERATED_PROGRAMS,
  INHERITED_PROGRAMS,
  loadFixture,
  parseHex,
} from './load'

const ALL = [...INHERITED_PROGRAMS, ...GENERATED_PROGRAMS]

describe('loadFixture', () => {
  it.each(ALL)('loads all three forms of %s', (name) => {
    const fixture = loadFixture(name)

    expect(fixture.source.trim()).not.toBe('')
    expect(fixture.hex.trim()).not.toBe('')
    expect(fixture.out).toContain('[START OF SIMULATION]')
    expect(fixture.out).toContain('[END OF SIMULATION]')
  })

  // A silently-skipped fixture is worse than no fixture: the suite stays green while the oracle
  // it claims to check is gone.
  it('throws on an unknown program rather than returning an empty fixture', () => {
    expect(() => loadFixture('nope' as FixtureName)).toThrow(/Missing fixture nope\.s/)
  })
})

describe('parseHex', () => {
  it('parses a fixture into 32-bit words', () => {
    const words = parseHex(loadFixture('1_fibonacci').hex)

    // The interrupt vector: entry `call`, then three nop handlers (ISA.md, memory layout).
    expect(words.slice(0, 4)).toEqual([0x94004800, 0, 0, 0])
    expect(words).toHaveLength(33)
    expect(words.every((word) => word >= 0 && word <= 0xffffffff)).toBe(true)
  })

  it('rejects a malformed word instead of yielding NaN', () => {
    expect(() => parseHex('0x00000000\nnot-a-word\n')).toThrow(/line 2/)
  })
})
