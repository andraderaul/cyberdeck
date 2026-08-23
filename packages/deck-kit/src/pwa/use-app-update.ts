// The reference is here rather than in a `vite-env.d.ts` per consumer because this file is where
// the dependency is: `import.meta.env.PROD` below is the only thing on the deck that needs Vite's
// ambient types outside an app's own source. A directive in the file that uses it travels with the
// import; four copies of a four-line `.d.ts` would not, and the one a new program forgot would fail
// as a type error a long way from here.
/// <reference types="vite/client" />

import { useCallback, useEffect, useRef, useState } from 'react'
import { SKIP_WAITING } from './policy'

/** Where `precacheShell()` writes the worker, and the scope it has to control to answer a launch. */
const WORKER_URL = '/sw.js'
const SCOPE = '/'

/**
 * How often a session that never navigates goes and looks for a new build.
 *
 * Without this the offer only ever appears when the *browser* runs its own update check, which it
 * does on navigation — so the one user ADR 0027 names as paying for the no-mid-session rule, the
 * one who never closes the tab, would be the one user never shown the way out of it. An hour is
 * chosen against what the check costs rather than against how fast a deploy should land: it is a
 * conditional GET of a ~2 kB file that answers `304` every time but the one that matters.
 */
const UPDATE_INTERVAL_MS = 60 * 60 * 1000

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
 * it started with — a Recording in flight, a Live Source, a half-written API key, a GOLEM Machine
 * partway through a `run`. It goes live when the last tab closes, or here, when the user asks for
 * it: that is the way out of a stale version that does not involve clearing site data by hand.
 *
 * Which is why this also goes *looking* — hourly, and whenever the tab comes back to the front. An
 * offer nobody is shown is not an escape hatch, and the browser's own check only runs on
 * navigation, i.e. never, for exactly the long-lived session the parking rule costs the most.
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
    let timer: ReturnType<typeof setInterval> | undefined
    let onVisible: (() => void) | undefined

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

        // Registering already ran one check. These are for the session that outlives it: an open
        // tab brought back to the front, and an open tab that is never left at all.
        const check = () => {
          registration.update().catch(() => {
            // Offline, or the deploy is gone. Either way the running build is unaffected.
          })
        }
        timer = setInterval(check, UPDATE_INTERVAL_MS)
        onVisible = () => {
          if (document.visibilityState === 'visible') {
            check()
          }
        }
        document.addEventListener('visibilitychange', onVisible)
      })
      .catch(() => {
        // No worker means no offline and no update prompt — the program itself is unaffected, so
        // there is nothing here worth interrupting anyone about.
      })

    return () => {
      live = false
      container.removeEventListener('controllerchange', onControllerChange)
      if (timer !== undefined) {
        clearInterval(timer)
      }
      if (onVisible !== undefined) {
        document.removeEventListener('visibilitychange', onVisible)
      }
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
