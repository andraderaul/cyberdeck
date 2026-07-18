# CLAUDE.md — GLITCH//Studio

Guidance for Claude Code (claude.ai/code) when working in `apps/glitch`.

This app is one program on the CYBERDECK deck — see the root `CLAUDE.md` for the monorepo
layout, the deck-wide comment convention, and the release ritual. Paths below are relative to
`apps/glitch`.

## Status

Tracer bullet (#77) plus Pixel Sort (#78), Scanlines (#79), Noise (#80), Block Displacement with
Seed / Re-roll (#81), Live Source + Capture (#82), Copy (#83), the advanced panel (#84), Recording
(#85) and Presets + Randomize (#86), plus Chromatic Aberration (#116). All six Effects are live —
Source Image *or* Live Source → Block Displacement → Pixel Sort → Channel Shift → Chromatic
Aberration → Scanlines → Noise → PNG Export / Capture / Copy / Recording — the pure-core /
imperative-shell seam is established, and the Pipeline is deterministic in GlitchSettings + Seed.
The front door is the six Presets plus Randomize; every Effect's params are reachable behind the
advanced affordance. The v1 scope in `CONTEXT.md` is complete.

The Preset **values** are taste, not derivation: they are the one thing here a human curates, and
re-curating a number in `presets.ts` is a design change, not a bug fix.

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

1. `EmptyStateHero` offers the two entry points: `SourceImageDropZone` hands an `HTMLImageElement`
   (Source Image) to `App`, or **use webcam** switches `useWebcamState` to the Live Source
2. `App` holds `GlitchSettings` state and, **beside** it, the `Seed` — two separate pieces of state,
   which is what lets Re-roll draw a new Seed and leave the look alone. Both go to `GlitchCanvas`
   with whichever Source is active
3. `GlitchCanvas` decides *when* to render: a Source Image once per Source, GlitchSettings or Seed
   change via `useEffect`; a Live Source on a `requestAnimationFrame` loop throttled to ~15fps
   (ADR 0002) instead. It keeps the **hidden off-screen sampling canvas** (`hiddenRef`) that the
   shell draws into — kept separate from the visible canvas per ADR 0001
4. `renderGlitchFrame()` in `src/glitch/render-frame.ts` is the imperative shell: draws the
   Source onto the hidden canvas at the sampled size → `getImageData` → unwraps to a
   `PixelBuffer` → `applyPipeline()` → wraps back into `ImageData` → `putImageData` onto the
   visible canvas. Returns `false` (skips) if there's no 2D context or the Source has no
   intrinsic size yet. A `GlitchSource` is an image *or* a video — one webcam frame is just
   another Source to sample, so both paths share this one shell
5. `applyPipeline()` is **pure** — `PixelBuffer` + `GlitchSettings` + `Seed` in, `PixelBuffer` out,
   no DOM (ADR 0005). It is the only place Effects run, and it holds no randomness of its own: every
   draw comes off the Seed's stream (`createRng`) or a Seed-fed positional hash
6. The visible canvas is sized to the **sampled** dimensions, so the canvas *is* the output —
   PNG Export takes it as-is and CSS `object-contain` handles the on-screen fit

### Presets and Randomize

The six Presets in `src/glitch/presets.ts` are the app's primary surface — `PresetPicker` sits above
the advanced Disclosure, and `DEFAULT_PRESET` is applied on open. A Preset is a whole Chain rather
than a diff from a default: a curator can read one entire look in one place, and re-curate it
without moving the other five. Each carries **only the Links its look uses** — off is a Link's
absence (ADR 0017), so VHS has no Pixel Sort and CORRUPTED no Scanlines.

Three behaviours hang together, and all of them come from the Seed sitting *outside* the Chain:

- **Applying a Preset draws a fresh Seed.** The look is shared, the arrangement is yours.
- **`chainMatch()` is a total, order-sensitive comparison** — same length, same type and params at
  each position, with no "except the seed" exclusion for a later reader to innocently tidy away. It
  ignores each Link's `id`, which is plumbing rather than look: comparing it would mark every Preset
  modified the instant it was applied. So a Re-roll keeps the active Preset highlighted while a
  slider edit, a reorder, an add, a remove or a duplicate marks it `(modified)` — the picker tracks
  `activePresetId` rather than deriving it, because a look alone can't say which Preset it was
  edited away from.
- **Randomize is preset + jitter** (`randomizeChain`): pick a Preset, perturb its numbers within
  spreads curated well inside the sliders' ranges. Starting from a known-good point is what
  guarantees "always pretty". **The Chain's structure rides through untouched** — which Links, how
  many, in what order — because bad structure sinks a look faster than a bad number; structural
  variety is curated as more Presets, never assembled at random. A Preset's non-numeric choices ride
  through for the same reason. Its randomness is injected, so a test pins both the base and the
  perturbation; the app passes `Math.random` and draws the Seed itself. Randomize clears the active
  Preset rather than marking its base modified: a jittered look is one the user discovered, not an
  edit they made.

### Live Source

`useWebcamState` owns the `MediaStream` lifecycle and hands `App` a playing `HTMLVideoElement`; it
is never rendered, only sampled into the hidden canvas (ADR 0001). It's a hand-copy of
ASCII//Convert's hook (ADR 0011) with two deliberate divergences, both noted in the file: modes
carry this app's terms (`'image'` / `'live'`), and the lifecycle side-effects are **Commands** rather
than Effects — `Effect` already means a pure `PixelBuffer` transform here, and the collision would
be a trap.

The lifecycle is copied whole, so `switchCamera` / `facingMode` ride along with no control surfacing
them: #82 scoped in the Live Source, not camera choice. Front camera only until an issue asks
otherwise.

`onFacingModeChange` is wired, so the front camera opens mirrored (ADR 0016). Mirror is shared with
ASCII//Convert in mechanism as well as feature: both flip the Source on the sampling `drawImage`,
ahead of the pure core. A CSS-only mirror was never an option here, where the canvas *is* the
output, and ASCII dropped its own (#124) so its PNG and TXT stop disagreeing with the preview.

The Seed is held across frames rather than re-rolled per frame — that's what keeps the corruption
pattern still instead of boiling. Animating it is explicitly v2 (`CONTEXT.md`).

**Capture** is PNG Export on a different Source: it reads the pixels the loop last painted and never
touches the loop, so the feed keeps running.

### Recording

`useRecording` wraps `canvas.captureStream(15)` + `MediaRecorder` with runtime format detection
(vp9 → vp8 → webm → mp4). It is a hand-copy of ASCII//Convert's hook (ADR 0011) with one divergence,
noted in the file: failures go to an `onError` callback instead of being swallowed. ADR 0006 wants
every operational failure surfaced, and Recording is one of this app's four output paths
(`CONTEXT.md`) — the ASCII original returns silently on all three start failures. `app.tsx` hands
it the toast.

A Recording is the one output this app timestamps (`glitch-recording-<ms>.webm`), where PNG Export
and Capture keep stable names. The asymmetry is deliberate: a Capture is one click to redo, but a
take is minutes of someone's performance, and a second one must not collide and leave the browser
to disambiguate with " (1)".

Like Capture, it records the **output canvas** the Pipeline already painted — it is *not* datamosh
(`CONTEXT.md`), and it never touches the rAF loop. The capture rate matches that loop's ~15fps
(ADR 0002); a higher rate would only duplicate frames.

The Record control is hidden entirely where `MediaRecorder` + `captureStream` are unsupported — no
GIF fallback (ADR 0007) — and only ever appears for a Live Source: a Source Image has no elapsing
time to record. On stop, `shareOrDownloadBlob` opens the native share sheet on mobile or downloads
on desktop. Clearing the Source stops a running Recording first, since the camera is about to go.

### Sampling cap

`sampleDimensions()` scales the Source to fit inside 800×800 (aspect-preserving) before any pixel
work, so a large image can't freeze the tab. The downscale itself rides on the hidden canvas'
`drawImage` — read and resize in one operation (ADR 0001).

Note this caps **both** axes, where ASCII//Convert's `resizeImage()` caps width alone. That's not
gratuitous divergence: ASCII resamples down to a `cols × rows` char grid, which bounds the work
whatever the Source's height. Here the sampled buffer *is* what `applyPipeline` walks, so a
500×20000 Source would sail through a width-only cap and freeze the tab.

### Error handling

Operational errors (Export, Copy, Recording) use the `AppError` plain-object shape
(`type`, `message`, `cause?`),
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
| **Randomize** | Discovering a look by picking a Preset and jittering its params | shuffle |
| **Source Image** | Static uploaded image; immutable during session | uploadedImage, input image |
| **Live Source** | The webcam feed, sampled on the rAF loop | video, camera, stream |
| **Export** | Taking the result out (PNG) | download, save |
| **Capture** | One frame of a Live Source taken out as PNG | screenshot, snapshot |
| **Copy** | The result written to the clipboard as a PNG | copy to clipboard, paste |
| **Recording** | The glitched Live Source taken out as a video, via MediaRecorder | video export, screen record |

Every term now has code behind it. The Seed landed with Block
Displacement: `createSeed()` is the single place the app draws real randomness, and everything
downstream derives from the Seed it returns. Block Displacement pulls its blocks off the Seed's rng
stream; Noise's grain comes from a positional hash the Seed feeds, so it re-rolls with the
arrangement while staying a function of where a pixel sits rather than of how many draws ran before
it.

### Design system

Copied by hand from ASCII//Convert (ADR 0011 — there is deliberately no shared `packages/`).
Tokens live as CSS custom properties in `src/index.css`; `tailwind.config.js` points at those
same variables, so `text-violet` and `var(--violet)` resolve to one value. Keep the copies in
step with `apps/ascii` by hand; the duplication is the signal that tells us what to extract later.

**Anything sitting on the canvas must bring its own background** — ADR 0013, and a standing
constraint on any overlay added later, not just the ones there now (`CANVAS_OVERLAY_CHROME` in
`glitch-canvas.tsx`: the LIVE / REC badges and the clear control). ADR 0009's ratios are all
token-on-token, and this is the one surface in the app where the backdrop isn't a token at all: it's
the user's artwork, and the Pipeline can paint any color under a chip. Translucency can't fix that —
no alpha survives an arbitrary backdrop — so the chips stand on an opaque `bg-bg` and hold the
audited ratio. `src/contrast.test.ts` pins the pairs.

This is a real divergence from ASCII//Convert, whose identical-looking badges need no such thing:
`paintFrame()` fills that canvas with `#0a0a0f` (`--void`) before drawing, so its overlays already
sit on the audited pair. Here the canvas *is* the output (no fill, no letterbox to hide in), which
is the same property that makes Capture and Recording a plain read of the visible pixels.

### Comment convention

See the root `CLAUDE.md` — the convention is deck-wide.

## Key files

**Glitch core**
- `src/glitch/types.ts` — `PixelBuffer`, `GlitchSettings`, `Seed`, `ChannelName`,
  `ChannelShiftParams`, `SortDirection`, `PixelSortParams`, `DEFAULT_PIXEL_SORT`, `ScanlinesParams`,
  `DEFAULT_SCANLINES`, `SPARSEST_SCANLINE_PERIOD`, `TIGHTEST_SCANLINE_PERIOD`,
  `SCANLINES_DENSITY_STEP`, `NoiseParams`, `NoiseTint`, `DEFAULT_NOISE`, `MAX_NOISE_DELTA`,
  `BlockDisplacementParams`, `DEFAULT_BLOCK_DISPLACEMENT`, `MAX_DISPLACEMENT_BLOCKS`,
  `MAX_BLOCK_SHIFT_RATIO`, `MAX_BLOCK_HEIGHT_RATIO`, `MIN_BLOCK_WIDTH_RATIO`,
  `ChromaticAberrationParams`, `DEFAULT_CHROMATIC_ABERRATION`,
  `MAX_CHROMATIC_ABERRATION_MAGNIFICATION`,
  `DEFAULT_CHANNEL_SHIFT`,
  `CHANNEL_SHIFT_AMOUNT_RANGE`, `PIXEL_SORT_RUN_LENGTH_RANGE` (the two params with no natural 0..1
  bound — in the core so the sliders and Randomize's clamp share one source of truth)
- `src/glitch/presets.ts` — `PRESETS` (the six curated Chains), `DEFAULT_PRESET` (applied on open),
  `Preset`, `chainMatch()` (total and order-sensitive), `randomizeChain()` (preset + jitter,
  injected randomness, structure rides through), `EFFECT_ORDER` (the palette's order)
- `src/glitch/pipeline.ts` — the six Effects: `blockDisplacement()`, `pixelSort()`,
  `channelShift()`, `chromaticAberration()`, `scanlines()`, `noise()` — see ADR 0005
- `src/glitch/chain.ts` — the composable Effect Chain (ADR 0017): `Chain`, `Link`, `EffectType`,
  `EffectParams`, `EFFECT_REGISTRY` (type → pure fn + `DEFAULT_*`), `applyChain()` (the fold),
  `createLink()`, and the pure editing helpers `addLink()` / `removeLink()` / `duplicateLink()` /
  `moveLink()` plus `MAX_CHAIN_LENGTH`. Depends on `pipeline.ts` one-way: the Effects don't know
  the Chain exists
- `src/glitch/rng.ts` — `createRng()` (pure, Seed → draw stream), `deriveSeed()` (the per-Link occurrence
  sub-seed — ADR 0017), `createSeed()` (impure — the app's only real randomness), `Rng`
- `src/glitch/image-utils.ts` — `sampleDimensions()` (800×800 cap), `sourceDimensions()`,
  `GlitchSource` (image | video — the shell's vocabulary, kept out of the DOM-free `types.ts`)
- `src/glitch/render-frame.ts` — `renderGlitchFrame()`: the imperative shell

**Errors & utilities**
- `src/errors/app-error.ts` — `AppError`, `createError`, `normalizeError`, `Errors`
- `src/export/output.ts` — `outputFilename()`, `mimeToExtension()`
- `src/hooks/use-recording.ts` — `useRecording()`, `isRecordingSupported()`, `detectMimeType()`,
  `formatElapsedTime()`: the Recording's MediaRecorder lifecycle — see ADR 0007 and ADR 0006
- `src/hooks/use-toast.ts` — toast queue state
- `src/hooks/use-webcam-state.ts` — `useWebcamState()`, `planCommands()`, `reducer()`: the Live
  Source's MediaStream lifecycle
- `src/utils/cn.ts` — `cn()` (clsx + tailwind-merge)
- `src/utils/copy.ts` — `copyCanvasToClipboard()` (canvas → PNG on the clipboard)
- `src/utils/load-image-file.ts` — `loadImageFile()` (File → HTMLImageElement)
- `src/utils/share.ts` — `shareOrDownloadCanvas()`, `shareOrDownloadBlob()` (Web Share API with
  download fallback)

**Components**
- `src/components/glitch-canvas.tsx` — lifecycle coordinator: drives the render, and owns the
  ~15fps rAF loop for a Live Source. Carries the LIVE / REC badges
- `src/components/preset-picker.tsx` — the front door: the six Preset chips (active one highlighted,
  `(modified)` once edited) and Randomize
- `src/components/control-panel.tsx` — the Chain editor: one section per Link in Chain order, each
  with a grab handle (drag, or arrow keys when focused), duplicate and remove; plus the
  registry-driven add palette and the Re-roll control (its own callback — the Seed is not part of
  the look). Sits behind the `advanced` Disclosure in `app.tsx` (#84) — the tweak layer, not the
  front door
- `src/components/empty-state-hero.tsx` — initial empty state with the upload and webcam entry points
- `src/components/export-bar.tsx` — PNG Export / Capture / Copy / Record controls and the
  recording timer
- `src/components/toast-provider.tsx` — renders the toast queue
- `src/components/error-boundary.tsx` — generic React error boundary
- `src/components/ui/` — design system primitives: `button`, `chip`, `disclosure`, `label`, `slider`,
  `toast`, `toggle-group`, `source-image-drop-zone`

**Testing**
- `src/test-setup.ts` polyfills `ImageData` — happy-dom ships none, and the shell constructs one.

**ADRs**
- `../../docs/adr/` — all architectural decisions (deck-wide, at the repo root)
