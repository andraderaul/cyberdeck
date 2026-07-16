# CLAUDE.md — GLITCH//Studio

Guidance for Claude Code (claude.ai/code) when working in `apps/glitch`.

This app is one program on the CYBERDECK deck — see the root `CLAUDE.md` for the monorepo
layout, the deck-wide comment convention, and the release ritual. Paths below are relative to
`apps/glitch`.

## Status

Tracer bullet (#77). The end-to-end path is live — Source Image → Channel Shift → PNG Export —
and the pure-core / imperative-shell seam is established. The remaining four Effects, Presets,
Seed / Re-roll, Live Source, Capture and Recording are not built yet; see `CONTEXT.md` for the
v1 scope they belong to.

## Commands

Run from this directory (or use `--workspace @cyberdeck/glitch` from the root).

```bash
npm run dev        # start Vite dev server
npm run build      # tsc -b && vite build
npm run test       # vitest (watch)
npm run test:run   # vitest run
npm run test:coverage           # vitest run --coverage
npx vitest run src/glitch/pipeline.test.ts  # run a single test file
```

Lint and format are repo-wide and run from the root: `npm run check`.

## Architecture

Single-page React/TS/Vite app. Fully client-side — no backend, no network.

### Glitch pipeline

1. `EmptyStateHero` → `SourceImageDropZone` hands an `HTMLImageElement` (Source Image) to `App`
2. `App` holds `GlitchSettings` state and passes it, with the Source Image, to `GlitchCanvas`
3. `GlitchCanvas` decides *when* to render: once per Source Image or GlitchSettings change via
   `useEffect`. It keeps the **hidden off-screen sampling canvas** (`hiddenRef`) that the shell
   draws into — kept separate from the visible canvas per ADR 0001
4. `renderGlitchFrame()` in `src/glitch/render-frame.ts` is the imperative shell: draws the
   Source onto the hidden canvas at the sampled size → `getImageData` → unwraps to a
   `PixelBuffer` → `applyPipeline()` → wraps back into `ImageData` → `putImageData` onto the
   visible canvas. Returns `false` (skips) if there's no 2D context or the Source has no
   intrinsic size yet
5. `applyPipeline()` is **pure** — `PixelBuffer` + `GlitchSettings` in, `PixelBuffer` out, no DOM
   (ADR 0005). It is the only place Effects run
6. The visible canvas is sized to the **sampled** dimensions, so the canvas *is* the output —
   PNG Export takes it as-is and CSS `object-contain` handles the on-screen fit

### Sampling cap

`sampleDimensions()` scales the Source to fit inside 800×800 (aspect-preserving) before any pixel
work, so a large image can't freeze the tab. The downscale itself rides on the hidden canvas'
`drawImage` — read and resize in one operation (ADR 0001).

Note this caps **both** axes, where ASCII//Convert's `resizeImage()` caps width alone. That's not
gratuitous divergence: ASCII resamples down to a `cols × rows` char grid, which bounds the work
whatever the Source's height. Here the sampled buffer *is* what `applyPipeline` walks, so a
500×20000 Source would sail through a width-only cap and freeze the tab.

### Error handling

Operational errors (Export) use the `AppError` plain-object shape (`type`, `message`, `cause?`),
surfaced via the toast system (`use-toast` + `ToastProvider`) — see ADR 0006. The typed-error-class
half of ADR 0006 has no counterpart here; this app has no AI surface. Image-load failures surface
through `loadImageFile`'s `onError` callback straight to the same toast.

### Domain language (from CONTEXT.md)

Use these terms precisely — avoid the listed alternatives:

| Term | Meaning | Avoid |
|------|---------|-------|
| **PixelBuffer** | `{ data, width, height }` — the pure core's currency, DOM-free | ImageData, bitmap, frame |
| **Effect** | A named, isolated pure `PixelBuffer → PixelBuffer` transform | filter, layer |
| **Pipeline** | The fixed, ordered sequence of Effects | stack, chain |
| **GlitchSettings** | Flat object holding every Effect's params — the look. Carries no Seed | options, config, filters |
| **Seed** | Seeds the Pipeline's pseudo-randomness — the arrangement. Lives beside GlitchSettings | random, rng |
| **Preset** | A named GlitchSettings snapshot — a curated look | filter, look |
| **Source Image** | Static uploaded image; immutable during session | uploadedImage, input image |
| **Export** | Taking the result out (PNG) | download, save |

`Seed` and `Preset` are domain terms the code hasn't reached yet — Channel Shift is the one
Effect with no randomness, so `applyPipeline` takes no Seed. It gains one when Block
Displacement lands.

### Design system

Copied by hand from ASCII//Convert (ADR 0011 — there is deliberately no shared `packages/`).
Tokens live as CSS custom properties in `src/index.css`; `tailwind.config.js` points at those
same variables, so `text-violet` and `var(--violet)` resolve to one value. Keep the copies in
step with `apps/ascii` by hand; the duplication is the signal that tells us what to extract later.

### Comment convention

See the root `CLAUDE.md` — the convention is deck-wide.

## Key files

**Glitch core**
- `src/glitch/types.ts` — `PixelBuffer`, `GlitchSettings`, `ChannelName`, `ChannelShiftParams`
- `src/glitch/pipeline.ts` — `applyPipeline()` (pure), `channelShift()` — see ADR 0005
- `src/glitch/image-utils.ts` — `sampleDimensions()` (800×800 cap), `sourceDimensions()`
- `src/glitch/render-frame.ts` — `renderGlitchFrame()`: the imperative shell

**Errors & utilities**
- `src/errors/app-error.ts` — `AppError`, `createError`, `normalizeError`, `Errors`
- `src/export/output.ts` — `outputFilename()`
- `src/hooks/use-toast.ts` — toast queue state
- `src/utils/cn.ts` — `cn()` (clsx + tailwind-merge)
- `src/utils/load-image-file.ts` — `loadImageFile()` (File → HTMLImageElement)
- `src/utils/share.ts` — `shareOrDownloadCanvas()` (Web Share API with download fallback)

**Components**
- `src/components/glitch-canvas.tsx` — lifecycle coordinator: drives the render
- `src/components/control-panel.tsx` — GlitchSettings controls
- `src/components/empty-state-hero.tsx` — initial empty state with the upload entry point
- `src/components/export-bar.tsx` — PNG Export control
- `src/components/toast-provider.tsx` — renders the toast queue
- `src/components/error-boundary.tsx` — generic React error boundary
- `src/components/ui/` — design system primitives: `button`, `label`, `slider`, `toast`,
  `toggle-group`, `source-image-drop-zone`

**Testing**
- `src/test-setup.ts` polyfills `ImageData` — happy-dom ships none, and the shell constructs one.

**ADRs**
- `../../docs/adr/` — all architectural decisions (deck-wide, at the repo root)
