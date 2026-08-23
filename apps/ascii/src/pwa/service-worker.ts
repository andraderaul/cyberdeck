// ASCII//Convert's whole offline story, and deliberately the least clever worker that can tell it:
// the shell is precached whole at install, served from that one cache, and nothing else is touched.
// There is no origin to fall back to — the deck has no backend (ADR 0011) — so a runtime caching
// strategy would be machinery guarding a case that cannot arise. See ADR 0027.
//
// What is *absent* here is half the design: there is no `skipWaiting` on install. A new build
// installs beside the running one and waits, so a Recording in flight or a Live Source mid-session
// is never swapped out from under the user. The only thing that promotes it is the message below,
// which the page sends when the user asks for it.
//
// Not bundled with the app: `precacheShell()` in `vite.config.ts` builds this file on its own, into
// `dist/sw.js`, with the manifest of everything the app build emitted defined in.

/// <reference lib="webworker" />

import {
  CACHE_PREFIX,
  planShellFetch,
  resolveShell,
  type ShellEntry,
  SKIP_WAITING,
  shellCacheName,
} from './policy'

declare const self: ServiceWorkerGlobalScope

/** Replaced at build time with every file the app build emitted. */
declare const __SHELL_MANIFEST__: ShellEntry[]

const MANIFEST = __SHELL_MANIFEST__
const CACHE = shellCacheName(MANIFEST)
const SHELL = resolveShell(MANIFEST, self.registration.scope)

self.addEventListener('install', (event) => {
  event.waitUntil(
    (async () => {
      const cache = await caches.open(CACHE)
      // `reload` rather than the default: the HTTP cache can still be holding the previous deploy's
      // bytes under an unhashed name — `index.html` above all — and precaching those would install
      // a shell that is stale the moment it lands. `addAll` is all-or-nothing on purpose: a shell
      // missing one file is not a program, and a half-filled cache would fail later and quietly.
      await cache.addAll([...SHELL.urls].map((url) => new Request(url, { cache: 'reload' })))
    })(),
  )
})

self.addEventListener('activate', (event) => {
  event.waitUntil(
    (async () => {
      const stale = (await caches.keys()).filter(
        (name) => name.startsWith(CACHE_PREFIX) && name !== CACHE,
      )
      await Promise.all(stale.map((name) => caches.delete(name)))
      // Safe despite the no-mid-session rule: without `skipWaiting` this only runs when the previous
      // worker has no clients left, so there is no running session to claim out from under. On a
      // first visit it is what makes that same visit offline-ready rather than the next one.
      await self.clients.claim()
    })(),
  )
})

self.addEventListener('fetch', (event) => {
  const key = planShellFetch(event.request, SHELL, self.location.origin)
  if (key === null) {
    return
  }
  event.respondWith(
    (async () => {
      const cache = await caches.open(CACHE)
      const cached = await cache.match(key)
      // The fallback is for the window between `install` and this cache being complete; offline it
      // rejects, which is the same network error the browser would have shown on its own.
      return cached ?? fetch(event.request)
    })(),
  )
})

self.addEventListener('message', (event) => {
  if (event.data === SKIP_WAITING) {
    void self.skipWaiting()
  }
})
