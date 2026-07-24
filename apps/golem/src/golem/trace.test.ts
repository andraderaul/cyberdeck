import { describe, expect, it } from 'vitest'
import {
  GENERATED_PROGRAMS,
  INHERITED_PROGRAMS,
  loadFixture,
  parseHex,
  UNIT_2_PROGRAMS,
} from './__fixtures__/load'
import { assemble } from './assembler'
import { createMachine, type Machine, type StepEvent, step } from './machine'
import { formatHex, formatStep, formatTrace } from './trace'

const ALL = [...INHERITED_PROGRAMS, ...UNIT_2_PROGRAMS, ...GENERATED_PROGRAMS]

function traceOf(words: number[], limit = 2000): string {
  let machine = createMachine({ words, lineForWord: [] })
  const steps: { before: Machine; after: Machine; events: readonly StepEvent[] }[] = []

  for (let index = 0; index < limit && !machine.halted; index++) {
    const before = machine
    const result = step(machine)
    machine = result.machine
    steps.push({ before, after: machine, events: result.events })
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

describe('event lines', () => {
  function traceOfSource(source: string, limit = 20): string[] {
    const result = assemble(source)
    if (!result.ok) {
      throw new Error(`bad fixture source: ${JSON.stringify(result.errors)}`)
    }

    let machine = createMachine(result.image)
    const steps: { before: Machine; after: Machine; events: readonly StepEvent[] }[] = []
    for (let index = 0; index < limit && !machine.halted; index++) {
      const before = machine
      const stepped = step(machine)
      machine = stepped.machine
      steps.push({ before, after: machine, events: stepped.events })
    }

    return formatTrace(steps).split('\n')
  }

  // The reference writes the marker *after* the two lines of the instruction that caused it, so a
  // diff against the reference `.out` depends on this ordering as much as on the wording.
  it('marks a software interrupt after the int that raised it', () => {
    const lines = traceOfSource(['addi r1, r0, 64', 'or fr, fr, r1', 'int 2', 'int 0'].join('\n'))

    const marker = lines.indexOf('[SOFTWARE INTERRUPTION]')
    expect(marker).toBeGreaterThan(0)
    expect(lines[marker - 2]).toBe('int 2')
    expect(lines[marker - 1]).toBe('[S] CR = 0x00000002, PC = 0x0000000C')
  })

  // Guards the unit-1 oracle: a step that raises nothing must still format as exactly the two
  // lines it did before the event stream existed, or every inherited fixture goes red.
  it('leaves an uninterrupted step at its original two lines', () => {
    const machine = createMachine({ words: [0], lineForWord: [] })

    expect(formatStep(machine, step(machine).machine).split('\n')).toHaveLength(2)
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
