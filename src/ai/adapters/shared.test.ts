import { describe, expect, it } from 'vitest'
import { AuthError, NetworkError, ParseError, QuotaError } from '../errors'
import { ANALYZE_TIMEOUT_MS, mapHttpError, PROMPT, parseJsonOrThrow } from './shared'

// ─── constants ───────────────────────────────────────────────────────────────

describe('ANALYZE_TIMEOUT_MS', () => {
  it('is 30 000', () => {
    expect(ANALYZE_TIMEOUT_MS).toBe(30_000)
  })
})

describe('PROMPT', () => {
  it('is a non-empty string', () => {
    expect(typeof PROMPT).toBe('string')
    expect(PROMPT.length).toBeGreaterThan(0)
  })
})

// ─── mapHttpError ─────────────────────────────────────────────────────────────

describe('mapHttpError', () => {
  it('throws AuthError on status 401', () => {
    expect(() => mapHttpError({ status: 401 })).toThrow(AuthError)
  })

  it('throws AuthError on status 403', () => {
    expect(() => mapHttpError({ status: 403 })).toThrow(AuthError)
  })

  it('throws QuotaError on status 429', () => {
    expect(() => mapHttpError({ status: 429 })).toThrow(QuotaError)
  })

  it('throws NetworkError on any other status', () => {
    expect(() => mapHttpError({ status: 500 })).toThrow(NetworkError)
  })

  it('throws NetworkError when no status and no matching hints', () => {
    expect(() => mapHttpError({ message: 'something else' })).toThrow(NetworkError)
  })

  it('throws AuthError when message includes an authMessageHint', () => {
    expect(() =>
      mapHttpError(
        { message: 'API_KEY_INVALID details' },
        { authMessageHints: ['API_KEY_INVALID'] },
      ),
    ).toThrow(AuthError)
  })

  it('throws QuotaError when message includes a quotaMessageHint', () => {
    expect(() =>
      mapHttpError(
        { message: 'RESOURCE_EXHAUSTED details' },
        { quotaMessageHints: ['RESOURCE_EXHAUSTED'] },
      ),
    ).toThrow(QuotaError)
  })

  it('status takes precedence over message hints', () => {
    // status 401 wins even if no hints provided
    expect(() =>
      mapHttpError(
        { status: 401, message: 'RESOURCE_EXHAUSTED' },
        { quotaMessageHints: ['RESOURCE_EXHAUSTED'] },
      ),
    ).toThrow(AuthError)
  })
})

// ─── parseJsonOrThrow ─────────────────────────────────────────────────────────

describe('parseJsonOrThrow', () => {
  it('returns parsed value for valid JSON', () => {
    expect(parseJsonOrThrow('{"a":1}')).toEqual({ a: 1 })
  })

  it('throws ParseError for invalid JSON', () => {
    expect(() => parseJsonOrThrow('not json')).toThrow(ParseError)
  })

  it('strips ```json code fence before parsing when stripCodeFence is true', () => {
    const payload = { description: 'x', threatLevel: 'LOW', tags: ['y'] }
    const fenced = `\`\`\`json\n${JSON.stringify(payload)}\n\`\`\``
    expect(parseJsonOrThrow(fenced, { stripCodeFence: true })).toEqual(payload)
  })

  it('throws ParseError when stripped fence text is still invalid JSON', () => {
    const fenced = '```json\nnot json\n```'
    expect(() => parseJsonOrThrow(fenced, { stripCodeFence: true })).toThrow(ParseError)
  })

  it('does NOT strip fences when stripCodeFence is false (default)', () => {
    const fenced = '```json\n{"a":1}\n```'
    expect(() => parseJsonOrThrow(fenced)).toThrow(ParseError)
  })
})
