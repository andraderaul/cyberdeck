import { act, renderHook } from '@testing-library/react'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { useToast } from './use-toast'

describe('useToast', () => {
  beforeEach(() => {
    vi.useFakeTimers()
  })

  afterEach(() => {
    vi.useRealTimers()
  })

  it('starts with no toasts', () => {
    const { result } = renderHook(() => useToast())
    expect(result.current.toasts).toHaveLength(0)
  })

  it('error adds a toast with the given message', () => {
    const { result } = renderHook(() => useToast())
    act(() => {
      result.current.error('export PNG failed')
    })
    expect(result.current.toasts).toHaveLength(1)
    expect(result.current.toasts[0].message).toBe('export PNG failed')
  })

  it('dismiss removes the toast by id', () => {
    const { result } = renderHook(() => useToast())
    act(() => {
      result.current.error('oops')
    })
    const id = result.current.toasts[0].id
    act(() => {
      result.current.dismiss(id)
    })
    expect(result.current.toasts).toHaveLength(0)
  })

  it('toast auto-dismisses after 4 seconds', () => {
    const { result } = renderHook(() => useToast())
    act(() => {
      result.current.error('oops')
    })
    expect(result.current.toasts).toHaveLength(1)
    act(() => {
      vi.advanceTimersByTime(4000)
    })
    expect(result.current.toasts).toHaveLength(0)
  })

  it('toast does not dismiss before 4 seconds', () => {
    const { result } = renderHook(() => useToast())
    act(() => {
      result.current.error('oops')
    })
    act(() => {
      vi.advanceTimersByTime(3999)
    })
    expect(result.current.toasts).toHaveLength(1)
  })
})
