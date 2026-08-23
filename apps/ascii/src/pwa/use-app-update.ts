import { useCallback, useEffect, useRef, useState } from 'react'
import { SKIP_WAITING } from './policy'

/** Where `precacheShell()` writes the worker, and the scope it has to control to answer a launch. */
const WORKER_URL = '/sw.js'
const SCOPE = '/'

export type AppUpdate = {
  /** A newer build is installed and parked. Nothing about the running session has changed. */
  isReady: boolean
  /** Promote the parked build and reload onto it. The user's move, never the program's. */
  apply: () => void
}

/**
 * Registers the service worker and reports whether a newer build is sitting behind the running one.
 *
 * The policy this implements is the half of ADR 0027 the worker cannot enforce on its own. The
 * worker never calls `skipWaiting`, so a new build parks and the running session keeps every byte
 * it started with — a Recording in flight, a Live Source, a half-written API key. It goes live when
 * the last tab closes, or here, when the user asks for it: that is the way out of a stale version
 * that does not involve clearing site data by hand.
 *
 * `enabled` is a parameter rather than a read of `import.meta.env` inside, so the tests can reach
 * the body at all — under Vitest the build flag says "dev" and the hook would sit out every test.
 */
export function useAppUpdate(enabled: boolean = import.meta.env.PROD): AppUpdate {
  const [waiting, setWaiting] = useState<ServiceWorker | null>(null)
  const applied = useRef(false)

  useEffect(() => {
    if (!enabled || !('serviceWorker' in navigator)) {
      return
    }
    const container = navigator.serviceWorker
    let live = true

    const onControllerChange = () => {
      // Only when the user asked. `clients.claim()` also fires this on a first install, and
      // reloading a page that just arrived would be a mystery rather than an update.
      if (applied.current) {
        window.location.reload()
      }
    }
    container.addEventListener('controllerchange', onControllerChange)

    void container
      .register(WORKER_URL, { scope: SCOPE })
      .then((registration) => {
        if (!live) {
          return
        }
        setWaiting(registration.waiting)
        registration.addEventListener('updatefound', () => {
          const installing = registration.installing
          if (!installing) {
            return
          }
          installing.addEventListener('statechange', () => {
            // `installed` with no controller is the first install — there is nothing to update
            // *from*, and announcing one would be announcing the page the user is looking at.
            if (live && installing.state === 'installed' && container.controller !== null) {
              setWaiting(installing)
            }
          })
        })
      })
      .catch(() => {
        // No worker means no offline and no update prompt — the program itself is unaffected, so
        // there is nothing here worth interrupting anyone about.
      })

    return () => {
      live = false
      container.removeEventListener('controllerchange', onControllerChange)
    }
  }, [enabled])

  const apply = useCallback(() => {
    if (!waiting) {
      return
    }
    applied.current = true
    waiting.postMessage(SKIP_WAITING)
  }, [waiting])

  return { isReady: waiting !== null, apply }
}
