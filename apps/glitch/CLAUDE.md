# CLAUDE.md — GLITCH//Studio

Guidance for Claude Code (claude.ai/code) when working in `apps/glitch`.

This app is one program on the CYBERDECK deck — see the root `CLAUDE.md` for the monorepo
layout, the deck-wide comment convention, and the release ritual. Paths below are relative to
`apps/glitch`.

## Status

Tracer bullet (#77) plus Pixel Sort (#78), Scanlines (#79), Noise (#80), Block Displacement with
Seed / Re-roll (#81), Live Source + Capture (#82), Copy (#83), the advanced panel (#84), Recording
(#85) and Presets + Randomize (#86), plus Chromatic Aberration (#116) and the composable Effect
Chain (ADR 0017, #125–#128), plus Halftone (#309), Wave (#310) and the Chain as a file (#312). All
eight Effects are live — Source Image *or* Live Source → the Chain → PNG Export / Capture / Copy /
Recording — the pure-core / imperative-shell seam is established, and the render is deterministic in
Chain + Seed. The front
door is the ten curated Presets plus Randomize; behind the EDIT tab the Chain is fully editable —
reorder, add, remove, duplicate, the same Effect more than once. A Chain built by hand exports as JSON and
comes back (**Chain JSON**, `CONTEXT.md`), which is the only way structural variety reaches the app
from outside the roster. The v1 scope in `CONTEXT.md` is complete.

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

### Glitch chain

1. `EmptyStateHero` offers the two entry points: `SourceImageDropZone` hands an `HTMLImageElement`
   (Source Image) to `App`, or **use webcam** switches `useWebcamState` to the Live Source
2. The **Editor** (`useEditorState` over the pure reducer in `src/glitch/editor-state.ts`) holds
   the `Chain` and, **beside** it, the `Seed` — two separate pieces of state, which is what lets
   Re-roll draw a new Seed and leave the look alone. `App` is a caller of the Editor's named
   transitions, not the owner of their rules; Chain and Seed go to `GlitchCanvas` with whichever
   Source is active
3. `GlitchCanvas` decides *when* to render: a Source Image once per Source, Chain or Seed
   change via `useEffect`; a Live Source on a `requestAnimationFrame` loop throttled to ~15fps
   (ADR 0002) instead. It keeps the **hidden off-screen sampling canvas** (`hiddenRef`) that the
   shell draws into — kept separate from the visible canvas per ADR 0001
4. `renderGlitchFrame()` in `src/glitch/render-frame.ts` is the imperative shell: draws the
   Source onto the hidden canvas at the sampled size → `getImageData` → unwraps to a
   `PixelBuffer` → `applyChain()` → wraps back into `ImageData` → `putImageData` onto the
   visible canvas. Returns `false` (skips) if there's no 2D context or the Source has no
   intrinsic size yet. A `GlitchSource` is an image *or* a video — one webcam frame is just
   another Source to sample, so both paths share this one shell
5. `applyChain()` is **pure** — `PixelBuffer` + `Chain` + `Seed` in, `PixelBuffer` out,
   no DOM (ADR 0005). It is the only place Effects run, and it holds no randomness of its own: every
   draw comes off the Seed's stream (`createRng`) or a Seed-fed positional hash, with a repeated
   Link drawing from an occurrence-keyed sub-seed (`deriveSeed` — ADR 0017)
6. The visible canvas is sized to the **sampled** dimensions, so the canvas *is* the output —
   PNG Export takes it as-is and CSS `object-contain` handles the on-screen fit

### Presets and Randomize

The ten Presets in `src/glitch/presets.ts` are the app's primary surface — `PresetPicker` fills the
Control Strip's PRESETS tab (ADR 0020), and `DEFAULT_PRESET` is applied on open. A Preset is a whole
Chain rather than a diff from a default: a curator can read one entire look in one place, and
re-curate it without moving the others. Each carries **only the Links its look uses** — off is a
Link's absence (ADR 0017), so VHS has no Pixel Sort, CORRUPTED no Scanlines and PHOSPHOR nothing
structural at all.

The list is ordered **gentlest first** and reads as a dial from "still clearly the photo" to "barely
survived", so a newly curated look is *inserted* at the loudness it lands on rather than appended.
Nothing may index `PRESETS` by position for that reason — the tests select by id (#320).

**Curating is the app's only structural lever.** Randomize rides a base's structure through
untouched, so a Preset is the one thing that can put a new Effect in a casual creator's hands:
Halftone and Wave shipped registered, runnable and unreachable from the front door, and #320 curated
PHOSPHOR, DEGAUSS, BILLBOARD and CROSSTALK to close that. A Preset test pins that every registered
Effect has at least one curated look to be met in.

Three behaviours hang together, and all of them come from the Seed sitting *outside* the Chain:

- **Applying a Preset draws a fresh Seed.** The look is shared, the arrangement is yours.
- **`chainMatch()` is a total, order-sensitive comparison** — same length, same type and params at
  each position, with no "except the seed" exclusion for a later reader to innocently tidy away. It
  ignores each Link's `id`, which is plumbing rather than look: comparing it would mark every Preset
  modified the instant it was applied. So a Re-roll keeps the active Preset highlighted while a
  slider edit, a reorder, an add, a remove or a duplicate marks it `(modified)` — the Editor tracks
  `activePresetId` rather than deriving it, because a look alone can't say which Preset it was
  edited away from, and `isPresetModified()` (editor-state.ts) is the one place `(modified)` is
  derived; the picker only renders the answer.
- **A brought Chain is nobody's Preset.** Importing a Chain JSON clears `activePresetId` the same
  way Randomize does, and draws a fresh Seed the same way applying a Preset does — the file is a
  look, and a look never carries an arrangement or a provenance.
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
ASCII//Convert's hook (ADR 0011, deliberately left copied in ADR 0014) with two divergences, both noted in the file: modes
carry this app's terms (`'image'` / `'live'`), and the lifecycle side-effects are **Commands** rather
than Effects — `Effect` already means a pure `PixelBuffer` transform here, and the collision would
be a trap.

The lifecycle is copied whole, so `switchCamera` / `facingMode` ride along; `GlitchCanvas` surfaces
`switchCamera` as the front/rear switch control on touch devices, the same gate ASCII//Convert uses.
The front camera still opens by default.

`onFacingModeChange` is wired, so the front camera opens mirrored (ADR 0016). Mirror is shared with
ASCII//Convert in mechanism as well as feature: both flip the Source on the sampling `drawImage`,
ahead of the pure core. A CSS-only mirror was never an option here, where the canvas *is* the
output, and ASCII dropped its own (#124) so its PNG and TXT stop disagreeing with the preview.

The Seed is held across frames rather than re-rolled per frame — that's what keeps the corruption
pattern still instead of boiling. Animating it is explicitly v2 (`CONTEXT.md`).

**Capture** is PNG Export on a different Source: it reads the pixels the loop last painted and never
touches the loop, so the feed keeps running.

### Recording

`useRecording` (from `@cyberdeck/deck-kit/recording` — the Recording core crossed the seam in
ADR 0014) wraps `canvas.captureStream(15)` + `MediaRecorder` with runtime format detection
(vp9 → vp8 → webm → mp4). Failures go to an `onError` callback: ADR 0006 wants every operational
failure surfaced, and Recording is one of this app's four output paths (`CONTEXT.md`). `app.tsx`
hands it the toast.

A Recording is the one output this app timestamps (`glitch-recording-<ms>.webm`), where PNG Export
and Capture keep stable names. The asymmetry is deliberate: a Capture is one click to redo, but a
take is minutes of someone's performance, and a second one must not collide and leave the browser
to disambiguate with " (1)".

Like Capture, it records the **output canvas** the Chain already painted — it is *not* datamosh
(`CONTEXT.md`), and it never touches the rAF loop. The capture rate matches that loop's ~15fps
(ADR 0002); a higher rate would only duplicate frames.

The Record control is hidden entirely where `MediaRecorder` + `captureStream` are unsupported — no
GIF fallback (ADR 0007) — and only ever appears for a Live Source: a Source Image has no elapsing
time to record. **Start and stop live apart** (ADR 0020): start is a control in the OUT tab, stop is
the canvas REC badge. That split is what lets a take keep running while the user tweaks the Chain in
another tab, and it is why OUT drops the start control while `isRecording` — one running take must
not offer two stops. On stop, `shareOrDownloadBlob` opens the native share sheet on mobile or downloads
on desktop. Clearing the Source stops a running Recording first, since the camera is about to go.

### Sampling cap

`sampleDimensions()` scales the Source to fit inside 800×800 (aspect-preserving) before any pixel
work, so a large image can't freeze the tab. The downscale itself rides on the hidden canvas'
`drawImage` — read and resize in one operation (ADR 0001).

Note this caps **both** axes, where ASCII//Convert's `resizeImage()` caps width alone. That's not
gratuitous divergence: ASCII resamples down to a `cols × rows` char grid, which bounds the work
whatever the Source's height. Here the sampled buffer *is* what `applyChain` walks, so a
500×20000 Source would sail through a width-only cap and freeze the tab.

### Error handling

Operational errors (Export, Copy, Recording, Chain import) use the `AppError` plain-object shape
(`type`, `message`, `cause?`) from `@cyberdeck/deck-kit/errors`, surfaced via the kit's toast
system (`useToastError` / `useToastInfo`) — the operational-error *mechanism* crossed the seam in
ADR 0014; this app keeps only its own `Errors` factories (`src/errors/app-error.ts`). The
typed-error-class half of ADR 0006 has no counterpart here; this app has no AI surface.
Image-load failures surface through the kit's image loading `onError` callback straight to the
same toast. `chainImportFailed` is the one factory that takes an argument: what is wrong with a
Chain file is a property of the file, so the codec words the reason (`chain-codec.ts` never throws)
and the factory supplies the app's half of the sentence.

### Domain language (from CONTEXT.md)

Use these terms precisely — avoid the listed alternatives:

| Term | Meaning | Avoid |
|------|---------|-------|
| **PixelBuffer** | `{ data, width, height }` — the pure core's currency, DOM-free | ImageData, bitmap, frame |
| **Effect** | A named, isolated pure `PixelBuffer → PixelBuffer` transform | filter, layer |
| **Chain** | The ordered, editable list of Links — the look. Order matters; repeats allowed | stack, pipeline, options, config, filters |
| **Link** | One Effect instance in the Chain: `{ type, params }` plus a UI-only `id`. Presence in the Chain is on/off | enabled flag, step, row |
| **Seed** | Seeds the Chain's pseudo-randomness — the arrangement. Lives beside the Chain | random, rng |
| **Preset** | A named Chain — a curated look | filter, look |
| **Randomize** | Discovering a look by picking a Preset and jittering its params | shuffle |
| **Source Image** | Static uploaded image; immutable during session | uploadedImage, input image |
| **Live Source** | The webcam feed, sampled on the rAF loop | video, camera, stream |
| **Export** | Taking the result out (PNG) | download, save |
| **Capture** | One frame of a Live Source taken out as PNG | screenshot, snapshot |
| **Copy** | The result written to the clipboard as a PNG | copy to clipboard, paste |
| **Recording** | The glitched Live Source taken out as a video, via MediaRecorder | video export, screen record |
| **Chain JSON** | The Chain written as a file — the look out and back, the user's own Preset. No Seed, no `id` | preset file, save, project |

Every term now has code behind it. The Seed landed with Block
Displacement: `createSeed()` is the single place the app draws real randomness, and everything
downstream derives from the Seed it returns. Block Displacement pulls its blocks off the Seed's rng
stream; Noise's grain comes from a positional hash the Seed feeds, so it re-rolls with the
arrangement while staying a function of where a pixel sits rather than of how many draws ran before
it.

### Design system

The visual language lives in `@cyberdeck/deck-kit` (ADR 0014): `src/index.css` imports the kit's
`tokens.css`, and `tailwind.config.js` extends the kit's Tailwind preset, so `text-accent` and
`var(--accent)` resolve to one value shared with ASCII//Convert. The deck-kit glob in the Tailwind
`content` is load-bearing — without it the kit primitives' classes are purged at build (root
`CLAUDE.md`).

**Name the role, not the hue** — `text-accent`, not `text-violet`. The visual language is a set of
named Themes (ADR 0024), and only the semantic layer varies between them; a literal hue pins a
component to one Theme and breaks the rest in that one corner.

**Anything sitting on the canvas must bring its own background** — ADR 0013, and a standing
constraint on any overlay added later, not just the ones there now (`CANVAS_OVERLAY_CHROME` in
`glitch-canvas.tsx`: the LIVE / REC badges and the clear control). ADR 0009's ratios are all
token-on-token, and this is the one surface in the app where the backdrop isn't a token at all: it's
the user's artwork, and the Chain can paint any color under a chip. Translucency can't fix that —
no alpha survives an arbitrary backdrop — so the chips stand on an opaque `bg-bg` and hold the
audited ratio. The deck kit's Theme Contract guard pins the pairs — for every Theme, from the
real token values rather than a hand-copy (ADR 0024).

This is a real divergence from ASCII//Convert, whose identical-looking badges need no such thing:
`paintFrame()` fills that canvas with `#0a0a0f` (`--void`) before drawing, so its overlays already
sit on the audited pair. Here the canvas *is* the output (no fill, no letterbox to hide in), which
is the same property that makes Capture and Recording a plain read of the visible pixels.

### Comment convention

See the root `CLAUDE.md` — the convention is deck-wide.

## Key files

**Glitch core**
- `src/glitch/types.ts` — `PixelBuffer`, `Seed`, `CHANNEL_NAMES` / `ChannelName`,
  `ChannelShiftParams`, `SORT_DIRECTIONS` / `SortDirection`, `PixelSortParams`, `DEFAULT_PIXEL_SORT`, `ScanlinesParams`,
  `DEFAULT_SCANLINES`, `SPARSEST_SCANLINE_PERIOD`, `TIGHTEST_SCANLINE_PERIOD`,
  `SCANLINES_DENSITY_STEP`, `NoiseParams`, `NOISE_TINTS` / `NoiseTint`, `DEFAULT_NOISE`,
  `MAX_NOISE_DELTA`,
  `BlockDisplacementParams`, `DEFAULT_BLOCK_DISPLACEMENT`, `MAX_DISPLACEMENT_BLOCKS`,
  `MAX_BLOCK_SHIFT_RATIO`, `MAX_BLOCK_HEIGHT_RATIO`, `MIN_BLOCK_WIDTH_RATIO`,
  `ChromaticAberrationParams`, `DEFAULT_CHROMATIC_ABERRATION`,
  `MAX_CHROMATIC_ABERRATION_MAGNIFICATION`,
  `HalftoneParams`, `HALFTONE_TINTS` / `HalftoneTint`, `DEFAULT_HALFTONE`,
  `HALFTONE_MAX_DOT_RADIUS_RATIO`,
  `WaveParams`, `WAVE_AXES` / `WaveAxis`, `DEFAULT_WAVE`, `MAX_WAVE_AMPLITUDE_RATIO`,
  `DEFAULT_CHANNEL_SHIFT`,
  `CHANNEL_SHIFT_AMOUNT_RANGE`, `PIXEL_SORT_RUN_LENGTH_RANGE`, `HALFTONE_CELL_SIZE_RANGE`,
  `WAVE_WAVELENGTH_RANGE` (the
  params with no natural 0..1 bound — in the core so the sliders and Randomize's clamp share one
  source of truth). **Every choice param declares its tuple first and derives the union from it**
  (`export const NOISE_TINTS = [...] as const; export type NoiseTint = (typeof NOISE_TINTS)[number]`):
  a list written the other way round type-checks for validity but never for completeness, so a value
  added to a union would compile everywhere while going missing from the toggle that offers it and
  from the Chain JSON that has to read it back
- `src/glitch/presets.ts` — `PRESETS` (the curated Chains), `DEFAULT_PRESET` (applied on open),
  `Preset`, `chainMatch()` (total and order-sensitive), `randomizeChain()` (preset + jitter,
  injected randomness, structure rides through), `EFFECT_ORDER` (the palette's order)
- `src/glitch/pipeline.ts` — the eight Effects: `blockDisplacement()`, `pixelSort()`, `wave()`,
  `channelShift()`, `chromaticAberration()`, `halftone()`, `scanlines()`, `noise()` — see ADR 0005.
  Halftone is the one that is neither structural nor surface: it re-quantizes, which is why the
  canonical order sits it on the seam between the two (`CONTEXT.md`). Wave is the first of the
  structural group's *whole-image* Effects — the only one that moves the picture as a whole, along a
  continuous function — sitting after the discrete ones and ahead of the per-channel ones, and it is
  the second caller of the shared `sampleBilinear` resampler
- `src/glitch/chain.ts` — the composable Effect Chain (ADR 0017): `Chain`, `Link`, `EffectType`,
  `EffectParams`, `EFFECT_REGISTRY` (type → pure fn + `DEFAULT_*`), `applyChain()` (the fold),
  `createLink()`, and the pure editing helpers `addLink()` / `removeLink()` / `duplicateLink()` /
  `moveLink()` plus `MAX_CHAIN_LENGTH`. Depends on `pipeline.ts` one-way: the Effects don't know
  the Chain exists
- `src/glitch/chain-codec.ts` — the Chain as a file (**Chain JSON**, `CONTEXT.md`): `encodeChain()`,
  `decodeChain()`, `CHAIN_FILE_FORMAT`, `CHAIN_FILE_VERSION`, `ChainDecodeResult`. Pure both ways and
  never throws — a bad file comes back as a reason the shell words for a toast. `PARAM_DECODERS` is a
  map over `EffectType`, the same shape as `EFFECT_REGISTRY`, so a newly registered Effect fails to
  compile here rather than falling silently out of the format. The choice params are covered one
  layer down by the tuples in `types.ts` — the codec enumerates the same tuple the toggle does, so
  a value added to a choice can't be offered by the control and refused by the format. Out-of-range params are **rejected,
  never clamped**
- `src/glitch/rng.ts` — `createRng()` (pure, Seed → draw stream), `deriveSeed()` (the per-Link occurrence
  sub-seed — ADR 0017), `createSeed()` (impure — the app's only real randomness), `Rng`
- `src/glitch/editor-state.ts` — the Editor (CONTEXT.md): `EditorState` (Chain + Seed +
  `activePresetId`), `EditorAction`, `editorReducer()` (the whole transition table — pure, all
  randomness arrives in the payload), `isPresetModified()` (the one place `(modified)` is derived),
  `initialEditorState()`, `ChainActions` (the five Chain edits as one callback bundle — Editor
  vocabulary, so the panels import it from here)
- `src/glitch/image-utils.ts` — `sampleDimensions()` (800×800 cap), `sourceDimensions()`,
  `GlitchSource` (image | video — the shell's vocabulary, kept out of the DOM-free `types.ts`)
- `src/glitch/render-frame.ts` — `renderGlitchFrame()`: the imperative shell

**Errors & utilities**
- `src/errors/app-error.ts` — `Errors`: this app's error factories over the kit's `AppError` /
  `createError` (`@cyberdeck/deck-kit/errors`)
- `src/export/output.ts` — `outputFilename()`, `OutputKind`
- `src/hooks/use-editor-state.ts` — `useEditorState()`: the Editor's thin React half — wraps
  `useReducer`, draws the randomness at dispatch time, exposes the named transitions plus the
  `ChainActions` bundle
- `src/hooks/use-webcam-state.ts` — `useWebcamState()`, `planCommands()`, `reducer()`: the Live
  Source's MediaStream lifecycle — deliberately still a hand-copy (ADR 0014)
- `src/utils/copy.ts` — `copyCanvasToClipboard()`, `isClipboardImageSupported()` (canvas → PNG on
  the clipboard)
- Everything else shared comes from `@cyberdeck/deck-kit` (ADR 0014): `recording` (`useRecording`,
  `formatElapsedTime`), `ui` (the primitives plus `EmptyStateHero`, `ErrorBoundary`,
  the toast hooks), `utils` (`cn`, `shareOrDownloadCanvas`,
  `shareOrDownloadBlob`, `isTouchDevice`), `errors`

**Components**
- `src/components/glitch-canvas.tsx` — lifecycle coordinator: drives the render, and owns the
  ~15fps rAF loop for a Live Source. Carries the LIVE badge and the REC badge, which is also the
  Recording's stop control and its elapsed timer — the canvas is the one surface every tab shows,
  so that is where a stop reachable from anywhere has to live (ADR 0020)
- `src/components/control-strip.tsx` — the Control Strip (ADR 0020): the bottom-anchored control
  surface at both breakpoints and the program's whole control grammar — there is no aside, no sheet
  and no always-visible export bar behind it. PRESETS → EDIT → OUT is the session read left to
  right. The shell is the kit's `TabStrip` (ADR 0020's extraction slice); this file is the wiring
  that says which panel each tab carries. Only the active panel is mounted, so one tab's controls
  are in the accessibility tree at a time
- `src/components/preset-picker.tsx` — the PRESETS panel: the Preset chips in a horizontally
  scrollable row (active one highlighted, `(modified)` once edited), with Randomize and import chain
  beside them — import lives here because a brought look is applied exactly as a curated one is
- `src/components/chain-editor.tsx` — the Strip's EDIT tab: the Chain as a row of Link chips
  left→right in processing order, each chip both the selection control and the drag handle (drag, or
  left/right arrows when focused). The focused Link's params fill the panel above the row —
  stacked on mobile, one grid row of equal columns at `sm` (adaptive density, ADR 0020) — with
  duplicate and remove as actions on that panel. The registry-driven add palette shares the panel
  slot with the params, and Re-roll sits outside the row (its own callback — the Seed is not part of
  the look)

- `src/components/import-chain-button.tsx` — the PRESETS panel's import control: the impure half of
  importing (reading the file, wording the refusal). What a Chain file *is* stays in `chain-codec.ts`
- `src/components/icon-label-button.tsx` — the Strip control that drops to its glyph alone below
  `sm` and takes its label back from `sm` up, naming itself by the label at both sizes. Randomize,
  Re-roll, import chain and export chain are its callers; it stayed in the app rather than crossing into the kit, since
  the collapse breakpoint is this Strip's width problem
- `src/components/output-panel.tsx` — the Strip's OUT tab: PNG Export / Capture / Copy, the Chain
  export (the one output here that is the look rather than the picture) and the Record *start*. Stopping is deliberately absent — a take runs while the user keeps working in
  PRESETS and EDIT, so its stop is the canvas REC badge (ADR 0020)

**Testing**
- `src/test-setup.ts` polyfills `ImageData` — happy-dom ships none, and the shell constructs one.

**ADRs**
- `../../docs/adr/` — all architectural decisions (deck-wide, at the repo root)
