// SPRAWL//Atlas is excluded from the deck's sound layer by explicit decision (ADR 0021, ADR 0029):
// its pixels are the piece rather than the deck's chrome, and a work's sound belongs to the work.
// Asserted here rather than left as an omission, in the register of the roster guard's companion
// check that the piece carries no pre-paint script — so a future consistency pass has to argue with
// a failing test instead of quietly "fixing" a line nobody noticed was missing.
//
// **Silence has two halves, and #398's guard held only the first.** The piece must not *reach for*
// the module — which is a fact about `apps/sprawl` — and the module must not *reach* the piece on
// its own — which is a fact about the kit and no scan of `apps/sprawl` could ever see. The second
// half is the one the move into the kit created: sprawl already imports `@cyberdeck/deck-kit/ui`
// and `/pwa`, so an `installClickSound()` at the module scope of anything either barrel pulls in
// would install the listener in a program whose sources never name it.
//
// The first half is also wider than `src/**/*.{ts,tsx}` now. `apps/sprawl/index.html` carries
// script tags — it is where the pre-paint theme script lives on the themed programs — so an inline
// installer there would have been invisible to a guard that read only TypeScript.

import { existsSync, readdirSync, readFileSync } from 'node:fs'
import { dirname, join, relative } from 'node:path'
import { describe, expect, it } from 'vitest'

const SPRAWL = join('apps', 'sprawl')
const KIT_SRC = join('packages', 'deck-kit', 'src')

/** Vitest runs each workspace from its own package root, and a guard that silently reads no files
 *  is worse than one that cannot start. */
function repoRoot(): string {
  let dir = process.cwd()
  while (!existsSync(join(dir, SPRAWL))) {
    const parent = dirname(dir)
    if (parent === dir) {
      throw new Error(`Could not find ${SPRAWL} above ${process.cwd()}`)
    }
    dir = parent
  }
  return dir
}

/** Everything the module is reachable by: the specifier a caller imports, the two names it exports,
 *  and the key it reads. */
const SOUND_NAMES = [
  '@cyberdeck/deck-kit/sound',
  'installClickSound',
  'SoundControl',
  'cyberdeck:sound',
]

// Anything a browser would execute. `.html` is in the set for the inline-script hole above; build
// output and dependencies are not sources and would only make the guard slow and flaky.
const EXECUTABLE = /\.(ts|tsx|js|jsx|mjs|cjs|html)$/
const NOT_SOURCE = new Set([
  'node_modules',
  'dist',
  'coverage',
  'test-results',
  'playwright-report',
])

function sources(root: string, dir: string): Array<[string, string]> {
  return readdirSync(dir, { withFileTypes: true }).flatMap((entry) => {
    const path = join(dir, entry.name)
    if (entry.isDirectory()) {
      return NOT_SOURCE.has(entry.name) ? [] : sources(root, path)
    }
    return EXECUTABLE.test(entry.name)
      ? ([[relative(root, path), readFileSync(path, 'utf8')]] as Array<[string, string]>)
      : []
  })
}

describe('SPRAWL//Atlas is excluded on purpose', () => {
  const root = repoRoot()
  const piece = sources(root, join(root, SPRAWL))

  it('reads its own sources at all, `index.html` among them', () => {
    expect(piece.length).toBeGreaterThan(0)
    expect(piece.map(([path]) => path)).toContain(join(SPRAWL, 'index.html'))
  })

  it.each(SOUND_NAMES)('names %s nowhere', (name) => {
    expect(piece.filter(([, source]) => source.includes(name)).map(([path]) => path)).toEqual([])
  })

  // The other half: the kit installs nothing on its own. Only a program's `main.tsx` calls this,
  // which is what keeps "sprawl imports `/ui`" from quietly meaning "sprawl makes a sound".
  it('is never installed by the kit itself — a program asks, or nothing happens', () => {
    const installers = sources(root, join(root, KIT_SRC)).filter(
      // The negative lookbehind is what separates a call from the declaration in `sound.ts`, whose
      // signature reads `function installClickSound(): () => void`.
      ([path, source]) =>
        !path.includes('.test.') && /(?<!function )installClickSound\(\s*\)/.test(source),
    )
    expect(installers.map(([path]) => path)).toEqual([])
  })
})
