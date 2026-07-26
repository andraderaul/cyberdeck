# CLAUDE.md — SPRAWL//Atlas

Guidance for Claude Code (claude.ai/code) when working in `apps/sprawl`.

This app is one program on the CYBERDECK deck — see the root `CLAUDE.md` for the monorepo layout,
the deck-wide comment convention, and the release ritual. Paths below are relative to `apps/sprawl`.
Read `CONTEXT.md` for the domain language and the piece-not-tool framing (ADR 0021).

## Status

**v1 complete** (#225–#230). The map opens in OVERFLOW (`1 px = 1 Gbps`, honestly blown white) on the
real vendored PeeringDB snapshot; you repair it by sliding the log window coarser — wheel, drag or
arrow keys over the canvas — while the always-visible reader tracks `1 px ≈ N Gbps/Tbps` live and
flips out of its OVERFLOW voice as structure emerges. City labels + hover orient without a basemap;
`B` toggles the earned coastline gabarito; the export is a shareable link that opens the recipient at
the same scale (PNG a quiet secondary). A time axis and a pan/zoom viewport are deferred (ADR 0021).

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
- **Data** (`src/atlas/dataset.ts`): loads the committed vendored snapshot (ADR 0022) through the
  generated `src/data/snapshot.ts` pointer, which imports the dated `dataset-YYYY-MM.json`. The pure
  core only sees the `Dataset` shape, so re-vendoring a newer month changes nothing downstream.
- **Data pipeline** (`scripts/`): `aggregate.mjs` is the pure join (PeeringDB rows → points,
  unit-tested); `vendor-dataset.mjs` is the impure shell that fetches and writes the dated snapshot +
  the generated pointer (`npm run vendor:dataset`). A scheduled CI job
  (`.github/workflows/vendor-sprawl-dataset.yml`) re-runs it and opens a PR on drift. Lives in the
  app, not deck-kit — single consumer (ADR 0022). `vendor-coastline.mjs` (`npm run vendor:coastline`)
  is a one-off vendor of the earned basemap's coastline — no schedule; coastlines don't drift.
- **Earned basemap** (#229): `projectCoastline` (pure, `src/atlas/basemap.ts`) projects a vendored
  Natural Earth 110m coastline onto the *same* equirectangular frame as the points; `paintBasemap`
  strokes it faintly over the light. Off by default (the first screen is pure light on dark), toggled
  by `B` or the `BasemapToggle` chip — a confirming gabarito, not the ground (ADR 0021, P6).
- **Shareable link** (#230): `encodeView`/`decodeView` (pure, `src/atlas/share.ts`) round-trip the
  scale position (and basemap) through a URL query. App boots from `window.location.search` and keeps
  the address bar synced (`replaceState`), so the artifact *is* state (ADR 0021) — the link opens the
  recipient at the same point in the vertigo, deterministic on the fixed snapshot. `ExportControls`
  foregrounds the link and offers PNG (`shareOrDownloadCanvas`) as a quiet secondary.
- **Shell component** (`src/components/atlas-canvas.tsx`): the gesture surface + the paint. One
  projection runs in **CSS space** (`useElementSize` + `project`) and is shared by the canvas paint
  (context scaled to `devicePixelRatio` via `setTransform`) and the DOM overlays, so labels and hover
  land in the same coordinate space the map is drawn in.
- **Overlays** (#228): `topCityLabels` (pure, `src/atlas/labels.ts`) picks the strongest cities,
  spatially thinned so the dense European core doesn't pile names into a smear; `nearestPoint` +
  `formatInspection` (pure, `src/atlas/inspect.ts`) drive hover. `useHover` hit-tests the pointer;
  `CityLabels` / `HoverInspector` render them. Both carry their own contrast over the artwork (ADR 0013).

## Design system

The visual language lives in `@cyberdeck/deck-kit` (ADR 0014): `src/index.css` imports the kit's
`tokens.css`, and `tailwind.config.js` extends the kit's preset. The deck-kit glob in the Tailwind
`content` is load-bearing — without it the kit primitives' classes are purged at build (root
`CLAUDE.md`).

The canvas is the piece. Its two colors live in `paint.ts` — `--void` (`#0a0a0f`) as the dark field
and `--soft-cyan` (`#80f4ff`) as the light — the one place in the app a color isn't a token
reference, because a canvas context can't resolve a CSS token. Everywhere else (DOM, overlays) reads
the tokens: even the label glow's dark backing is `var(--void)`, not a repeated literal.

## Key files

- `src/atlas/types.ts` — `DataPoint`, `Scale`, `Viewport`, `RenderInstruction` (the DOM-free core)
- `src/atlas/project.ts` — `project()`, `projectLatLng()`, `brightnessFor()`, `WINDOW_DECADES`
- `src/atlas/scale.ts` — the pure scale instrument: `scaleRange()`, `scaleAt()`, `positionOf()`,
  `clippedFraction()`, `isOverflow()`, `formatScaleUnit()`, `OVERFLOW_TOP_CAPACITY_MBPS`
- `src/atlas/paint.ts` — `paintFrame()` + `createGlowSprite()`: the only canvas-touching functions
- `src/atlas/dataset.ts` — `DATASET`, `Dataset`, `maxCapacity()`, `skeletonScale()`
- `src/data/dataset-sample.json` — the #225 stand-in; #227 adds the vendored `dataset-YYYY-MM.json`
- `src/hooks/use-scale.ts` — `useScale()`: binds wheel / drag / arrow keys on the map to the scale
- `src/components/atlas-canvas.tsx` — the imperative shell + the scale surface (the map *is* the control)
- `src/components/scale-reader.tsx` — the always-visible live reader / OVERFLOW voice
- `../../docs/adr/0021-*`, `0022-*` — the piece-not-tool and vendored-snapshot decisions

## Comment convention

See the root `CLAUDE.md` — the convention is deck-wide.
