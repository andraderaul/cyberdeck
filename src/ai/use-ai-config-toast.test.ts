import { act, renderHook } from '@testing-library/react'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import type { AIConfig } from './types'
import { useAIConfig } from './use-ai-config'

const STORED_CONFIG: AIConfig = { provider: 'anthropic', key: 'my-key' }

describe('useAIConfig storage failures', () => {
  beforeEach(() => {
    localStorage.clear()
  })

  afterEach(() => {
    vi.restoreAllMocks()
  })

  it('save() throws and does not update in-memory config when localStorage is full', async () => {
    vi.spyOn(localStorage, 'setItem').mockImplementation(() => {
      throw new Error('full')
    })

    const { result } = renderHook(() => useAIConfig())

    expect(() => result.current.save(STORED_CONFIG)).toThrow(
      'ai configured (session only — storage unavailable)',
    )
    expect(result.current.config).toBeNull()
  })

  it('remove() throws and does not clear in-memory config when localStorage is unavailable', async () => {
    localStorage.setItem('ai_config', JSON.stringify(STORED_CONFIG))
    vi.spyOn(localStorage, 'removeItem').mockImplementation(() => {
      throw new Error('unavailable')
    })

    const { result } = renderHook(() => useAIConfig())

    await act(async () => {}) // flush initial render

    expect(() => result.current.remove()).toThrow(
      'storage unavailable — config removed until page reload',
    )
    expect(result.current.config).toEqual(STORED_CONFIG)
  })
})
