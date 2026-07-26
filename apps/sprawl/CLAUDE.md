# CLAUDE.md — SPRAWL//Atlas

Guidance for Claude Code (claude.ai/code) when working in `apps/sprawl`.

This app is one program on the CYBERDECK deck — see the root `CLAUDE.md` for the monorepo layout,
the deck-wide comment convention, and the release ritual. Paths below are relative to `apps/sprawl`.
Read `CONTEXT.md` for the domain language and the piece-not-tool framing (ADR 0021).

## Status

Walking skeleton (#225): the layer stack is thin but complete — a committed sample dataset → the
pure `project(dataset, scale, viewport)` → `paintFrame(ctx, …)`, rendered at a fixed scale. The
scale gesture (#226), the vendored PeeringDB snapshot (#227), labels + hover (#228), the earned
basemap (#229) and the shareable link (#230) build on this seam.

## Commands

Run from this directory (or `--workspace @cyberdeck/sprawl` from the root; `npm run dev:sprawl`
from the root boots the dev server).

```bash
npm run dev        # start Vite dev server
npm run build      # tsc -b && vite build
npm run test:run   # vitest run
npx vitest run src/atlas/project.test.ts  # a single test file
```

Lint and format are repo-wide from the root: `npm run check`.

## Architecture

Single-page React/TS/Vite app. Fully client-side — the one data dependency is a committed static
snapshot (ADR 0022), no backend, no runtime fetch.

- **Pure core** (`src/atlas/project.ts`, ADR 0005): `project()` = equirectangular `projectLatLng`
  + the logarithmic `brightnessFor` window (`WINDOW_DECADES` decades below `scale.topCapacity`).
  Above the top clamps to white — the honest OVERFLOW (ADR 0021). No DOM; fully unit-tested.
- **Impure shell** (`src/atlas/paint.ts`): `paintFrame()` is the *only* canvas-touching function.
  Additive compositing (`globalCompositeOperation = 'lighter'`) makes dense regions bloom — points
  are painted as light, not markers.
- **Data** (`src/atlas/dataset.ts`): loads the committed snapshot behind a `Dataset` type. Swapping
  the sample for the real vendored file (#227) changes nothing downstream.
- **Shell component** (`src/components/atlas-canvas.tsx`): owns *when* to repaint (resize), sizes the
  backing store to `devicePixelRatio`, and calls the pure pair. It holds no scale logic — #226 lifts
  scale to live state here.

## Design system

The visual language lives in `@cyberdeck/deck-kit` (ADR 0014): `src/index.css` imports the kit's
`tokens.css`, and `tailwind.config.js` extends the kit's preset. The deck-kit glob in the Tailwind
`content` is load-bearing — without it the kit primitives' classes are purged at build (root
`CLAUDE.md`).

The canvas is the piece. Its two colors are pinned in `paint.ts`: `--void` (`#0a0a0f`) as the dark
field and `--soft-cyan` (`#80f4ff`) as the light. They are hardcoded there because a canvas context
can't resolve a CSS token — the one place in the app a color isn't a token reference.

## Key files

- `src/atlas/types.ts` — `DataPoint`, `Scale`, `Viewport`, `RenderInstruction` (the DOM-free core)
- `src/atlas/project.ts` — `project()`, `projectLatLng()`, `brightnessFor()`, `WINDOW_DECADES`
- `src/atlas/paint.ts` — `paintFrame()`: the only canvas-touching function
- `src/atlas/dataset.ts` — `DATASET`, `Dataset`, `maxCapacity()`, `skeletonScale()`
- `src/data/dataset-sample.json` — the #225 stand-in; #227 adds the vendored `dataset-YYYY-MM.json`
- `src/components/atlas-canvas.tsx` — the imperative shell around the canvas
- `../../docs/adr/0021-*`, `0022-*` — the piece-not-tool and vendored-snapshot decisions

## Comment convention

See the root `CLAUDE.md` — the convention is deck-wide.
