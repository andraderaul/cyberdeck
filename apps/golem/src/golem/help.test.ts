import { describe, expect, it } from 'vitest'
import { COMMAND_NAMES } from './command'
import { GREETING, helpFor, helpLines } from './help'

describe('the command reference', () => {
  // With no buttons to click, an undocumented command is an invisible one.
  it('documents every command the parser accepts', () => {
    const reference = helpLines().join('\n')

    for (const name of COMMAND_NAMES) {
      expect(reference).toContain(name)
    }
  })

  it('names help itself, since that is how anyone finds the rest', () => {
    expect(GREETING).toContain('help')
  })

  it('explains a single command in more detail than the list does', () => {
    const summary = helpLines().find((line) => line.includes('clock')) ?? ''
    const detail = helpFor('clock').join('\n')

    expect(detail).toContain('clock <steps per second | max>')
    expect(detail.length).toBeGreaterThan(summary.length)
  })

  it.each([...COMMAND_NAMES])('has a detail page for %s', (name) => {
    expect(helpFor(name)[0]).not.toMatch(/no command called/)
  })

  it('nudges rather than failing flatly on an unknown topic', () => {
    expect(helpFor('banana').join('\n')).toMatch(/no command called "banana"/)
  })
})
