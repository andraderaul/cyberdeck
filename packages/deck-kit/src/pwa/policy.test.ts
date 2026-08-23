import { describe, expect, it } from 'vitest'
import {
  type FetchIntent,
  planShellFetch,
  resolveShell,
  type ShellEntry,
  shellCacheName,
} from './policy'

const ORIGIN = 'https://ascii-art-converter-tawny.vercel.app'
const SCOPE = `${ORIGIN}/`
const PREFIX = 'ascii-shell-'

const MANIFEST: ShellEntry[] = [
  { url: 'index.html', revision: 'aaaa' },
  { url: 'assets/index-1a2b3c.js', revision: 'bbbb' },
  { url: 'assets/index-4d5e6f.css', revision: 'cccc' },
  { url: 'favicon.svg', revision: 'dddd' },
  { url: 'manifest.webmanifest', revision: 'eeee' },
]

const SHELL = resolveShell(MANIFEST, SCOPE)

function get(url: string, mode: FetchIntent['mode'] = 'cors'): FetchIntent {
  return { method: 'GET', url, mode }
}

describe('shellCacheName', () => {
  it('is stable for the same manifest', () => {
    expect(shellCacheName(PREFIX, MANIFEST)).toBe(shellCacheName(PREFIX, [...MANIFEST]))
  })

  it('moves when any file’s contents move', () => {
    const rebuilt = MANIFEST.map((entry) =>
      entry.url === 'index.html' ? { ...entry, revision: 'zzzz' } : entry,
    )
    expect(shellCacheName(PREFIX, rebuilt)).not.toBe(shellCacheName(PREFIX, MANIFEST))
  })

  it('carries the prefix the eviction sweep matches on', () => {
    expect(shellCacheName(PREFIX, MANIFEST).startsWith(PREFIX)).toBe(true)
  })

  // The eviction in `activate` is "delete every cache whose name starts with mine". Two programs
  // that produced the same name from the same shell would each delete the other's on an origin
  // they shared — which is what a `vite preview` on a reused port is.
  it('gives two programs different names for the same shell', () => {
    expect(shellCacheName('golem-shell-', MANIFEST)).not.toBe(
      shellCacheName('sprawl-shell-', MANIFEST),
    )
  })
})

describe('resolveShell', () => {
  it('resolves every entry against the scope', () => {
    expect(SHELL.urls.has(`${ORIGIN}/assets/index-1a2b3c.js`)).toBe(true)
  })

  it('follows the scope onto a sub-path deploy', () => {
    const nested = resolveShell(MANIFEST, `${ORIGIN}/ascii/`)
    expect(nested.index).toBe(`${ORIGIN}/ascii/index.html`)
    expect(nested.urls.has(`${ORIGIN}/ascii/favicon.svg`)).toBe(true)
  })

  it('refuses a manifest with no document to serve', () => {
    expect(() => resolveShell([{ url: 'favicon.svg', revision: 'a' }], SCOPE)).toThrow(
      /index\.html/,
    )
  })
})

describe('planShellFetch', () => {
  it('answers a navigation with the shell’s document, whatever the path', () => {
    expect(planShellFetch(get(`${ORIGIN}/deep/link`, 'navigate'), SHELL, ORIGIN)).toBe(SHELL.index)
  })

  it('answers a precached asset with itself', () => {
    expect(planShellFetch(get(`${ORIGIN}/assets/index-1a2b3c.js`), SHELL, ORIGIN)).toBe(
      `${ORIGIN}/assets/index-1a2b3c.js`,
    )
  })

  it('ignores the query, which no build emits into a filename', () => {
    expect(planShellFetch(get(`${ORIGIN}/favicon.svg?v=2`), SHELL, ORIGIN)).toBe(
      `${ORIGIN}/favicon.svg`,
    )
  })

  it('says nothing about a same-origin file the build never emitted', () => {
    expect(planShellFetch(get(`${ORIGIN}/assets/gone-9z8y7x.js`), SHELL, ORIGIN)).toBeNull()
  })

  // ADR 0003: the key is the user's and the call goes straight to the provider. A cached reply
  // would be wrong twice over — stale, and evidence the deck read a request it promised not to.
  //
  // What the call *carries* has already changed once — since #308 the same round trip brings a
  // Suggestion home as well as the prose — and it made no difference here, which is the point of
  // deciding on origin. `FetchIntent` is method, url and mode: the rule has no access to a body or
  // a reply, so no future change to either can reach this decision.
  describe('never touches an AI Provider call', () => {
    it.each([
      'https://api.anthropic.com/v1/messages',
      'https://api.openai.com/v1/chat/completions',
      'https://generativelanguage.googleapis.com/v1beta/models/gemini-2.0-flash:generateContent',
    ])('%s', (url) => {
      expect(planShellFetch({ method: 'POST', url, mode: 'cors' }, SHELL, ORIGIN)).toBeNull()
      // The origin, not the verb, is what excludes them: a GET to the same host is left alone too.
      expect(planShellFetch(get(url), SHELL, ORIGIN)).toBeNull()
    })
  })

  it('leaves every non-GET alone, including one to this origin', () => {
    expect(planShellFetch({ method: 'POST', url: SHELL.index, mode: 'cors' }, SHELL, ORIGIN)).toBe(
      null,
    )
  })

  // A blob URL parses to this very origin, so the origin check waves it through — what stops it is
  // that its path was never in the build. Worth pinning: every Export on this program leaves
  // through one of these.
  it('leaves a blob URL alone — an Export is not a fetch the shell owns', () => {
    expect(planShellFetch(get(`blob:${ORIGIN}/abc-123`), SHELL, ORIGIN)).toBeNull()
  })
})
