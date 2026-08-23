import { act, renderHook } from '@testing-library/react'
import { afterEach, describe, expect, it, vi } from 'vitest'
import { SKIP_WAITING } from './policy'
import { useAppUpdate } from './use-app-update'

// happy-dom has no service worker at all, so the whole registration surface is stood up here. The
// shape is small — three objects and four events — and standing it up is what lets the one branch
// that actually bites be tested: telling a first install apart from an update.

class FakeWorker extends EventTarget {
  state = 'installing'
  readonly messages: unknown[] = []

  postMessage(data: unknown): void {
    this.messages.push(data)
  }

  advanceTo(state: string): void {
    this.state = state
    this.dispatchEvent(new Event('statechange'))
  }
}

class FakeRegistration extends EventTarget {
  waiting: FakeWorker | null = null
  installing: FakeWorker | null = null
  readonly update = vi.fn(async () => {})

  startInstalling(worker: FakeWorker): void {
    this.installing = worker
    this.dispatchEvent(new Event('updatefound'))
  }
}

class FakeContainer extends EventTarget {
  controller: FakeWorker | null = null
  readonly registration = new FakeRegistration()
  readonly register = vi.fn(async () => this.registration)
}

function install(container: FakeContainer | undefined): void {
  if (container === undefined) {
    // Deleted rather than set to `undefined`: the hook asks `'serviceWorker' in navigator`, which a
    // property that merely holds nothing still answers yes to.
    Reflect.deleteProperty(navigator, 'serviceWorker')
    return
  }
  Object.defineProperty(navigator, 'serviceWorker', {
    value: container,
    configurable: true,
    writable: true,
  })
}

function reloadSpy() {
  const reload = vi.fn()
  Object.defineProperty(window, 'location', {
    value: { ...window.location, reload },
    configurable: true,
    writable: true,
  })
  return reload
}

/** The hook registers in an effect and resolves a promise inside it; one flushed microtask task is
 *  what gets the listeners attached before a test starts firing events at them. */
async function settle(): Promise<void> {
  await act(async () => {
    await Promise.resolve()
  })
}

afterEach(() => {
  vi.restoreAllMocks()
})

describe('useAppUpdate', () => {
  it('registers the worker at the root, so it controls a launch as well as a reload', async () => {
    const container = new FakeContainer()
    install(container)

    renderHook(() => useAppUpdate(true))
    await settle()

    expect(container.register).toHaveBeenCalledWith('/sw.js', { scope: '/' })
  })

  it('sits out entirely when disabled — a dev server builds no worker to register', async () => {
    const container = new FakeContainer()
    install(container)

    const { result } = renderHook(() => useAppUpdate(false))
    await settle()

    expect(container.register).not.toHaveBeenCalled()
    expect(result.current.isReady).toBe(false)
  })

  it('survives a browser with no service workers at all', async () => {
    install(undefined)

    const { result } = renderHook(() => useAppUpdate(true))
    await settle()

    expect(result.current.isReady).toBe(false)
  })

  // The branch worth the fake: on a first visit the newly installed worker *is* the version being
  // looked at, and announcing it would offer to reload the page onto itself.
  it('says nothing on a first install', async () => {
    const container = new FakeContainer()
    install(container)

    const { result } = renderHook(() => useAppUpdate(true))
    await settle()

    const worker = new FakeWorker()
    act(() => {
      container.registration.startInstalling(worker)
      worker.advanceTo('installed')
    })

    expect(result.current.isReady).toBe(false)
  })

  it('announces a build that installs behind a running one', async () => {
    const container = new FakeContainer()
    container.controller = new FakeWorker()
    install(container)

    const { result } = renderHook(() => useAppUpdate(true))
    await settle()

    const next = new FakeWorker()
    act(() => {
      container.registration.startInstalling(next)
      next.advanceTo('installed')
    })

    expect(result.current.isReady).toBe(true)
  })

  it('announces one that was already parked before this tab opened', async () => {
    const container = new FakeContainer()
    container.controller = new FakeWorker()
    container.registration.waiting = new FakeWorker()
    install(container)

    const { result } = renderHook(() => useAppUpdate(true))
    await settle()

    expect(result.current.isReady).toBe(true)
  })

  it('promotes the parked build only when asked, and reloads onto it', async () => {
    const container = new FakeContainer()
    container.controller = new FakeWorker()
    const parked = new FakeWorker()
    container.registration.waiting = parked
    install(container)
    const reload = reloadSpy()

    const { result } = renderHook(() => useAppUpdate(true))
    await settle()

    expect(parked.messages).toEqual([])

    act(() => {
      result.current.apply()
    })
    expect(parked.messages).toEqual([SKIP_WAITING])

    act(() => {
      container.dispatchEvent(new Event('controllerchange'))
    })
    expect(reload).toHaveBeenCalledTimes(1)
  })

  // `clients.claim()` fires this on a first install too. Reloading a page that has only just
  // arrived would read as a glitch, not as an update.
  it('does not reload on a controller change nobody asked for', async () => {
    const container = new FakeContainer()
    install(container)
    const reload = reloadSpy()

    renderHook(() => useAppUpdate(true))
    await settle()

    act(() => {
      container.dispatchEvent(new Event('controllerchange'))
    })

    expect(reload).not.toHaveBeenCalled()
  })
})

// The gap the review found: without these, the offer only ever appears when the *browser* runs its
// own check, which it does on navigation — so the session that never navigates, the one the parking
// rule costs the most, is the one never shown the way out of it.
describe('useAppUpdate goes looking for a new build', () => {
  function visibility(state: 'visible' | 'hidden'): void {
    Object.defineProperty(document, 'visibilityState', { value: state, configurable: true })
  }

  it('checks when the tab comes back to the front', async () => {
    const container = new FakeContainer()
    install(container)
    visibility('visible')

    renderHook(() => useAppUpdate(true))
    await settle()
    container.registration.update.mockClear()

    act(() => {
      document.dispatchEvent(new Event('visibilitychange'))
    })

    expect(container.registration.update).toHaveBeenCalledTimes(1)
  })

  it('does not check when the tab is only being hidden', async () => {
    const container = new FakeContainer()
    install(container)
    visibility('hidden')

    renderHook(() => useAppUpdate(true))
    await settle()
    container.registration.update.mockClear()

    act(() => {
      document.dispatchEvent(new Event('visibilitychange'))
    })

    expect(container.registration.update).not.toHaveBeenCalled()
    visibility('visible')
  })

  it('checks on its own for a session that never navigates and never hides', async () => {
    vi.useFakeTimers()
    try {
      const container = new FakeContainer()
      install(container)

      renderHook(() => useAppUpdate(true))
      // The registration promise still has to resolve; fake timers do not stop microtasks.
      await act(async () => {
        await Promise.resolve()
      })
      container.registration.update.mockClear()

      act(() => {
        vi.advanceTimersByTime(60 * 60 * 1000)
      })
      expect(container.registration.update).toHaveBeenCalledTimes(1)

      act(() => {
        vi.advanceTimersByTime(2 * 60 * 60 * 1000)
      })
      expect(container.registration.update).toHaveBeenCalledTimes(3)
    } finally {
      vi.useRealTimers()
    }
  })

  it('stops looking once the program is gone', async () => {
    vi.useFakeTimers()
    try {
      const container = new FakeContainer()
      install(container)
      visibility('visible')

      const { unmount } = renderHook(() => useAppUpdate(true))
      await act(async () => {
        await Promise.resolve()
      })
      unmount()
      container.registration.update.mockClear()

      act(() => {
        vi.advanceTimersByTime(4 * 60 * 60 * 1000)
        document.dispatchEvent(new Event('visibilitychange'))
      })

      expect(container.registration.update).not.toHaveBeenCalled()
    } finally {
      vi.useRealTimers()
    }
  })

  // `update()` rejects offline, which is a normal state for this program rather than an error.
  it('survives a check that fails', async () => {
    const container = new FakeContainer()
    install(container)
    visibility('visible')
    container.registration.update.mockRejectedValue(new Error('offline'))

    const { result } = renderHook(() => useAppUpdate(true))
    await settle()

    act(() => {
      document.dispatchEvent(new Event('visibilitychange'))
    })
    await settle()

    expect(result.current.isReady).toBe(false)
  })
})
