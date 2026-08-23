# @cyberdeck/deck-kit

The shared shell every program on the deck builds on — the visual language (design tokens +
Tailwind preset), the `ui/` primitives, the framework-neutral hooks and utils, and the generic
browser plumbing. It is deliberately **not** a domain core: each app's pipeline (ASCII conversion,
glitch Effects) stays in the app. See [ADR 0014](../../docs/adr/0014-deck-kit-shared-package.md).

## Consumed as source

Private workspace, no build step, no `dist/`. Its `exports` point straight at `src/*` and each app's
Vite transpiles the TypeScript. The package is therefore not consumable outside this monorepo — which
is fine, nothing else consumes it.

## Subpath exports

| Import | What |
|--------|------|
| `@cyberdeck/deck-kit/utils` | `cn`, `isTouchDevice`, `loadImageFile`, `shareOrDownloadBlob`, `shareOrDownloadCanvas` |
| `@cyberdeck/deck-kit/ui` | `Button`, `HeaderButton`, `TabStrip`, `ThemeControl`, `Footer`, and the rest of the primitives |
| `@cyberdeck/deck-kit/hooks` | `useToast`, `useDialog` |
| `@cyberdeck/deck-kit/errors` | the operational-error mechanism (`AppError`, `createError`, `normalizeError`) |
| `@cyberdeck/deck-kit/recording` | `useRecording`, `formatElapsedTime` |
| `@cyberdeck/deck-kit/pwa` | `useAppUpdate` and `UpdateBanner` — the page's half of ADR 0027 |
| `@cyberdeck/deck-kit/tokens.css` | the CSS custom properties (design tokens), including every Theme |
| `@cyberdeck/deck-kit/tailwind-preset` | the Tailwind `theme` |

## Making a program installable

Three things, and none of them is a copy of anything (ADR 0027):

1. `public/manifest.webmanifest` — hand-written; the roster guard checks its colours and its icons.
2. `precacheShell({ cachePrefix: '<program>-shell-' })` in the plugin list of `vite.config.ts`. The
   prefix is what the worker's eviction sweep matches on: the plugin refuses anything not of that
   shape at build time, and `src/pwa/cache-prefixes.test.ts` reads all four configs and holds them
   apart from each other — which is the half no single program's build can see.

   `exclude` is the second option, and the *only* sanctioned answer to a shell that has grown too
   large (ADR 0027): a named exclusion in the program that has the problem, never a runtime strategy.
   Empty in all four today.

   `scripts/precache-shell.ts` is the **one thing here imported by path** —
   `'../../packages/deck-kit/scripts/precache-shell'` — and not through the `exports` map. Vite
   bundles a relative import into the config it is loading, but leaves a bare specifier for Node to
   `import` at runtime, and Node cannot load a `.ts` file. Since the kit ships source with no build
   step, the package name would work only on a Node new enough to strip types.
3. `const update = useAppUpdate()` and `{update.isReady && <UpdateBanner onApply={update.apply} />}`
   directly under the program's header.

The worker itself (`src/pwa/service-worker.ts`) is compiled against `WebWorker`, which cannot share a
TypeScript project with `DOM` — hence `tsconfig.worker.json` beside the app and node projects.

## Consuming the visual language — the one non-obvious constraint

An app that renders a kit primitive must:

1. `@import '@cyberdeck/deck-kit/tokens.css'` in its `index.css`, and
2. spread the preset in its `tailwind.config.js`:
   ```js
   import deckKitPreset from '@cyberdeck/deck-kit/tailwind-preset'
   export default { presets: [deckKitPreset], content: [/* … */] }
   ```
3. **Add `../../packages/deck-kit/src/**/*.{ts,tsx}` to its Tailwind `content` glob** — otherwise the
   primitives' utility classes are never seen by the scanner and get purged at build.

## Themes

The visual language is a set of seven named Themes (ADR 0024): `ice` (the default and the fallback),
`construct`, `chiba`, `kuang`, `ougou`, `solitude` and `onyx`. All seven are dark — the deck has no
modes, it has Themes. `CONTEXT.md` carries the roster with each Theme's character.

**Name the role, not the hue.** `text-accent`, never `text-violet`. The primitive hue names are
`ice`'s vocabulary and no longer exist in the preset at all, so naming one renders unstyled rather
than erroring. Adding a Theme is a block of semantic values in `tokens.css` and nothing else: the
tints derive from their source hue and the component tokens point at roles.

The roster and its resolution rule live in `src/theme/themes.ts`. They are not a subpath export:
no program needs them — `<ThemeControl />` is the whole interface — and the kit's bar for public
API is a real caller, not an anticipated one (ADR 0014).

A program that offers a Theme mounts `<ThemeControl />` in its header and inlines the blocking
pre-paint script in its `index.html` — the one in `apps/golem/index.html` is the copy to take.
Without the script the default palette paints for a frame before the choice arrives.

Three guards in `src/theme/` keep it honest, and all three run in the ordinary test command:

| Guard | What it proves |
|-------|----------------|
| **contrast** | every Theme meets the Theme Contract, resolved from the real token values |
| **vocabulary** | no source, stylesheet or `index.html` in any program or in the kit names a primitive — the ban list is asserted against every literal in `tokens.css` that no Theme restates, so it cannot drift from the stylesheet |
| **roster** | the TypeScript, the Theme blocks and the hand-inlined scripts agree — and SPRAWL//Atlas still has no script, which is deliberate (ADR 0021) |

Their pure half is `src/theme/audit.ts`: text in, findings out, no filesystem.
