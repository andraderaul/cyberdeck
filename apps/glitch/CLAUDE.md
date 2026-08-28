# CLAUDE.md — GLITCH//Studio

Guidance for Claude Code (claude.ai/code) when working in `apps/glitch`.

This app is one program on the CYBERDECK deck — see the root `CLAUDE.md` for the monorepo
layout, the deck-wide comment convention, and the release ritual. Paths below are relative to
`apps/glitch`.

## Status

Tracer bullet (#77) plus Pixel Sort (#78), Scanlines (#79), Noise (#80), Block Displacement with
Seed / Re-roll (#81), Live Source + Capture (#82), Copy (#83), the advanced panel (#84), Recording
(#85) and Presets + Randomize (#86), plus Chromatic Aberration (#116) and the composable Effect
Chain (ADR 0017, #125–#128), plus Halftone (#309), Wave (#310), the Chain as a file (#312),
the animated Seed (#311), the per-Link bypass (#371) and the **Wipe** (#372). All eight Effects are
live — Source Image *or* Live Source → the Chain → PNG Export / Capture / Copy / Recording — the
pure-core / imperative-shell seam is established, and the render is deterministic in Chain + Seed,
which is what lets a Live Source animate by advancing the Seed alone. The front door is the curated
Presets plus Randomize; behind the EDIT tab the Chain is fully editable — reorder, add, remove,
duplicate, bypass, the same Effect more than once. A Chain built by hand exports as JSON and comes
back (**Chain JSON**, `CONTEXT.md`), which is the only way structural variety reaches the app from
outside the roster. The v1 scope in `CONTEXT.md` is complete.

Since #316 the Chain runs on a **Worker thread** — ADR 0002's upgrade path, taken here first on the
deck. Nothing about the look changed; what changed is which thread computes it.

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
   `PixelBuffer` → hands it to the **ChainRunner** → wraps what comes back into `ImageData` →
   `putImageData` onto the visible canvas. It is `async`, because the Chain runs on a Worker
   (below), and reports `'painted'`, `'dropped'` or `'skipped'` — `skipped` for no 2D context or a
   Source with no intrinsic size yet, `dropped` for the runner's backpressure rule. A
   `GlitchSource` is an image *or* a video — one webcam frame is just another Source to sample, so
   both paths share this one shell
5. `applyChain()` is **pure** — `PixelBuffer` + `Chain` + `Seed` in, `PixelBuffer` out,
   no DOM (ADR 0005). It is the only place Effects run, and it holds no randomness of its own: every
   draw comes off the Seed's stream (`createRng`) or a Seed-fed positional hash, with a repeated
   Link drawing from an occurrence-keyed sub-seed (`deriveSeed` — ADR 0017)
6. The visible canvas is sized to the **sampled** dimensions, so the canvas *is* the output —
   PNG Export takes it as-is and CSS `object-contain` handles the on-screen fit

### The Chain runs on a Worker

ADR 0002 chose the main thread and recorded the Web Worker as the upgrade path. **This program took
it (#316)** — and it went first on the deck for one reason: its whole per-frame core is a single pure
function over a currency that was already DOM-free, so the hard half of a Worker port was done before
the port started.

`ChainRunner` (`src/glitch/chain-runner.ts`) is the seam. The shell asks it for a frame and paints
whatever comes back; which thread that was is the runner's business alone.

- **Only the fold crosses.** The sampling draw and the `putImageData` stay on the main thread.
  `transferControlToOffscreen()` was rejected and the reason is concrete: it is permanent, and
  afterwards `getContext('2d')`, `toBlob` and `toDataURL` throw on the placeholder — which is all
  four of this app's output paths (PNG Export, Capture, Copy, Recording), every one of them a plain
  read of the visible canvas.
- **Transfer, not copy, both ways.** The sampled buffer is up to 800×800×4; cloning it on each leg
  of every frame would hand back much of what moving the Chain off-thread bought. The buffer is
  detached the moment it is posted — nothing may read it afterwards.
- **Drop frames, never queue them.** At most one frame in flight and one waiting; a newer frame
  replaces the waiting one and the frame it replaced resolves `null`. The single waiting slot is
  what keeps the rule safe for a Source Image, which has no next frame to correct a drop with: the
  newest edit always survives, so the canvas shows the Chain the Editor holds. The shell keeps
  sampling on every throttled tick even while the Worker is busy — a fresh sample *replaces* the
  waiting one, so what runs next is the newest frame rather than the one that arrived first.
- **The Source Image re-ask is for a dead Worker, not for backpressure.** `GlitchCanvas` asks once
  more when a Source Image render comes back `dropped`, and the reachable case is exactly one: a
  Worker that died holding the frame's pixels, which were transferred and left with it. Backpressure
  never reaches that branch — the only thing that drops the newest Source Image render is a newer
  one, whose effect has already cancelled it. One re-ask cannot spin, because by then the runner is
  the synchronous core.
- **A synchronous fallback, always.** No `Worker` global, a `new Worker` that throws on a
  Content-Security-Policy, or a Worker that dies mid-session — all three land on the same
  `applyChain`, on this thread. There is no state in which the program cannot paint.

The Worker entry (`chain-worker.ts`) is three lines on purpose: everything it could get wrong lives
in `runChainJob` (`chain-job.ts`), which is pure and has its own tests — including **the return
leg's transfer list**, which travels back with the result precisely so the one file no test reaches
is not the file that has to get it right. **Tests do not go through the Worker**: the Effects and
`applyChain` are unit-tested exactly as they were, and `chain-runner.test.ts` drives a Worker double
so the drop rule and both transfers are assertions rather than claims.

**One behaviour changed that no test covers, deliberately.** The paint is asynchronous now, so PNG
Export, Capture and Copy — all reads of the visible canvas — can read the frame *before* an edit if
they are fired inside the Worker's round trip of it. What comes out is a valid render of a Chain the
user held a moment earlier, never a torn one, and the next Export is correct. Left unhandled on
purpose; ADR 0002 records the reason and the shape of the fix if it is ever reported.

The cost is a second copy of the pipeline in the build: a Worker is its own module graph, so Vite
emits a chunk for it (~2.45 kB gzipped) while the entry chunk still carries the pipeline for the
fallback. That chunk is GLITCH's whole `lazy` bundle-budget row, and it *is* precached (ADR 0027) —
the running program fetches it.

### Presets and Randomize

The curated Presets in `src/glitch/presets.ts` are the app's primary surface — `PresetPicker` fills the
Control Strip's PRESETS tab (ADR 0020), and `DEFAULT_PRESET` is applied on open. A Preset is a whole
Chain rather than a diff from a default: a curator can read one entire look in one place, and
re-curate it without moving the others. Each carries **only the Links its look uses** — off is a
Link's absence (ADR 0017), so VHS has no Pixel Sort, CORRUPTED no Scanlines and PHOSPHOR nothing
structural at all.

The list is ordered **gentlest first** and reads as a dial from "still clearly the photo" to "barely
survived", so a newly curated look is *inserted* at the loudness it lands on rather than appended.
Nothing may index `PRESETS` by position for that reason: `DEFAULT_PRESET` and every test name an id
through `presetById()`, which throws on a miss rather than handing back an undefined look (#320).

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
  slider edit, a reorder, an add, a remove, a duplicate or a bypass marks it `(modified)` — the
  Editor tracks `activePresetId` rather than deriving it, because a look alone can't say which
  Preset it was edited away from, and `isPresetModified()` (editor-state.ts) is the one place
  `(modified)` is derived; the picker only renders the answer.
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

**Bypass is part of the look, so it moves with the look and only with the look** (#371, ADR 0017).
A bypassed Link stays in the Chain with its params, its position and its slot against
`MAX_CHAIN_LENGTH` — it is silenced, not absent, and the `N of 10 effects` region still counts it.
Re-roll and the animated Seed move the arrangement, so a silenced Link rides through both; a Preset
or a Randomize replaces the look outright and every Link that arrives is audible, because bypass
decides whether a Link contributes and Randomize never invents structure. Two rules are easy to
"tidy" wrongly: `applyChain` **skips a bypassed Link but still counts its occurrence**, so
bypassing one Link cannot re-draw a later Link of the same type (removing renumbers — that
difference is the point); and the Chain file **did not bump `CHAIN_FILE_VERSION`**, which stays 1
because `decodeLink` ignores unknown keys and a bump would refuse every Chain already exported.

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

The Seed is held across frames by default — that's what keeps the corruption pattern still instead
of boiling. **Animate** makes the boiling a choice: with it on, the loop draws a new Seed once a
frame has actually been painted, so the arrangement advances per *painted* frame rather than per
rAF tick. It is Re-roll at 15fps, and it is cheap for exactly the reason Re-roll is — the Seed
already sat beside the Chain (ADR 0017), so nothing about the look, the provenance or `chainMatch`
is involved.

Two details are load-bearing. The **throttle's clock lives in a ref** (`lastFrameTime`), not in
the effect: an advancing Seed rebuilds the loop on every painted frame, and a `lastTime` scoped to
the effect would be reset with it — leaving the throttle permanently satisfied and the Chain
running on every rAF tick. (The deeper fix is to hold `chain` and `seed` in refs so the loop stops
listing them as deps and is built once per Source; not taken, because it makes the effect's deps
lie about what it reads to buy back a teardown that costs nothing beside the Chain itself.) And
**ADVANCE_SEED is refused while the animation is off** (editor-state.ts): the
loop and React's render are on different clocks, so a frame in flight when the user switches off
must not move the arrangement afterwards. Switching off keeps the Seed the last frame drew, which
is a whole arrangement like any other — the picture settles on what is already on screen rather
than jumping or freezing mid-frame.

The control is in EDIT beside Re-roll, and **only for a Live Source** — a Source Image has no
elapsing time for the arrangement to advance through, the same gate Record uses. Only Block
Displacement and Noise consume the Seed, so a look animates in exactly those two: all ten Presets
carry Noise, so every one of them at least shimmers, and the eight carrying Block Displacement move
their tears as well. DEGAUSS and PHOSPHOR are the two without it — their geometry stands still
under a boiling grain.

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

### The Wipe

The Source on one side of a draggable divider, the Chain's result on the other, over the canvas at
its full size (**Wipe**, `CONTEXT.md`). Two side-by-side panes were the other shape and the issue
refused it: it charges half the viewport to the artwork it exists to show. This costs one line of
chrome and moves no layout.

**The divider is chrome, and by construction rather than by suppression.** All four output paths
read the visible canvas — PNG Export and Copy through `toDataURL`/`toBlob`, Capture the same, and
Recording through `captureStream` — so the rule is enforced by never writing to it: the Source half
is blitted onto a **second canvas** stacked over the visible one, and the line and handle are
elements. There is no code path that could put the comparison into a take, which is the difference
between this and drawing the divider into the canvas and hiding it for each of the four.

`renderGlitchFrame` takes an optional `compare` canvas and blits the **sampling canvas** onto it
(`render-frame.ts`). That is the Source at exactly the point `applyChain` receives it — mirror
included (ADR 0016), so nothing has to be kept in step with the flip — and it is one draw of a
bitmap that was already there rather than a second pass over the Chain. A Live Source therefore
wipes at the same ~15fps the Chain runs at, with one Chain per frame. While the Wipe is off,
`compare` is `null` and the loop pays a null check.

It divides the **fit region**, not the canvas element (ADR 0010): the canvas is `object-contain`,
so the picture is centred and the letterbox bands are void the wipe has no business crossing. The
Source canvas is `object-contain` too and so lands on the picture without being told where it is;
what the measured region buys is the divider — the fraction a pointer reads, the clip's edge, and a
line that spans the picture rather than the element (`wipe.ts`, pure and DOM-free).

Off by default, and it does not survive a Source change — a Wipe is a way of looking at *this*
Source. App's flow already unmounts the canvas between Sources, and `GlitchCanvas` resets on the
Source anyway so the rule belongs to the canvas rather than to that branch.

The chip says **compare**, not "wipe": it sits beside `clear source`, and in that company "wipe"
reads as erase. The mechanism keeps its name in `CONTEXT.md`; the word the user presses says what
pressing it does.

### Sampling cap

`sampleDimensions()` scales the Source to fit inside 800×800 (aspect-preserving) before any pixel
work, so a large image can't freeze the tab. The downscale itself rides on the hidden canvas'
`drawImage` — read and resize in one operation (ADR 0001).

Note this caps **both** axes, where ASCII//Convert's `resizeImage()` caps width alone. That's not
gratuitous divergence: ASCII resamples down to a `cols × rows` char grid, which bounds the work
whatever the Source's height. Here the sampled buffer *is* what `applyChain` walks, so a
500×20000 Source would sail through a width-only cap and freeze the tab.

### Installing and offline

The policy and all its machinery are the kit's — read `packages/deck-kit/README.md` ("Making a
program installable") and ADR 0027; nothing about it is described again here. This app's whole share
of it is `public/manifest.webmanifest`, one line of `vite.config.ts`, and the two lines in `app.tsx`
that render the bar.

The one thing that is this program's: **a Live Source and a Recording are what the no-mid-session
rule is protecting here.** A parked build must never yank a streaming camera or a take in flight,
which is why the bar only ever offers.

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
| **Seed** | Seeds the Chain's pseudo-randomness — the arrangement. Lives beside the Chain; held across frames by default, or animated per frame on a Live Source | random, rng |
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
`glitch-canvas.tsx`: the LIVE / REC badges and the clear control). The Wipe's handle is the newest
one and the sharpest case — it is the only control that sits in the *middle* of the artwork rather
than in a corner of it, so it carries its own `bg-bg` and its divider line travels inside an opaque
sheath. It buys its 44x44 as a `TOUCH_TARGET_OVERLAY` for the same reason the row does: chrome over
the canvas stays at its drawn size, and `ICON_GLYPH_SIZE` is never used over a canvas at all (root
`CLAUDE.md`). ADR 0009's ratios are all
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
- `src/glitch/presets.ts` — `PRESETS` (the curated Chains), `presetById()` (the only way to reach
  one — throws on a miss), `DEFAULT_PRESET` (applied on open),
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
  `moveLink()` / `toggleBypass()` plus `MAX_CHAIN_LENGTH`. Depends on `pipeline.ts` one-way: the
  Effects don't know the Chain exists
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
  `activePresetId` + `isSeedAnimated`, which persists across a Source change deliberately — the
  Editor holds no Source to clear it on), `EditorAction`, `editorReducer()` (the whole transition
  table — pure, all randomness arrives in the payload), `isPresetModified()` (the one place
  `(modified)` is derived), `initialEditorState()`, `ChainActions` (the six Chain edits as one
  callback bundle) and `SeedControls` (Re-roll and animate, the arrangement's own bundle — kept
  apart from `ChainActions` because that separation *is* ADR 0017). Both are Editor vocabulary, so
  the panels import them from here
- `src/glitch/image-utils.ts` — `sampleDimensions()` (800×800 cap), `sourceDimensions()`,
  `GlitchSource` (image | video — the shell's vocabulary, kept out of the DOM-free `types.ts`)
- `src/glitch/render-frame.ts` — `renderGlitchFrame()`: the imperative shell. Async, and reports
  `GlitchFrameOutcome`
- `src/glitch/chain-runner.ts` — `ChainRunner` (the seam), `createChainRunner()` (Worker where the
  browser has one, synchronous core where it does not), `createWorkerChainRunner()` (the drop rule
  and the transfers, testable against a double), `createSyncChainRunner()` (the fallback)
- `src/glitch/chain-job.ts` — what crosses the thread boundary: `ChainJob`, `ChainResult`, and
  `runChainJob()` — the Worker's whole body as a pure function
- `src/glitch/chain-worker.ts` — the Worker entry. Four lines of wiring; no test reaches it

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
  `shareOrDownloadBlob`, `isTouchDevice`), `errors`, `pwa` (`useAppUpdate`, `UpdateBanner`) and the
  `precache-shell` build plugin beside it (ADR 0027)

**Installing and offline** (ADR 0027) — the machinery is the kit's; this app owns only these two
- `vite.config.ts` — `precacheShell({ cachePrefix: 'glitch-shell-' })`
- `public/manifest.webmanifest` — hand-written. The kit's roster guard pins its `theme_color` to the
  same token the `theme-color` meta carries, and checks every icon it names exists

**Components**
- `src/components/glitch-canvas.tsx` — lifecycle coordinator: drives the render, owns the ~15fps
  rAF loop for a Live Source, and holds the canvas' one `ChainRunner`. Takes `onAdvanceSeed` and
  calls it after each painted frame —
  told to advance, never why, so the animation's on/off is the caller withholding the callback.
  Carries the LIVE badge and the REC badge, which is also the
  Recording's stop control and its elapsed timer — the canvas is the one surface every tab shows,
  so that is where a stop reachable from anywhere has to live (ADR 0020). Owns the Wipe's on/off and
  the compare canvas it hands the shell — null exactly while the Wipe is off
- `src/components/wipe-divider.tsx` — the Wipe's chrome: the second canvas the Source half is
  blitted onto, the divider line, and the handle — a `role="slider"` with the arrow keys, an
  accessible name and a value. Measures the fit region (ADR 0010) off its own box, so the wipe
  divides the picture rather than the canvas element
- `src/components/wipe.ts` — the Wipe's geometry, pure and DOM-free the way `chain-drag.ts` is:
  `computeFitRegion()`, `fractionAt()`, `wipeKeyMove()`, `WIPE_INITIAL` / `WIPE_STEP` /
  `WIPE_PAGE_STEP`
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
  slot with the params, and the Seed's controls sit outside the row (`SeedControls`, their own
  bundle — the Seed is not part of the look): Re-roll, and **animate** beside it for a Live
  Source, since it is Re-roll once a frame and belongs where Re-roll is rather than in OUT

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
