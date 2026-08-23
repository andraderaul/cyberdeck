// The service worker's whole judgement, as functions over data. It is a module of its own because
// `service-worker.ts` runs in a global scope no test has — the same pure/impure split the render
// pipeline already draws (ADR 0005), one layer out of the app.
//
// In the kit rather than in a program because all four tell the same offline story, and the one
// thing that differs between them is the string a cache is named with (ADR 0014, ADR 0027).

/** One file of the built shell, as the build hands it over: a URL relative to the deploy root and
 *  a content hash. The hash is what makes a new build a new cache. */
export type ShellEntry = { url: string; revision: string }

/**
 * A request reduced to what the decision actually turns on. A `Request` satisfies it structurally,
 * so the worker passes one straight through and the tests pass an object literal.
 */
export type FetchIntent = {
  method: string
  url: string
  /** `'navigate'` for a document the browser is about to render — a launch, a reload, a deep link. */
  mode: string
}

/** The built shell, resolved against the scope the worker actually runs at. */
export type Shell = {
  /** The one document every navigation is answered with — this is a single-page program. */
  index: string
  /** Absolute, query-free URLs of everything precached, the index included. */
  urls: ReadonlySet<string>
}

/**
 * The one message the page and the worker exchange: the user's escape hatch out of a stale version.
 * It lives here rather than in either end because it is the protocol between them, and the page
 * cannot import the worker (that module is compiled against a global scope the page does not have).
 */
export const SKIP_WAITING = 'cyberdeck:skip-waiting'

/**
 * The cache this build owns, named after its own contents.
 *
 * Deriving the name from the manifest rather than from a version string is what makes the eviction
 * in `activate` safe to write as "delete every other one": two deploys that emit identical bytes
 * share a cache and nothing is re-downloaded, and any real change lands in a cache the previous
 * worker was never serving from.
 *
 * `prefix` is the program's, and it is the only thing in this module that is: it names which caches
 * on an origin are this program's to evict. Programs are deployed one per origin today, so nothing
 * turns on it there — but a `vite preview` on a reused port is one origin holding two decks, and a
 * prefix is what keeps that from being a program deleting a neighbour's shell.
 *
 * FNV-1a, because a service worker cannot await `crypto.subtle` at module scope and the only
 * property needed here is that different manifests get different names.
 */
export function shellCacheName(prefix: string, entries: readonly ShellEntry[]): string {
  let hash = 0x811c9dc5
  for (const { url, revision } of entries) {
    const line = `${url}@${revision}\n`
    for (let i = 0; i < line.length; i++) {
      hash ^= line.charCodeAt(i)
      hash = Math.imul(hash, 0x01000193)
    }
  }
  return `${prefix}${(hash >>> 0).toString(16).padStart(8, '0')}`
}

/**
 * Resolves the build's relative URLs against the scope the worker was registered at, so the same
 * manifest works under a root deploy and under a sub-path.
 *
 * Throws on a manifest with no `index.html`: a shell with no document to answer a navigation with
 * is an offline program that opens to a network error, and failing here fails the registration
 * loudly instead.
 */
export function resolveShell(entries: readonly ShellEntry[], scope: string): Shell {
  const urls = new Set<string>()
  let index: string | null = null
  for (const { url } of entries) {
    const resolved = new URL(url, scope)
    const key = resolved.origin + resolved.pathname
    urls.add(key)
    if (resolved.pathname.endsWith('/index.html')) {
      index = key
    }
  }
  if (index === null) {
    throw new Error('the precache manifest carries no index.html — there is no shell to serve')
  }
  return { index, urls }
}

/**
 * Whether the worker answers a request at all, and with which cache key.
 *
 * `null` means *say nothing*: the worker returns without calling `respondWith`, and the browser
 * does exactly what it would have done with no worker installed. That is the honest answer for
 * everything this program did not build, and it is the answer ASCII//Convert's AI Provider gets —
 * the user's key is theirs and the request goes straight to the provider (ADR 0003), so a reply
 * served out of a cache would be both wrong and alarming.
 *
 * Three of the four programs make no network call at all, so for them the origin test never fires
 * in anger. It is still the first thing asked, because "answer only what this build emitted" is one
 * rule rather than four, and a program that grows a call later inherits the exclusion rather than
 * having to remember it.
 */
export function planShellFetch(intent: FetchIntent, shell: Shell, origin: string): string | null {
  let target: URL
  try {
    target = new URL(intent.url)
  } catch {
    return null
  }

  // The rule, and deliberately the *first* thing asked: anything not served by this deploy is none
  // of the worker's business. Every AI Provider endpoint is excluded right here, on the origin
  // alone, before the method is looked at — so no rule below can accidentally become the thing
  // holding them out, and none has to be renewed when a fourth provider is added.
  if (target.origin !== origin) {
    return null
  }

  // Same-origin, but a cache can only replay a request whose meaning does not depend on its body.
  if (intent.method !== 'GET') {
    return null
  }

  // A launch, a reload or a deep link all want the shell's one document.
  if (intent.mode === 'navigate') {
    return shell.index
  }

  const key = target.origin + target.pathname
  return shell.urls.has(key) ? key : null
}
