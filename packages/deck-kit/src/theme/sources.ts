// The guards' impure half (ADR 0024): it finds the repository and reads files, so that `audit.ts`
// can stay text-in / findings-out. Only the guard tests import this.

import { existsSync, readdirSync, readFileSync } from 'node:fs'
import { dirname, join, relative, resolve } from 'node:path'

const TOKENS_FROM_ROOT = 'packages/deck-kit/src/tokens.css'
const APPS_FROM_ROOT = 'apps'

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

/** Every program on the deck, by directory name. */
export function programs(): string[] {
  const root = resolve(repoRoot(), APPS_FROM_ROOT)
  return readdirSync(root, { withFileTypes: true })
    .filter((entry) => entry.isDirectory())
    .map((entry) => entry.name)
    .sort()
}

/** A source file the vocabulary guard reads, with the path a failure should name. */
export type Source = { path: string; source: string }

const SOURCE_EXTENSIONS = ['.ts', '.tsx']

function walk(dir: string, root: string, out: Source[]): void {
  for (const entry of readdirSync(dir, { withFileTypes: true })) {
    const path = join(dir, entry.name)
    if (entry.isDirectory()) {
      if (entry.name !== 'node_modules' && entry.name !== 'dist') {
        walk(path, root, out)
      }
    } else if (SOURCE_EXTENSIONS.some((ext) => entry.name.endsWith(ext))) {
      out.push({ path: relative(root, path), source: readFileSync(path, 'utf8') })
    }
  }
}

/**
 * Every source file in every program and in the kit — the whole surface a colour class can be
 * written on. This module is skipped, and only this one: the retired names are its subject matter,
 * so it is the one file where naming them is the job rather than the offence.
 */
export function colourBearingSources(): Source[] {
  const root = repoRoot()
  const out: Source[] = []
  for (const program of programs()) {
    const src = join(root, APPS_FROM_ROOT, program, 'src')
    if (existsSync(src)) {
      walk(src, root, out)
    }
  }
  walk(join(root, 'packages/deck-kit/src'), root, out)
  return out.filter(({ path }) => !path.startsWith(join('packages/deck-kit/src/theme')))
}

/**
 * The blocking Theme script inlined into each program's HTML, for the programs that have one.
 * Found by looking rather than by a list, so a program that quietly loses its script — or quietly
 * gains one — shows up as a failure instead of as nothing.
 */
export function prePaintScripts(): { program: string; source: string }[] {
  const root = repoRoot()
  const found: { program: string; source: string }[] = []
  for (const program of programs()) {
    const html = join(root, APPS_FROM_ROOT, program, 'index.html')
    if (!existsSync(html)) {
      continue
    }
    const source = readFileSync(html, 'utf8')
    if (source.includes('data-theme')) {
      found.push({ program, source })
    }
  }
  return found
}
