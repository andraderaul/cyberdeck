import { act, renderHook } from '@testing-library/react'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { useAIConfig } from './use-ai-config'

const STORED_CONFIG = { provider: 'anthropic' as const, key: 'my-key' }

describe('useAIConfig', () => {
  beforeEach(() => {
    localStorage.clear()
  })

  afterEach(() => {
    vi.restoreAllMocks()
  })

  it('config is null when localStorage is empty', () => {
    const { result } = renderHook(() => useAIConfig())

    expect(result.current.config).toBeNull()
  })

  it('loads config from localStorage on mount', () => {
    localStorage.setItem('ai_config', JSON.stringify(STORED_CONFIG))

    const { result } = renderHook(() => useAIConfig())

    expect(result.current.config).toEqual(STORED_CONFIG)
  })

  it('returns null when localStorage contains invalid JSON', () => {
    localStorage.setItem('ai_config', 'not-json')

    const { result } = renderHook(() => useAIConfig())

    expect(result.current.config).toBeNull()
  })

  it('save updates config state', () => {
    const { result } = renderHook(() => useAIConfig())

    act(() => {
      result.current.save(STORED_CONFIG)
    })

    expect(result.current.config).toEqual(STORED_CONFIG)
  })

  it('save persists config to localStorage', () => {
    const { result } = renderHook(() => useAIConfig())

    act(() => {
      result.current.save(STORED_CONFIG)
    })

    expect(localStorage.getItem('ai_config')).toBe(JSON.stringify(STORED_CONFIG))
  })

  it('remove sets config to null', () => {
    localStorage.setItem('ai_config', JSON.stringify(STORED_CONFIG))
    const { result } = renderHook(() => useAIConfig())

    act(() => {
      result.current.remove()
    })

    expect(result.current.config).toBeNull()
  })

  it('remove deletes config from localStorage', () => {
    localStorage.setItem('ai_config', JSON.stringify(STORED_CONFIG))
    const { result } = renderHook(() => useAIConfig())

    act(() => {
      result.current.remove()
    })

    expect(localStorage.getItem('ai_config')).toBeNull()
  })

  it('save still updates state when localStorage throws', () => {
    vi.spyOn(Storage.prototype, 'setItem').mockImplementation(() => {
      throw new Error('full')
    })
    const { result } = renderHook(() => useAIConfig())

    act(() => {
      result.current.save(STORED_CONFIG)
    })

    expect(result.current.config).toEqual(STORED_CONFIG)
  })

  it('remove still sets null when localStorage throws', () => {
    localStorage.setItem('ai_config', JSON.stringify(STORED_CONFIG))
    const { result } = renderHook(() => useAIConfig())
    vi.spyOn(Storage.prototype, 'removeItem').mockImplementation(() => {
      throw new Error('unavailable')
    })

    act(() => {
      result.current.remove()
    })

    expect(result.current.config).toBeNull()
  })
})
