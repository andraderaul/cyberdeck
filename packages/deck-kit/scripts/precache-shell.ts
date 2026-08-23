// The build half of the offline story (ADR 0027): after Vite has written `dist`, list what it
// wrote, and compile the service worker with that list baked in. One plugin, four programs — the
// only thing a caller supplies is the prefix its caches are named with.
//
// Hand-rolled rather than `vite-plugin-pwa`, and the reason is the same one `scripts/social-assets.mjs`
// gives for reaching for Playwright instead of a rasteriser: the deck buys no tool it can spell
// itself. The plugin's value is runtime caching strategies and precache revisioning, and the policy
// decided for this — precache the shell whole, no runtime strategies (ADR 0027) — uses neither; the
// 550-package `workbox-build` tree would have been carried for a directory walk and a `define`.

import { createHash } from 'node:crypto'
import { readdirSync, readFileSync, statSync } from 'node:fs'
import { join, relative, resolve, sep } from 'node:path'
import { fileURLToPath } from 'node:url'
import { build, type Plugin } from 'vite'
import type { ShellEntry } from '../src/pwa/policy'

/**
 * The worker this plugin compiles, found relative to this file: the two ship together and must
 * never be resolved through the consuming app, so a program that moves its own `src/` cannot lose
 * it.
 *
 * Resolved on call rather than at module scope. Under Vitest `import.meta.url` is a dev-server URL
 * rather than a `file:` one, and a module-level `fileURLToPath` would throw on import alone — which
 * would put the guards below out of reach of the tests that exist to fire them.
 */
function workerSource(): string {
  return resolve(fileURLToPath(new URL('.', import.meta.url)), '../src/pwa/service-worker.ts')
}

/** Where the plugin's failures tell a reader to go. Spelled once, because the message is the whole
 *  point of the guard below and a wrong path in it wastes the guard. */
const THIS_FILE = 'packages/deck-kit/scripts/precache-shell.ts'

/** What a browser asks this program for while it is running. */
const SHELL_EXTENSIONS = ['.html', '.css', '.js', '.svg', '.png', '.webmanifest']

/**
 * Emitted files the running program never fetches, so precaching them would only cost the install
 * its bytes. `og-card.png` is 1200x630 and exists for a link preview crawler; `sw.js` is the worker
 * itself, which the browser fetches through its own update check and must never serve from a cache
 * it controls.
 */
const NOT_THE_SHELL = ['og-card.png', 'sw.js']

/**
 * Every file of the built shell, in a stable order so the cache name is a function of the build.
 *
 * Exported for its tests: both of the throws below are guards whose whole value is that they fire,
 * and the plugin around them is a `closeBundle` hook that can only be exercised by running a build.
 *
 * Every emitted file must be *classified* — precached, or named in `NOT_THE_SHELL` — and anything
 * else stops the build. The tempting shape is to let an unrecognised extension fall through the
 * allowlist quietly, and that failure is invisible in the worst possible way: `addAll` still
 * succeeds, the build is green, and the missing file surfaces as a broken asset for a user who is
 * already offline and has no way to go and fetch it. The first `.woff2`, `.json` or `.wasm` this
 * deck emits should be a decision someone makes here, not a hole someone finds later — and the
 * decision is now made once for four programs rather than four times, which is the point of the
 * plugin living in the kit.
 */
export function collectShell(outDir: string, exclude: readonly string[] = []): ShellEntry[] {
  const notTheShell = new Set([...NOT_THE_SHELL, ...exclude])
  const entries: ShellEntry[] = []
  const walk = (dir: string): void => {
    for (const name of readdirSync(dir).sort()) {
      const path = join(dir, name)
      if (statSync(path).isDirectory()) {
        walk(path)
        continue
      }
      // `.DS_Store` and friends are the filesystem's, not the build's.
      if (name.startsWith('.')) {
        continue
      }
      const url = relative(outDir, path).split(sep).join('/')
      if (notTheShell.has(url)) {
        continue
      }
      if (!SHELL_EXTENSIONS.some((ext) => name.endsWith(ext))) {
        throw new Error(
          `${url} was emitted into the build but is neither part of the shell nor excluded from it.\n` +
            'An unclassified file would be dropped from the precache silently and go missing only ' +
            `for a user who is already offline. Decide which it is, in ${THIS_FILE}:\n` +
            `  · the running program fetches it  → add its extension to SHELL_EXTENSIONS (${SHELL_EXTENSIONS.join(' ')})\n` +
            `  · it exists for something else    → add '${url}' to NOT_THE_SHELL (${[...notTheShell].join(' ')}),\n` +
            "    or to this program's own precacheShell({ exclude }) if it is only this program's",
        )
      }
      entries.push({
        url,
        revision: createHash('sha256').update(readFileSync(path)).digest('hex').slice(0, 16),
      })
    }
  }
  walk(outDir)
  return entries
}

/**
 * The two things a shell must contain, checked apart from the walk so a build failure names the
 * missing one rather than "something was wrong with dist".
 */
export function assertServeable(shell: readonly ShellEntry[], outDir: string): void {
  if (!shell.some((entry) => entry.url === 'index.html')) {
    throw new Error(`no index.html in ${outDir} — the shell would have nothing to serve`)
  }
  if (!shell.some((entry) => entry.url === 'manifest.webmanifest')) {
    throw new Error(
      `no manifest.webmanifest in ${outDir} — the worker would install a program a browser ` +
        'never offers to install. Add public/manifest.webmanifest, or drop precacheShell().',
    )
  }
}

export interface PrecacheShellOptions {
  /**
   * What this program's caches are named with — `'golem-shell-'`, and so on. Checked against
   * `CACHE_PREFIX_SHAPE` at build time; `cache-prefixes.test.ts` is what holds the deck's four
   * apart from each other, which no single app's build can see.
   */
  cachePrefix: string
  /**
   * Emitted files this program does not want precached, beyond the deck-wide `NOT_THE_SHELL`.
   *
   * The escape hatch ADR 0027 reserved, and the *only* sanctioned answer to a shell that has grown
   * too large: a named exclusion in the program that has the problem, never a runtime strategy and
   * never a quiet widening of the shared set. Empty for all four today, which is the honest state —
   * SPRAWL//Atlas is the largest at 621 kB and installs indistinguishably from the others.
   */
  exclude?: readonly string[]
}

/**
 * A cache prefix must end in `-`, and carry something before it.
 *
 * The worker evicts with `startsWith`, so a bare `'golem'` would match a hypothetical
 * `'golemetry-shell-…'` and delete a neighbour's shell on an origin the two shared. A trailing
 * separator is what makes the sweep a whole-word match in practice. Enforced rather than documented,
 * because the failure is another program's data disappearing and it would never be traced here.
 */
export const CACHE_PREFIX_SHAPE = /^[a-z][a-z0-9]*-shell-$/

/**
 * Compiles the kit's service worker to the calling program's `dist/sw.js`, with the precache
 * manifest and the cache prefix defined in.
 *
 * A nested Vite build rather than the app's own: a service worker is a separate top-level script
 * with no module graph in common with the page, and a classic (non-module) one at that, so it
 * cannot be an extra entry of a build whose output is ES modules.
 */
export function precacheShell({ cachePrefix, exclude = [] }: PrecacheShellOptions): Plugin {
  if (!CACHE_PREFIX_SHAPE.test(cachePrefix)) {
    throw new Error(
      `cachePrefix ${JSON.stringify(cachePrefix)} is not of the form '<program>-shell-'.\n` +
        'The worker evicts stale caches with startsWith, so a prefix that is a prefix of another ' +
        "program's would delete that program's shell on an origin the two share.",
    )
  }
  let outDir = ''
  return {
    name: 'cyberdeck:precache-shell',
    // The worker exists only in a deploy. In dev there is nothing stale to serve and nothing to
    // install; `useAppUpdate` sits out the same way.
    apply: 'build',
    configResolved(config) {
      outDir = resolve(config.root, config.build.outDir)
    },
    // `closeBundle` rather than `writeBundle`: `public/` is copied after the bundle is written, and
    // the icon set and the web app manifest live there.
    async closeBundle() {
      const shell = collectShell(outDir, exclude)
      assertServeable(shell, outDir)
      await build({
        configFile: false,
        logLevel: 'warn',
        define: {
          __SHELL_MANIFEST__: JSON.stringify(shell),
          __SHELL_CACHE_PREFIX__: JSON.stringify(cachePrefix),
        },
        build: {
          outDir,
          emptyOutDir: false,
          target: 'es2020',
          // IIFE, so `dist/sw.js` is one classic script with nothing to import at runtime — which
          // is what `navigator.serviceWorker.register` without `{ type: 'module' }` requires, and
          // what every browser that has service workers at all can run.
          lib: { entry: workerSource(), formats: ['iife'], name: 'sw', fileName: () => 'sw.js' },
        },
      })
    },
  }
}
