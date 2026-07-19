import { describe, expect, it } from 'vitest'
import { GENERATED_PROGRAMS, INHERITED_PROGRAMS, loadFixture, parseHex } from './__fixtures__/load'
import { createMachine, type Machine, step } from './machine'
import { formatHex, formatTrace } from './trace'

const ALL = [...INHERITED_PROGRAMS, ...GENERATED_PROGRAMS]

function traceOf(words: number[], limit = 2000): string {
  let machine = createMachine({ words, lineForWord: [] })
  const steps: { before: Machine; after: Machine }[] = []

  for (let index = 0; index < limit && !machine.halted; index++) {
    const before = machine
    machine = step(machine)
    steps.push({ before, after: machine })
  }

  return formatTrace(steps)
}

/**
 * The point of keeping the formatter outside `step`: the log can be diffed against the reference
 * emulator without the log's format becoming part of the machine's semantics.
 */
describe.each(ALL)('%s', (name) => {
  it('produces a trace that diffs clean against the reference .out', () => {
    const fixture = loadFixture(name)

    const actual = traceOf(parseHex(fixture.hex)).trimEnd().split('\n')
    const expected = fixture.out.trimEnd().split('\n')

    expect(actual).toEqual(expected)
  })
})

describe('formatHex', () => {
  // Compared with trailing whitespace trimmed: the vendored files disagree about how they end —
  // one carries a blank line, another no final newline at all — and #135 keeps them byte-identical
  // to the originals rather than tidying them. An export should be well-formed regardless.
  it.each(ALL)('round-trips %s back to its .hex', (name) => {
    const fixture = loadFixture(name)

    expect(formatHex(parseHex(fixture.hex)).trimEnd()).toBe(fixture.hex.trimEnd())
  })

  it('writes one 0x-prefixed word per line and ends with a newline', () => {
    expect(formatHex([0x94004800, 0])).toBe('0x94004800\n0x00000000\n')
  })
})
