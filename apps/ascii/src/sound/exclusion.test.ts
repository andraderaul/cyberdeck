// SPRAWL//Atlas is excluded from the deck's sound layer by explicit decision (ADR 0021, ADR 0029):
// its pixels are the piece rather than the deck's chrome, and a work's sound belongs to the work.
// Asserted here rather than left as an omission, in the register of the roster guard's companion
// check that the piece carries no pre-paint script — so a future consistency pass has to argue with
// a failing test instead of quietly "fixing" a line nobody noticed was missing.
//
// It travels with the module it names: #400 moves this directory into `packages/deck-kit/src/sound/`
// and the guard goes along, still written against whichever names the module currently exports.

import { existsSync, readdirSync, readFileSync } from 'node:fs'
import { dirname, join } from 'node:path'
import { describe, expect, it } from 'vitest'

const SPRAWL_SRC = join('apps', 'sprawl', 'src')

/** Vitest runs each workspace from its own package root, and a guard that silently reads no files
 *  is worse than one that cannot start. */
function repoRoot(): string {
  let dir = process.cwd()
  while (!existsSync(join(dir, SPRAWL_SRC))) {
    const parent = dirname(dir)
    if (parent === dir) {
      throw new Error(`Could not find ${SPRAWL_SRC} above ${process.cwd()}`)
    }
    dir = parent
  }
  return dir
}

/** Everything the module is reachable by: its two exports a caller writes, and the key it reads. */
const SOUND_NAMES = ['installClickSound', 'SoundControl', 'cyberdeck:sound']

function sources(dir: string): string[] {
  return readdirSync(dir, { withFileTypes: true }).flatMap((entry) => {
    const path = join(dir, entry.name)
    if (entry.isDirectory()) {
      return sources(path)
    }
    return /\.(ts|tsx)$/.test(entry.name) ? [readFileSync(path, 'utf8')] : []
  })
}

describe('SPRAWL//Atlas is excluded on purpose', () => {
  const piece = sources(join(repoRoot(), SPRAWL_SRC))

  it('reads its own sources at all', () => {
    expect(piece.length).toBeGreaterThan(0)
  })

  it.each(SOUND_NAMES)('names %s nowhere', (name) => {
    expect(piece.filter((source) => source.includes(name))).toEqual([])
  })
})
