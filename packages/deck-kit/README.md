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
| `@cyberdeck/deck-kit/ui` | `Button` |
| `@cyberdeck/deck-kit/tokens.css` | the CSS custom properties (design tokens) |
| `@cyberdeck/deck-kit/tailwind-preset` | the Tailwind `theme` |

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
