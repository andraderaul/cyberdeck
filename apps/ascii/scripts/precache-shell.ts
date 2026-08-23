// The build half of the offline story (ADR 0027): after Vite has written `dist`, list what it
// wrote, and compile the service worker with that list baked in.
//
// Hand-rolled rather than `vite-plugin-pwa`, and the reason is the same one `scripts/social-assets.mjs`
// gives for reaching for Playwright instead of a rasteriser: the deck buys no tool it can spell
// itself. The plugin's value is runtime caching strategies and precache revisioning, and the policy
// decided for this — precache the shell whole, no runtime strategies (ADR 0027) — uses neither; the
// 550-package `workbox-build` tree would have been carried for a directory walk and a `define`.

import { createHash } from 'node:crypto'
import { readdirSync, readFileSync, statSync } from 'node:fs'
import { join, relative, resolve, sep } from 'node:path'
import { build, type Plugin } from 'vite'
import type { ShellEntry } from '../src/pwa/policy'

/** What a browser asks this program for while it is running. */
const SHELL_EXTENSIONS = ['.html', '.css', '.js', '.svg', '.png', '.webmanifest']

/**
 * Emitted files the running program never fetches, so precaching them would only cost the install
 * its bytes. `og-card.png` is 1200x630 and exists for a link preview crawler; `sw.js` is the worker
 * itself, which the browser fetches through its own update check and must never serve from a cache
 * it controls.
 */
const NOT_THE_SHELL = new Set(['og-card.png', 'sw.js'])

/** Every file of the built shell, in a stable order so the cache name is a function of the build. */
function collectShell(outDir: string): ShellEntry[] {
  const entries: ShellEntry[] = []
  const walk = (dir: string): void => {
    for (const name of readdirSync(dir).sort()) {
      const path = join(dir, name)
      if (statSync(path).isDirectory()) {
        walk(path)
        continue
      }
      const url = relative(outDir, path).split(sep).join('/')
      if (!SHELL_EXTENSIONS.some((ext) => name.endsWith(ext)) || NOT_THE_SHELL.has(url)) {
        continue
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
 * Compiles `src/pwa/service-worker.ts` to `dist/sw.js` with the precache manifest defined in.
 *
 * A nested Vite build rather than the app's own: a service worker is a separate top-level script
 * with no module graph in common with the page, and a classic (non-module) one at that, so it
 * cannot be an extra entry of a build whose output is ES modules.
 */
export function precacheShell(): Plugin {
  let outDir = ''
  let swSource = ''
  return {
    name: 'cyberdeck:precache-shell',
    // The worker exists only in a deploy. In dev there is nothing stale to serve and nothing to
    // install; `useAppUpdate` sits out the same way.
    apply: 'build',
    configResolved(config) {
      outDir = resolve(config.root, config.build.outDir)
      swSource = resolve(config.root, 'src/pwa/service-worker.ts')
    },
    // `closeBundle` rather than `writeBundle`: `public/` is copied after the bundle is written, and
    // the icon set and the web app manifest live there.
    async closeBundle() {
      const shell = collectShell(outDir)
      if (!shell.some((entry) => entry.url === 'index.html')) {
        throw new Error(`no index.html in ${outDir} — the shell would have nothing to serve`)
      }
      await build({
        configFile: false,
        logLevel: 'warn',
        define: { __SHELL_MANIFEST__: JSON.stringify(shell) },
        build: {
          outDir,
          emptyOutDir: false,
          target: 'es2020',
          // IIFE, so `dist/sw.js` is one classic script with nothing to import at runtime — which
          // is what `navigator.serviceWorker.register` without `{ type: 'module' }` requires, and
          // what every browser that has service workers at all can run.
          lib: { entry: swSource, formats: ['iife'], name: 'sw', fileName: () => 'sw.js' },
        },
      })
    },
  }
}
