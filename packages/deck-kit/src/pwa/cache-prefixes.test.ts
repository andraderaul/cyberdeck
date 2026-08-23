// The one thing about the precached shell that no single program's build can check: whether its
// cache prefix collides with a neighbour's.
//
// `activate` deletes every cache whose name `startsWith` this build's prefix. Programs deploy one
// per origin today, so a collision costs nothing there — but a `vite preview` on a reused port is
// one origin holding two decks, and so is any future move to sub-paths under one domain. The
// failure would be one program silently deleting another's shell, surfacing as an offline user
// losing a program they never opened. Found by looking, like the roster guards, so a program that
// gains a prefix becomes guarded by that fact alone.

import { existsSync, readFileSync } from 'node:fs'
import { join } from 'node:path'
import { describe, expect, it } from 'vitest'
import { CACHE_PREFIX_SHAPE } from '../../scripts/precache-shell'
import { repoRoot, workspaces } from '../theme/sources'

const DECLARED = /precacheShell\(\{\s*cachePrefix:\s*'([^']+)'/

const prefixes = workspaces()
  .map((workspace) => {
    const config = join(repoRoot(), 'apps', workspace, 'vite.config.ts')
    const source = existsSync(config) ? readFileSync(config, 'utf8') : ''
    return { workspace, prefix: DECLARED.exec(source)?.[1] ?? null }
  })
  .filter((found): found is { workspace: string; prefix: string } => found.prefix !== null)

describe('every program’s cache prefix', () => {
  // The hub is absent because it is chrome rather than a program (ADR 0025) and installs nothing.
  it('is declared by exactly the four programs', () => {
    expect(prefixes.map(({ workspace }) => workspace)).toEqual([
      'ascii',
      'glitch',
      'golem',
      'sprawl',
    ])
  })

  it.each(prefixes)('$workspace is of the shape the eviction sweep is safe under', ({ prefix }) => {
    expect(CACHE_PREFIX_SHAPE.test(prefix)).toBe(true)
  })

  it('is unique, and none is a prefix of another', () => {
    for (const mine of prefixes) {
      const collides = prefixes.filter(
        (other) => other.workspace !== mine.workspace && other.prefix.startsWith(mine.prefix),
      )
      expect(
        collides.map(({ workspace }) => workspace),
        `${mine.workspace}'s ${mine.prefix} would sweep away another program's caches`,
      ).toEqual([])
    }
  })
})
