// The guards' impure half (ADR 0024): it finds the repository and reads files, so that `audit.ts`
// can stay text-in / findings-out. Only the guard tests import this.

import { existsSync, readFileSync } from 'node:fs'
import { dirname, join, resolve } from 'node:path'

const TOKENS_FROM_ROOT = 'packages/deck-kit/src/tokens.css'

/**
 * The repository root, found by walking up from wherever the runner was started. Vitest runs each
 * workspace from its own package root, but nothing guarantees that, and a guard that silently
 * reads no files is worse than one that cannot start.
 */
function repoRoot(): string {
  let dir = process.cwd()
  while (true) {
    if (existsSync(join(dir, TOKENS_FROM_ROOT))) {
      return dir
    }
    const parent = dirname(dir)
    if (parent === dir) {
      throw new Error(`Could not find ${TOKENS_FROM_ROOT} above ${process.cwd()}`)
    }
    dir = parent
  }
}

/** The deck's one token stylesheet — every Theme the deck has, as written. */
export function readTokensCss(): string {
  return readFileSync(resolve(repoRoot(), TOKENS_FROM_ROOT), 'utf8')
}
