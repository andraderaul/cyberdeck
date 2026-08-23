// The plugin's guards, which are the only reason it is more than a directory walk. Each one exists
// because the failure it catches is invisible: a file dropped from the precache goes missing only
// for a user who is already offline, and a shell with no manifest installs a program no browser ever
// offers to install. A guard nothing exercises is a comment.

import { mkdirSync, mkdtempSync, writeFileSync } from 'node:fs'
import { tmpdir } from 'node:os'
import { join } from 'node:path'
import { describe, expect, it } from 'vitest'
import { assertServeable, CACHE_PREFIX_SHAPE, collectShell, precacheShell } from './precache-shell'

/** A `dist` on disk, since the walk's whole job is reading one. */
function dist(files: Record<string, string>): string {
  const dir = mkdtempSync(join(tmpdir(), 'shell-'))
  for (const [path, contents] of Object.entries(files)) {
    const full = join(dir, path)
    mkdirSync(join(full, '..'), { recursive: true })
    writeFileSync(full, contents)
  }
  return dir
}

const A_BUILD = {
  'index.html': '<!doctype html>',
  'manifest.webmanifest': '{}',
  'assets/index-abc.js': 'console.log(1)',
  'assets/index-abc.css': 'body{}',
  'favicon.svg': '<svg/>',
  'og-card.png': 'PNG',
  'sw.js': 'self',
}

describe('collectShell', () => {
  it('takes every file the running program fetches', () => {
    expect(collectShell(dist(A_BUILD)).map((entry) => entry.url)).toEqual([
      'assets/index-abc.css',
      'assets/index-abc.js',
      'favicon.svg',
      'index.html',
      'manifest.webmanifest',
    ])
  })

  // The order is the input to `shellCacheName`, so an unstable walk would rename the cache on every
  // build and re-download a shell that had not changed.
  it('is stable across walks, which is what makes the cache name a function of the build', () => {
    const dir = dist(A_BUILD)
    expect(collectShell(dir)).toEqual(collectShell(dir))
  })

  it('moves an entry’s revision when its bytes move', () => {
    const before = collectShell(dist(A_BUILD))
    const after = collectShell(dist({ ...A_BUILD, 'assets/index-abc.js': 'console.log(2)' }))
    const urlOf = (entries: typeof before, url: string) => entries.find((e) => e.url === url)
    expect(urlOf(after, 'assets/index-abc.js')?.revision).not.toBe(
      urlOf(before, 'assets/index-abc.js')?.revision,
    )
    expect(urlOf(after, 'index.html')?.revision).toBe(urlOf(before, 'index.html')?.revision)
  })

  // The worker is fetched by the browser's own update check; answering it from a cache the worker
  // controls is how a deploy becomes unreachable forever.
  it('never precaches the worker or the link-preview card', () => {
    const urls = collectShell(dist(A_BUILD)).map((entry) => entry.url)
    expect(urls).not.toContain('sw.js')
    expect(urls).not.toContain('og-card.png')
  })

  it('ignores what the filesystem put there rather than the build', () => {
    const urls = collectShell(dist({ ...A_BUILD, '.DS_Store': 'junk' })).map((entry) => entry.url)
    expect(urls).not.toContain('.DS_Store')
  })

  // The guard the whole file is written around.
  it('stops the build on a file it cannot classify, rather than dropping it', () => {
    expect(() => collectShell(dist({ ...A_BUILD, 'font.woff2': 'woff' }))).toThrow(
      /font\.woff2 was emitted into the build but is neither part of the shell nor excluded/,
    )
  })

  it('names both ways out, and the file to make the decision in', () => {
    let message = ''
    try {
      collectShell(dist({ ...A_BUILD, 'data.json': '{}' }))
    } catch (error) {
      message = (error as Error).message
    }
    expect(message).toContain('packages/deck-kit/scripts/precache-shell.ts')
    expect(message).toContain('SHELL_EXTENSIONS')
    expect(message).toContain('NOT_THE_SHELL')
    expect(message).toContain('exclude')
  })

  // ADR 0027's reserved escape hatch: a program with a shell too large names the file itself,
  // rather than the deck-wide set quietly widening or a runtime strategy appearing.
  it('lets one program exclude a file without changing the deck-wide set', () => {
    const dir = dist({ ...A_BUILD, 'huge.png': 'x'.repeat(64) })
    expect(collectShell(dir, ['huge.png']).map((entry) => entry.url)).not.toContain('huge.png')
    expect(collectShell(dir).map((entry) => entry.url)).toContain('huge.png')
  })
})

describe('assertServeable', () => {
  it('accepts a shell with a document and a manifest', () => {
    expect(() => assertServeable(collectShell(dist(A_BUILD)), 'dist')).not.toThrow()
  })

  it('stops a shell with no document — offline it would open to a network error', () => {
    const { 'index.html': _, ...noIndex } = A_BUILD
    expect(() => assertServeable(collectShell(dist(noIndex)), 'dist')).toThrow(/no index\.html/)
  })

  // Precaching without a manifest is the quiet half-failure: the program works offline and is never
  // offered for install, which looks like the feature not existing.
  it('stops a shell with no manifest — it would install a program nothing offers to install', () => {
    const { 'manifest.webmanifest': _, ...noManifest } = A_BUILD
    expect(() => assertServeable(collectShell(dist(noManifest)), 'dist')).toThrow(
      /no manifest\.webmanifest/,
    )
  })
})

describe('the cache prefix', () => {
  it.each([
    'ascii-shell-',
    'glitch-shell-',
    'golem-shell-',
    'sprawl-shell-',
  ])('%s is the shape the deck uses', (prefix) => {
    expect(CACHE_PREFIX_SHAPE.test(prefix)).toBe(true)
  })

  // `activate` sweeps with `startsWith`, so a prefix missing its separator would match a longer
  // program's caches and delete them on any origin the two shared.
  it.each([
    'golem',
    'golem-shell',
    'Golem-shell-',
    '-shell-',
    'golem_shell_',
  ])('%s is refused before a build can ship it', (prefix) => {
    expect(CACHE_PREFIX_SHAPE.test(prefix)).toBe(false)
    expect(() => precacheShell({ cachePrefix: prefix })).toThrow(/is not of the form/)
  })
})
