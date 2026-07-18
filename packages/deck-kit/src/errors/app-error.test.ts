import { describe, expect, it } from 'vitest'
import { createError, isAppError, normalizeError } from './app-error'

describe('isAppError', () => {
  it('returns true for a valid AppError', () => {
    expect(isAppError({ type: 'foo', message: 'bar' })).toBe(true)
  })

  it('returns false for a native Error', () => {
    expect(isAppError(new Error('oops'))).toBe(false)
  })

  it('returns false for null', () => {
    expect(isAppError(null)).toBe(false)
  })
})

describe('normalizeError', () => {
  it('passes through an existing AppError unchanged', () => {
    const err = createError({ type: 'export_failed', message: "Couldn't save — try again" })
    expect(normalizeError(err)).toBe(err)
  })

  it('wraps a native Error into AppError', () => {
    const native = new Error('boom')
    const result = normalizeError(native)
    expect(result.type).toBe('unknown_error')
    expect(result.cause).toBe(native)
  })

  it('wraps an arbitrary value into AppError', () => {
    const result = normalizeError('something weird')
    expect(result.type).toBe('unknown_error')
    expect(result.cause).toBe('something weird')
  })
})
