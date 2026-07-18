import { describe, expect, it } from 'vitest'
import { parseCommand } from './command'

describe('parseCommand', () => {
  it.each(['asm', 'step', 'reset'])('parses %s', (name) => {
    expect(parseCommand(name)).toEqual({ kind: name })
  })

  it('ignores surrounding whitespace and case', () => {
    expect(parseCommand('  STEP  ')).toEqual({ kind: 'step' })
  })

  it('treats a blank line as nothing rather than an error', () => {
    expect(parseCommand('   ')).toEqual({ kind: 'empty' })
  })

  it('rejects arguments on a command that takes none', () => {
    const command = parseCommand('step 3')

    expect(command.kind).toBe('bad-arity')
  })

  // No buttons means discoverability is paid for here (ADR 0018).
  it('suggests the nearest command for a typo', () => {
    expect(parseCommand('stp')).toEqual({
      kind: 'unknown',
      input: 'stp',
      suggestion: 'step',
    })
  })

  it('offers no suggestion when nothing is close', () => {
    expect(parseCommand('elephant')).toEqual({
      kind: 'unknown',
      input: 'elephant',
      suggestion: null,
    })
  })
})
