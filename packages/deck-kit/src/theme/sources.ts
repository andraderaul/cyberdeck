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

/**
 * Every workspace under `apps/`, by directory name. Not `programs()`: since the hub landed there
 * the directory holds the deck's workspaces, one of which is deliberately not a program but the
 * deck's chrome (ADR 0025). The guards want all of them either way — they scan what ships.
 */
export function workspaces(): string[] {
  const root = resolve(repoRoot(), APPS_FROM_ROOT)
  return readdirSync(root, { withFileTypes: true })
    .filter((entry) => entry.isDirectory())
    .map((entry) => entry.name)
    .sort()
}

/** A source file the vocabulary guard reads, with the path a failure should name. */
export type Source = { path: string; source: string }

// Stylesheets are in here because a `var()` reference to a primitive names a hue just as surely as
// a class does, and it is the spelling that hides: it never appears in a `className`, so a scan of
// components alone walks straight past a program's `index.css`.
const SOURCE_EXTENSIONS = ['.ts', '.tsx', '.css']

/**
 * The only files where naming a retired hue is the job rather than the offence: the module that
 * defines the list, its own tests, and the stylesheet where the primitives are declared. Everything
 * else in `src/theme/` is scanned like any other source.
 */
const EXEMPT = [
  'packages/deck-kit/src/theme/audit.ts',
  'packages/deck-kit/src/theme/audit.test.ts',
  'packages/deck-kit/src/tokens.css',
]

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

/** Every source and stylesheet in every workspace and in the kit, minus the handful that define the
 *  vocabulary rather than consume it. */
export function colourBearingSources(): Source[] {
  const root = repoRoot()
  const out: Source[] = []
  for (const workspace of workspaces()) {
    const src = join(root, APPS_FROM_ROOT, workspace, 'src')
    if (existsSync(src)) {
      walk(src, root, out)
    }
    // The shell each workspace is served in. It sits outside `src/`, so a walk of the source tree
    // misses it entirely — and it is the one file that carries a `<style>` block and the inline
    // pre-paint script, which is to say the two places a hue could be named before React exists.
    const html = join(root, APPS_FROM_ROOT, workspace, 'index.html')
    if (existsSync(html)) {
      out.push({ path: relative(root, html), source: readFileSync(html, 'utf8') })
    }
  }
  walk(join(root, 'packages/deck-kit/src'), root, out)
  return out.filter(({ path }) => !EXEMPT.includes(path))
}

/** A program's web app manifest: the parsed JSON, and the `public/` directory its `src` paths are
 *  resolved against. */
export type Manifest = { program: string; manifest: Record<string, unknown>; publicDir: string }

/**
 * The web app manifest each installable program ships, for the programs that ship one.
 *
 * Found by looking rather than by a list, for the same reason `prePaintScripts` is: #325 adds the
 * remaining three, and a program that gains a manifest should become guarded by that fact alone.
 */
export function manifests(): Manifest[] {
  const root = repoRoot()
  const found: Manifest[] = []
  for (const program of programs()) {
    const publicDir = join(root, APPS_FROM_ROOT, program, 'public')
    const path = join(publicDir, 'manifest.webmanifest')
    if (existsSync(path)) {
      found.push({ program, manifest: JSON.parse(readFileSync(path, 'utf8')), publicDir })
    }
  }
  return found
}

/**
 * The blocking Theme script inlined into each workspace's HTML, for the ones that have it. Found by
 * looking rather than by a list, so a workspace that quietly loses its script — or quietly gains
 * one — shows up as a failure instead of as nothing.
 */
export function prePaintScripts(): { workspace: string; source: string }[] {
  const root = repoRoot()
  const found: { workspace: string; source: string }[] = []
  for (const workspace of workspaces()) {
    const html = join(root, APPS_FROM_ROOT, workspace, 'index.html')
    if (!existsSync(html)) {
      continue
    }
    const source = readFileSync(html, 'utf8')
    if (source.includes('data-theme')) {
      found.push({ workspace, source })
    }
  }
  return found
}
