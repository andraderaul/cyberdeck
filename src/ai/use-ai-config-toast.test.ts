import { render } from '@testing-library/react'
import { act, createElement } from 'react'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { ToastContext } from '../components/toast-provider'
import type { AIConfig } from './types'
import { useAIConfig } from './use-ai-config'

const STORED_CONFIG = { provider: 'anthropic' as const, key: 'my-key' }

describe('useAIConfig storage toast', () => {
  beforeEach(() => {
    localStorage.clear()
  })

  afterEach(() => {
    vi.restoreAllMocks()
  })

  it('toasts when save throws', async () => {
    vi.spyOn(Storage.prototype, 'setItem').mockImplementation(() => {
      throw new Error('full')
    })
    const mockToast = vi.fn()
    let capturedSave: ((cfg: AIConfig) => void) | undefined

    function Probe() {
      const { save } = useAIConfig()
      capturedSave = save
      return null
    }

    render(
      createElement(
        ToastContext.Provider,
        { value: { error: mockToast, info: vi.fn(), warn: vi.fn() } },
        createElement(Probe),
      ),
    )

    await act(() => {
      capturedSave?.(STORED_CONFIG)
    })

    expect(mockToast).toHaveBeenCalledWith('ai configured (session only — storage unavailable)')
  })

  it('toasts when remove throws', async () => {
    localStorage.setItem('ai_config', JSON.stringify(STORED_CONFIG))
    vi.spyOn(Storage.prototype, 'removeItem').mockImplementation(() => {
      throw new Error('unavailable')
    })
    const mockToast = vi.fn()
    let capturedRemove: (() => void) | undefined

    function Probe() {
      const { remove } = useAIConfig()
      capturedRemove = remove
      return null
    }

    render(
      createElement(
        ToastContext.Provider,
        { value: { error: mockToast, info: vi.fn(), warn: vi.fn() } },
        createElement(Probe),
      ),
    )

    await act(() => {
      capturedRemove?.()
    })

    expect(mockToast).toHaveBeenCalledWith('storage unavailable — config removed until page reload')
  })
})
