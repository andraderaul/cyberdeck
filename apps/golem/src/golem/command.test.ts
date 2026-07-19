import { describe, expect, it } from 'vitest'
import { parseCommand } from './command'

function suggestionFor(input: string): string | null {
  const command = parseCommand(input)
  if (command.kind !== 'unknown') {
    throw new Error(`expected "${input}" to be unknown, got ${command.kind}`)
  }
  return command.suggestion
}

describe('parseCommand', () => {
  it.each(['asm', 'step', 'reset', 'run', 'stop'])('parses %s', (name) => {
    expect(parseCommand(name)).toEqual({ kind: name })
  })

  it.each([
    ['clock 30', 30],
    ['clock 1', 1],
    ['clock max', 'max'],
    ['clock MAX', 'max'],
  ])('parses %s', (input, rate) => {
    expect(parseCommand(input)).toEqual({ kind: 'clock', rate })
  })

  it.each([
    'clock',
    'clock 0',
    'clock -5',
    'clock 2.5',
    'clock fast',
    'clock 30 40',
  ])('rejects %s with usage rather than guessing', (input) => {
    expect(parseCommand(input).kind).toBe('bad-usage')
  })

  it('parses reg with a register name', () => {
    expect(parseCommand('reg r1')).toEqual({ kind: 'reg', name: 'r1' })
    expect(parseCommand('reg PC')).toEqual({ kind: 'reg', name: 'pc' })
  })

  it.each(['reg', 'reg r1 r2'])('rejects %s with usage', (input) => {
    expect(parseCommand(input).kind).toBe('bad-usage')
  })

  it.each([
    ['mem 0', { start: 0, count: 8, unit: 'words' }],
    ['mem 16 4', { start: 16, count: 4, unit: 'words' }],
    ['mem 0x10 4', { start: 16, count: 4, unit: 'words' }],
    ['mem 0 16 bytes', { start: 0, count: 16, unit: 'bytes' }],
    ['mem 0 words', { start: 0, count: 8, unit: 'words' }],
  ])('parses %s', (input, expected) => {
    expect(parseCommand(input)).toEqual({ kind: 'mem', ...expected })
  })

  it.each([
    'mem',
    'mem -1',
    'mem 0 0',
    'mem 0 9999',
    'mem 0 4 nibbles',
    'mem a b c d',
  ])('rejects %s with usage', (input) => {
    expect(parseCommand(input).kind).toBe('bad-usage')
  })

  it('ignores surrounding whitespace and case', () => {
    expect(parseCommand('  STEP  ')).toEqual({ kind: 'step' })
  })

  it('treats a blank line as nothing rather than an error', () => {
    expect(parseCommand('   ')).toEqual({ kind: 'empty' })
  })

  it('rejects arguments on a command that takes none', () => {
    expect(parseCommand('step 3').kind).toBe('bad-usage')
  })

  // No buttons means discoverability is paid for here (ADR 0018).
  it('suggests the nearest command for a typo', () => {
    expect(parseCommand('stepp')).toEqual({
      kind: 'unknown',
      input: 'stepp',
      suggestion: 'step',
    })
    expect(suggestionFor('rset')).toBe('reset')
  })

  // `stp` sits one edit from both `step` and `stop`, so whichever wins is arbitrary. What must
  // not happen is no suggestion at all.
  it('still suggests something for a typo equidistant from two commands', () => {
    expect(suggestionFor('stp')).not.toBeNull()
  })

  it('offers no suggestion when nothing is close', () => {
    expect(parseCommand('elephant')).toEqual({
      kind: 'unknown',
      input: 'elephant',
      suggestion: null,
    })
  })
})
