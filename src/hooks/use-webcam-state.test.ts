import { describe, expect, it } from 'vitest'
import { INITIAL_STATE, reducer } from './use-webcam-state'

describe('SWITCH_MODE', () => {
  it('sets new mode and resets live, facingMode, error', () => {
    const state = { ...INITIAL_STATE, mode: 'webcam' as const, live: true, error: 'oops' }
    const next = reducer(state, { type: 'SWITCH_MODE', mode: 'upload' })
    expect(next.mode).toBe('upload')
    expect(next.live).toBe(false)
    expect(next.facingMode).toBe('user')
    expect(next.error).toBeNull()
  })

  it('upload→webcam sets mode to webcam and live to false', () => {
    const next = reducer(INITIAL_STATE, { type: 'SWITCH_MODE', mode: 'webcam' })
    expect(next.mode).toBe('webcam')
    expect(next.live).toBe(false)
  })
})

describe('WEBCAM_STARTED', () => {
  it('sets live true and records facingMode', () => {
    const next = reducer(INITIAL_STATE, { type: 'WEBCAM_STARTED', facingMode: 'environment' })
    expect(next.live).toBe(true)
    expect(next.facingMode).toBe('environment')
  })

  it('clears any existing error', () => {
    const state = { ...INITIAL_STATE, error: 'Camera access denied' }
    const next = reducer(state, { type: 'WEBCAM_STARTED', facingMode: 'user' })
    expect(next.error).toBeNull()
  })
})

describe('WEBCAM_STOPPED', () => {
  it('sets live false and resets facingMode to user', () => {
    const state = { ...INITIAL_STATE, live: true, facingMode: 'environment' as const }
    const next = reducer(state, { type: 'WEBCAM_STOPPED' })
    expect(next.live).toBe(false)
    expect(next.facingMode).toBe('user')
  })
})

describe('WEBCAM_ERROR', () => {
  it('reverts mode to upload, clears live, sets error message', () => {
    const state = { ...INITIAL_STATE, mode: 'webcam' as const, live: true }
    const next = reducer(state, { type: 'WEBCAM_ERROR', message: 'Camera access denied' })
    expect(next.mode).toBe('upload')
    expect(next.live).toBe(false)
    expect(next.facingMode).toBe('user')
    expect(next.error).toBe('Camera access denied')
  })
})
