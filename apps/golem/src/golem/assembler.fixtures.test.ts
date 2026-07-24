import { describe, expect, it } from 'vitest'
import {
  type FixtureName,
  GENERATED_PROGRAMS,
  INHERITED_PROGRAMS,
  loadFixture,
  parseHex,
  UNIT_2_PROGRAMS,
} from './__fixtures__/load'
import { assemble } from './assembler'

const hex = (word: number) => `0x${word.toString(16).toUpperCase().padStart(8, '0')}`

function assembledWords(name: FixtureName) {
  const fixture = loadFixture(name)
  const result = assemble(fixture.source)
  if (!result.ok) {
    throw new Error(
      `expected a clean assemble, got:\n${result.errors
        .map((error) => `  line ${error.line}: ${error.message}`)
        .join('\n')}`,
    )
  }
  // Compared as hex strings so a failure names the words rather than printing two decimal walls.
  return { actual: result.image.words.map(hex), expected: parseHex(fixture.hex).map(hex) }
}

/**
 * The assembler's real bar: every inherited program must assemble word-for-word equal to the
 * `.hex` the professor's assembler produced. That pairing is the one oracle nobody can
 * regenerate — see `__fixtures__/PROVENANCE.md`.
 */
describe.each([...INHERITED_PROGRAMS, ...UNIT_2_PROGRAMS])('%s (inherited oracle)', (name) => {
  it('assembles word-for-word equal to its .hex', () => {
    const { actual, expected } = assembledWords(name)

    expect(actual).toEqual(expected)
  })
})

/**
 * Weaker by construction: we encoded these `.hex` files ourselves, so agreement proves only that
 * the assembler matches the hand-encoding, not that either is right. What validates them is the
 * `.out` the reference emulator produced, which disassembles every instruction it executed.
 */
describe.each(GENERATED_PROGRAMS)('%s (self-consistency)', (name) => {
  it('assembles to the words we hand-encoded for the reference run', () => {
    const { actual, expected } = assembledWords(name)

    expect(actual).toEqual(expected)
  })
})
