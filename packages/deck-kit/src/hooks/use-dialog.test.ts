import { act, renderHook } from '@testing-library/react'
import { afterEach, describe, expect, it, vi } from 'vitest'
import { useDialog } from './use-dialog'

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

function makePanelRef(tabbableCount = 2): {
  ref: { current: HTMLElement }
  tabbables: HTMLElement[]
} {
  const panel = document.createElement('div')
  const tabbables: HTMLElement[] = []
  for (let i = 0; i < tabbableCount; i++) {
    const btn = document.createElement('button')
    btn.textContent = `Button ${i}`
    panel.appendChild(btn)
    tabbables.push(btn)
  }
  document.body.appendChild(panel)
  return { ref: { current: panel }, tabbables }
}

function makeTriggerRef(): { ref: { current: HTMLElement } } {
  const btn = document.createElement('button')
  btn.textContent = 'Trigger'
  document.body.appendChild(btn)
  return { ref: { current: btn } }
}

afterEach(() => {
  document.body.innerHTML = ''
  document.body.style.overflow = ''
  vi.restoreAllMocks()
})

// ---------------------------------------------------------------------------
// Escape key
// ---------------------------------------------------------------------------

describe('Escape key', () => {
  it('calls onClose when Escape is pressed', () => {
    const { ref } = makePanelRef()
    const onClose = vi.fn()
    renderHook(() => useDialog({ panelRef: ref, onClose }))

    act(() => {
      document.dispatchEvent(new KeyboardEvent('keydown', { key: 'Escape', bubbles: true }))
    })

    expect(onClose).toHaveBeenCalledTimes(1)
  })

  it('does not call onClose for other keys', () => {
    const { ref } = makePanelRef()
    const onClose = vi.fn()
    renderHook(() => useDialog({ panelRef: ref, onClose }))

    act(() => {
      document.dispatchEvent(new KeyboardEvent('keydown', { key: 'Enter', bubbles: true }))
    })

    expect(onClose).not.toHaveBeenCalled()
  })

  it('removes the Escape listener on unmount', () => {
    const { ref } = makePanelRef()
    const onClose = vi.fn()
    const { unmount } = renderHook(() => useDialog({ panelRef: ref, onClose }))

    unmount()

    act(() => {
      document.dispatchEvent(new KeyboardEvent('keydown', { key: 'Escape', bubbles: true }))
    })

    expect(onClose).not.toHaveBeenCalled()
  })
})

// ---------------------------------------------------------------------------
// Focus first tabbable on mount
// ---------------------------------------------------------------------------

describe('Focus on mount', () => {
  it('focuses the first tabbable element inside panelRef on mount', () => {
    const { ref, tabbables } = makePanelRef(3)
    renderHook(() => useDialog({ panelRef: ref, onClose: vi.fn() }))
    expect(document.activeElement).toBe(tabbables[0])
  })

  it('does nothing when panelRef has no tabbable elements', () => {
    const panel = document.createElement('div')
    document.body.appendChild(panel)
    const ref = { current: panel }

    // Should not throw
    expect(() => {
      renderHook(() => useDialog({ panelRef: ref, onClose: vi.fn() }))
    }).not.toThrow()
  })
})

// ---------------------------------------------------------------------------
// Body scroll lock
// ---------------------------------------------------------------------------

describe('Body scroll lock', () => {
  it('sets document.body.style.overflow to hidden on mount', () => {
    const { ref } = makePanelRef()
    renderHook(() => useDialog({ panelRef: ref, onClose: vi.fn() }))
    expect(document.body.style.overflow).toBe('hidden')
  })

  it('restores document.body.style.overflow on unmount', () => {
    const { ref } = makePanelRef()
    const { unmount } = renderHook(() => useDialog({ panelRef: ref, onClose: vi.fn() }))
    expect(document.body.style.overflow).toBe('hidden')
    unmount()
    expect(document.body.style.overflow).toBe('')
  })
})

// ---------------------------------------------------------------------------
// Focus trap
// ---------------------------------------------------------------------------

describe('Focus trap', () => {
  it('wraps Tab forward from last tabbable to first', () => {
    const { ref, tabbables } = makePanelRef(3)
    renderHook(() => useDialog({ panelRef: ref, onClose: vi.fn() }))

    const last = tabbables[tabbables.length - 1]
    last.focus()
    expect(document.activeElement).toBe(last)

    act(() => {
      ref.current.dispatchEvent(
        new KeyboardEvent('keydown', { key: 'Tab', shiftKey: false, bubbles: true }),
      )
    })

    expect(document.activeElement).toBe(tabbables[0])
  })

  it('wraps Shift+Tab backward from first tabbable to last', () => {
    const { ref, tabbables } = makePanelRef(3)
    renderHook(() => useDialog({ panelRef: ref, onClose: vi.fn() }))

    const first = tabbables[0]
    first.focus()
    expect(document.activeElement).toBe(first)

    act(() => {
      ref.current.dispatchEvent(
        new KeyboardEvent('keydown', { key: 'Tab', shiftKey: true, bubbles: true }),
      )
    })

    expect(document.activeElement).toBe(tabbables[tabbables.length - 1])
  })

  it('does not trap Tab when focus is not at boundary', () => {
    const { ref, tabbables } = makePanelRef(3)
    renderHook(() => useDialog({ panelRef: ref, onClose: vi.fn() }))

    // Focus the middle element — Tab should not wrap
    tabbables[1].focus()
    const preventDefaultSpy = vi.fn()

    act(() => {
      const event = new KeyboardEvent('keydown', {
        key: 'Tab',
        shiftKey: false,
        bubbles: true,
      })
      Object.defineProperty(event, 'preventDefault', { value: preventDefaultSpy })
      ref.current.dispatchEvent(event)
    })

    expect(preventDefaultSpy).not.toHaveBeenCalled()
  })
})

// ---------------------------------------------------------------------------
// Focus return on unmount
// ---------------------------------------------------------------------------

describe('Focus return on unmount', () => {
  it('returns focus to triggerRef.current on unmount when triggerRef is provided', () => {
    const { ref } = makePanelRef()
    const trigger = makeTriggerRef()
    trigger.ref.current.focus()

    const { unmount } = renderHook(() =>
      useDialog({ panelRef: ref, onClose: vi.fn(), triggerRef: trigger.ref }),
    )

    // Focus is now in panel
    expect(document.activeElement).not.toBe(trigger.ref.current)

    unmount()
    expect(document.activeElement).toBe(trigger.ref.current)
  })

  it('returns focus to the element that was active at mount when no triggerRef', () => {
    const previouslyFocused = document.createElement('button')
    previouslyFocused.textContent = 'Previously focused'
    document.body.appendChild(previouslyFocused)
    previouslyFocused.focus()
    expect(document.activeElement).toBe(previouslyFocused)

    const { ref } = makePanelRef()
    const { unmount } = renderHook(() => useDialog({ panelRef: ref, onClose: vi.fn() }))

    // Focus moved into panel
    expect(document.activeElement).not.toBe(previouslyFocused)

    unmount()
    expect(document.activeElement).toBe(previouslyFocused)
  })

  it('does not throw when no triggerRef and no previously focused element', () => {
    const { ref } = makePanelRef()
    const { unmount } = renderHook(() => useDialog({ panelRef: ref, onClose: vi.fn() }))
    expect(() => unmount()).not.toThrow()
  })
})

describe('useDialog — tabbable filter with tabindex=-1 container', () => {
  it('focuses first tabbable when the panel container itself has tabIndex=-1', () => {
    const panel = document.createElement('div')
    panel.tabIndex = -1
    const btn = document.createElement('button')
    btn.textContent = 'inside'
    panel.appendChild(btn)
    document.body.appendChild(panel)

    renderHook(() => useDialog({ panelRef: { current: panel }, onClose: vi.fn() }))

    expect(document.activeElement).toBe(btn)

    document.body.removeChild(panel)
  })
})
