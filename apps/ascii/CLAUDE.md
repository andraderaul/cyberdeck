# CLAUDE.md — ASCII//Convert

Guidance for Claude Code (claude.ai/code) when working in `apps/ascii`.

This app is one program on the CYBERDECK deck — see the root `CLAUDE.md` for the monorepo
layout, the deck-wide comment convention, and the release ritual. Paths below are relative to
`apps/ascii`.

## Commands

Run from this directory (or use `--workspace @cyberdeck/ascii` from the root).

```bash
npm run dev        # start Vite dev server
npm run build      # tsc -b && vite build
npm run test       # vitest (watch)
npm run test:run   # vitest run
npm run test:coverage          # vitest run --coverage
npx vitest run src/ascii/renderer.test.ts  # run a single test file
```

Lint and format are repo-wide and run from the root: `npm run check`.

## Architecture

Single-page React/TS/Vite app. Fully client-side — no backend server. AI analysis is optional and uses the user's own API key (Anthropic, OpenAI, or Gemini).

### Conversion pipeline

1. The kit's `EmptyStateHero` is the single entry (ADR 0015), but only the Source Image travels
   through it: `onImage` hands `App` an `HTMLImageElement`, while `onUseWebcam` is a bare signal that
   asks `App` to switch mode. The `HTMLVideoElement` (Live Source) arrives on the other path —
   `useWebcamState`'s stream callback in `app.tsx`, which is also what a camera switch re-enters
   through
2. `App` holds `ConversionSettings` state and passes both down to `AsciiCanvas`
3. `AsciiCanvas` keeps a **hidden off-screen canvas** (`hiddenRef`) sized `cols × rows` — this is used only for pixel sampling via `getImageData`. The visible canvas is sized in pixels. These two canvases must stay separate (see ADR 0001)
4. `AsciiCanvas` decides *when* to render: once per settings change via `useEffect` for Source Image, or in a `requestAnimationFrame` loop throttled to ~15fps for Live Source (see ADR 0002). It calls `renderFrame()` from `src/ascii/render-frame.ts`
5. `renderFrame()` in `src/ascii/render-frame.ts` orchestrates a single render: computes `cols × rows` from canvas size and resolution, draws source onto the hidden canvas → `convertImage()` → `computeFrame()` → `paintFrame()`. Returns `false` (skips render) if canvas is too small to fit any character; returns `true` on success. Mirror is threaded in here as an `isMirrored` flag and applied to the *sampling* `drawImage`, so preview and every Export carry the flip (ADR 0016) — never a CSS transform on the visible canvas
6. `computeFrame()` is **pure** — given cells and settings, returns `RenderInstruction[]` and `asciiRows` with no DOM access (see ADR 0005)
7. `paintFrame()` is the only function that writes to `CanvasRenderingContext2D` for rendering
8. `onConverted` callback sends the region-cropped result up to `App` — the plain-text rows for TXT
   Export and the same grid as `RenderInstruction[]`, colour still attached, for HTML Export. It is
   a second `computeFrame()` over the cropped cells rather than a slice of the instructions, so each
   x/y is rebased on the cropped grid's own origin

### AI analysis

Optional feature — user supplies their own API key. `use-ai-config` stores the `AIConfig` in `localStorage`. `analyzeCanvas()` in `analysis-service.ts` dynamically imports the correct adapter (Anthropic, OpenAI, or Gemini), calls it, and validates the response with `validate()`. AI errors (`AuthError`, `QuotaError`, `ParseError`) are typed classes caught in `app.tsx` and routed to `AnalysisModal` for type-specific feedback (see ADR 0003, ADR 0006).

An `Analysis` carries a **Suggestion** — the `ConversionSettings` the Provider proposes for this
image — on the same round trip as the prose (issue #308). **`src/ai/suggestion.ts` is the trust
boundary**: it is the one place a provider's JSON becomes domain values, so an unknown Charset or
Color Mode, an out-of-range number or a missing field is refused rather than coerced. Not
per-adapter (three normalisers drift) and not at the point of application (three callers, three
opinions of what a Charset is).

The two halves fail separately, and that asymmetry is deliberate: malformed *prose* is a
`ParseError` that takes the Analysis, while a suggestion the reader refuses is dropped and the
description still renders with the panel absent. One call bought both, and a good description is not
worth discarding over one out-of-range float. The reader never throws — it hands back a reason,
which `analysis-service` logs, since a silently missing panel is otherwise invisible in a bug report
and prompt-versus-reader drift is what will cause it.

Nothing applies on arrival: the modal shows the suggestion, `App` waits for the click, and what it
displaced is one `revert` away in the PRESETS tab until the user's own next edit.

### Installing and offline

The program precaches its whole built shell and serves only from that cache — no runtime strategies,
because nothing here fetches at runtime (ADR 0027). The one rule that matters lives in
`src/pwa/policy.ts`: the worker answers only same-origin requests for files this build emitted, which
is what keeps the AI Provider call out of the cache by *origin* rather than by an exception anyone
could forget to renew (ADR 0003). That the call now also carries the Suggestion home changes nothing
here, and that is the point of deciding on origin: the rule never looks at what the request or its
reply contains.

A new build never activates mid-session — the worker does not call `skipWaiting`, so a Recording in
flight or a Live Source is never yanked. It parks, `useAppUpdate` notices, and `UpdateBanner` offers
the reload. `scripts/precache-shell.ts` is the build half: it walks `dist` and compiles the worker
with that manifest defined in. It only runs on `build`; a dev server has no worker at all.

### Error handling

Two coexisting error flows (see ADR 0006):
- **AI errors** — typed classes (`AuthError`, `QuotaError`, `ParseError`) thrown by adapters, caught in `app.tsx`, shown in `AnalysisModal`
- **Operational errors** — `AppError` plain-object shape (`type`, `message`, `cause?`) for Export, Capture, and localStorage failures; surfaced via the toast system (`use-toast` + `ToastProvider`)

### Recording

`useRecording` wraps `canvas.captureStream(15)` + `MediaRecorder` with runtime format detection (vp9 → vp8 → webm → mp4). The Record control is hidden entirely on browsers without support — no GIF fallback (see ADR 0007). On completion, `shareOrDownloadBlob` opens the Web Share API on mobile or triggers a direct download on desktop.

### Domain language (from CONTEXT.md)

Use these terms precisely — avoid the listed alternatives:

| Term | Meaning | Avoid |
|------|---------|-------|
| **Charset** | Symbol set mapping luminosity to a character | density, symbol set |
| **Edge Glyph** | Directional character a cell takes where the local gradient reads as a contour — the shape axis beside the Charset's brightness one; opt-in, off by default | edge detection, sobel char |
| **Dithering** | Pattern spent on the sampled grid before the Charset buckets a cell, so a coarse Charset carries a gradient instead of banding it — `none` / `bayer` / `floyd`; runs *before* the Edge Glyph pass, which never reads it | noise, halftone, error diffusion |
| **Source Image** | Static uploaded image; immutable during session | uploadedImage, input image |
| **Live Source** | Active webcam stream | stream, camera, video source |
| **ConversionSettings** | All conversion params (charset, edgeGlyphs, dithering, colorMode, resolution, brightness, contrast) | options, settings |
| **AsciiCell** | Atomic unit: one character + its original RGB | ProcessedPixel |
| **Color Mode** | Colorization scheme applied during render | colorMode as domain term |
| **Adaptive** | The one Color Mode that brings no colour of its own — a cell is painted the mean of the fixed lattice bin it is in, so the art comes back in its own colours; recomputed per frame, Live Source included | auto color, k-means, median cut, nearest-of-N |
| **Resolution** | Chars-per-canvas (controlled by character size) | fontSize, granularity |
| **Export** | Taking the result out (PNG, TXT or HTML) | download |
| **HTML Export** | Self-contained document holding the characters *and* their colours as selectable text | SVG Export, web export |
| **Capture** | Exporting a single frame from Live Source (doesn't stop the loop) | snapshot, screenshot |
| **Recording** | Capturing Live Source as a video file via MediaRecorder | video export, screen record |
| **AI Analysis** | Optional AI-powered description + threat-level of the ASCII canvas, with the Suggestion on the same round trip | AI scan, AI detection |
| **Suggestion** | The ConversionSettings an Analysis proposes when one reads cleanly; applied only when the user asks, reversible until they edit | recommendation, AI preset |

### Design system

The visual language lives in `@cyberdeck/deck-kit` (ADR 0014): `src/index.css` imports the kit's
`tokens.css`, and `tailwind.config.js` extends the kit's Tailwind preset, so `text-accent` and
`var(--accent)` resolve to one value shared with every other program. The deck-kit glob in the
Tailwind `content` is load-bearing — without it the kit primitives' classes are purged at build
(root `CLAUDE.md`). Components use Tailwind classes for static tokens and inline `var(--token)`
references for runtime-dynamic values (e.g. threat level colors).

**Name the role, not the hue** — `text-accent`, not `text-violet`. The visual language is a set of
named Themes (ADR 0024), and only the semantic layer varies between them; a literal hue pins a
component to one Theme and breaks the rest in that one corner.

### Comment convention

See the root `CLAUDE.md` — the convention is deck-wide.

### Key files

**ASCII core**
- `src/ascii/types.ts` — `ConversionSettings`, `ColorMode`, `Charset` (derived from `CHARSETS`),
  `DITHERINGS`, `CHARSET_MAPS`, `AsciiCell`, and the numeric ranges the sliders and the Suggestion
  reader share
- `src/ascii/converter.ts` — `convertImage()`, `getAsciiChar()`, luminosity math, and the two
  opt-in passes over the sampled grid (both pure, ADR 0005): the Dithering, then the Edge Glyph
  (Sobel). That order is load-bearing and the file says why — a Dithering *manufactures* the sharp
  neighbour differences Sobel hunts for, so the gradient reads the undithered luminance and its
  stroke wins over whatever character the pattern chose. Measured, it is `floyd` that would invent
  contours (a flat field comes back with two dozen); `bayer`'s swing reaches only ~71 of the 255 the
  threshold wants, so the rule is free for it today and stated for both anyway
- `src/ascii/palette.ts` — `quantizePalette()`, `paletteColor()`: the `adaptive` Color Mode's
  quantizer, pure over the AsciiCell grid (ADR 0005) and called only by `computeFrame()`. A cell is
  painted the mean of the fixed 4×4×4 lattice bin it is *in*, never the nearest of a ranked few —
  and that distinction is the file's whole subject, because the rejected shape reads like the same
  idea. Nearest-of-six is a Voronoi over six data-dependent means, so the partition moves with the
  picture after all; the measurement that killed it lives in `quantizePalette`'s own JSDoc and
  `palette.test.ts` holds the reproduction. Constant bin edges are what make the palette safe to
  recompute on **every frame** of a Live Source, which is the behaviour it chose over holding one
  per Source; the price, named rather than hidden, is a posterisation of up to 64 colours
  instead of a handful. Nothing in
  this path may read a Theme token — a Color Mode paints the user's art (ADR 0013, ADR 0024), and
  here every colour came out of the Source itself
- `src/ascii/image-utils.ts` — `resizeImage()` (caps Source Image at 800px wide before sampling)
- `src/ascii/renderer.ts` — `computeFrame()` (pure), `paintFrame()` (side effects) — see ADR 0005.
  `CANVAS_BACKGROUND` is the ground both the canvas and the HTML Export stand on: the user's art,
  so a literal rather than a Theme token (ADR 0013)
- `src/ascii/render-frame.ts` — `renderFrame()`: pipeline orchestrator — cols/rows math, convertImage → computeFrame → paintFrame; returns `boolean`
- `src/ascii/fit.ts` — `computeContainFit()`, `sliceToRegion()` (crops the *cells*, upstream of
  `computeFrame()`, which leaves TXT and HTML Export downstream of one crop by construction): the
  centered "contain" sub-region of
  the char grid that keeps the Source's aspect, compared against the grid's *pixel* aspect because
  the monospace cell is ~0.6 wide × 1 tall (ADR 0010)
- `src/ascii/presets.ts` — `PRESETS`, `Preset`, `settingsMatch()` (named ConversionSettings snapshots)

**AI analysis**
- `src/ai/types.ts` — `AIConfig`, `AIProviderName`, `AIProvider`, `Analysis`, `ThreatLevel`, `AnalysisState`
- `src/ai/analysis-service.ts` — `analyzeCanvas()`, lazy-imports correct adapter, validates response
- `src/ai/suggestion.ts` — `readSuggestion()`, `SUGGESTION_PROMPT`, `SUGGESTION_SKELETON`: the
  untrusted → typed crossing for the Suggestion. `SUGGESTION_FIELDS` is keyed on
  `ConversionSettings` itself — with the `-?` modifier, or a field turning optional would silently
  reopen the hole — so a new axis can't fall out of the format, and the reader, the prompt's rules
  and the JSON skeleton the prompt shows all come off that one map. The skeleton is generated for
  that reason: hand-spelled, it would go on asking for the axes it knew while the reader wanted one
  more, and every reply would be dropped. #346's Dithering was the first axis to arrive after this
  landed and it cost two entries, both of which the compiler demanded. Rejects rather than clamps, for GLITCH's `chain-codec.ts` reason
  (#312), and returns its reason rather than throwing, for the same reason that file does
- `src/ai/adapters/` — `AnthropicAdapter`, `OpenAIAdapter`, `GeminiAdapter`
- `src/ai/errors.ts` — `AuthError`, `QuotaError`, `ParseError`
- `src/ai/use-ai-config.ts` — `AIConfig` state + `localStorage` persistence

**Errors & utilities**
- `src/errors/app-error.ts` — `Errors`: this app's error factories (Export, Capture, localStorage)
  over the kit's `AppError` / `createError` (`@cyberdeck/deck-kit/errors`) — only the wording stays
  here (ADR 0014)
- `src/export/html-document.ts` — `buildHtmlDocument()`: the HTML Export's document, pure over
  `RenderInstruction[]` (ADR 0005). HTML rather than SVG because only `<pre>` guarantees the art
  copies back with its line breaks and column alignment; the reason is a comment at the top of the
  file. `e2e/ascii/html-export.spec.ts` proves the selection, the monospace grid and the colours in
  a real browser, which a string assertion structurally cannot
- `src/export/output.ts` — `outputFilename()`, `OutputKind`, `planPngExport()`, `MAX_EXPORT_DIM`,
  `PngScale`: the pure naming and sizing decisions for Export & Capture, blob construction left to
  the shells. Deliberately still a hand-copy of GLITCH's (ADR 0014) — the filenames diverge
- `src/hooks/use-webcam-state.ts` — `useWebcamState()`, `planEffects()`, `reducer()`: the Live
  Source's MediaStream lifecycle — deliberately still a hand-copy (ADR 0014)
- Everything else shared comes from `@cyberdeck/deck-kit` (ADR 0014), across its five entrypoints:
  `ui` (the primitives plus `EmptyStateHero`, `SourceImageDropZone`, `ErrorBoundary`, `TabStrip`,
  `ThemeControl`, `ICON_GLYPH_SIZE`, `TOUCH_TARGET_*`, and `ToastProvider` with the `useToastError` /
  `useToastInfo` / `useToastWarn` senders); `hooks` (`useToast` — the queue itself, which the
  Provider owns — and `useDialog`); `recording` (`useRecording`, `formatElapsedTime`, and the
  share-or-download a finished take goes out through); `utils` (`cn`, `loadImageFile`,
  `shareOrDownloadCanvas`, `shareOrDownloadBlob`, `isTouchDevice`); `errors`

**Installing and offline** (ADR 0027)
- `src/pwa/policy.ts` — pure: `planShellFetch()` (the whole fetch rule, and where the AI Provider is
  excluded by origin), `shellCacheName()`, `resolveShell()`, `SKIP_WAITING`
- `src/pwa/service-worker.ts` — the worker. Not part of the app's module graph: it is compiled on its
  own to `dist/sw.js`, against `tsconfig.worker.json` because `WebWorker` and `DOM` cannot share a
  project
- `src/pwa/use-app-update.ts` — `useAppUpdate()`: registration, and whether a build is parked behind
  the running one
- `scripts/precache-shell.ts` — the Vite plugin that walks `dist` and compiles the worker with that
  manifest defined in. Hand-rolled rather than `vite-plugin-pwa`; the reason is at the top of the file
- `public/manifest.webmanifest` — hand-written. The kit's roster guard pins its `theme_color` to the
  same token the `theme-color` meta carries, and checks every icon it names exists

**Components**
- `src/components/ascii-canvas.tsx` — lifecycle coordinator: drives static and rAF render paths.
  Carries the LIVE badge and the REC badge, which is also the Recording's stop control and its
  elapsed timer (ADR 0020). Unlike GLITCH's badge it needs no opaque background: `paintFrame()`
  fills this canvas with `--void` first, so the overlay already sits on the audited pair (ADR 0013)
- `src/components/control-strip.tsx` — the Control Strip (ADR 0020): the bottom-anchored control
  surface at both breakpoints and the program's whole control grammar — there is no aside and no
  sheet and no always-visible export bar behind it. A tab is
  never rendered ahead of what sits behind it — PRESETS → EDIT → OUT is the session read left to
  right. The shell is the kit's `TabStrip`
  (ADR 0020's extraction slice); this file is the wiring that says which panel each tab carries.
  Only the active panel is mounted, so one tab's controls are in the accessibility tree at a time. The shell is GLITCH's, ported rather than
  redesigned — whatever lands empty-diff is what crosses into deck-kit
- `src/components/preset-picker.tsx` — the Strip's PRESETS tab: the Preset chips in a horizontally
  scrollable row, the active one tracked rather than derived — an edit has to leave you standing on
  the Preset you started from, marked modified. Carries the `revert` control for an applied Suggestion,
  ahead of the scrolling row: it restores a look, and looks are chosen here. A Button rather than a
  Chip, alone in a row of them — a Chip always announces `aria-pressed`, and this is a one-shot
  action with no toggle state to report
- `src/components/settings-editor.tsx` — the Strip's EDIT tab: every ConversionSettings control as
  a row of tool chips, the focused tool's control in the panel above. The three sliders are
  siblings, so at `sm` the whole group reads at once while mobile focuses one (adaptive density);
  the off-density ones are `hidden`, which keeps them out of the accessibility tree too
- `src/components/output-panel.tsx` — the Strip's OUT tab: one surface for every way the result
  leaves, gated by Source — PNG/TXT/HTML Export for a Source Image, Capture/Record for a Live Source,
  AI Analysis for both. It carries the Record *start* only: stopping is the canvas REC badge, so a
  take survives a tab switch (ADR 0020). The AI config banner lives here too, beside the Analysis
  it advertises
- `src/components/ai-config-banner.tsx` — informational banner for AI config, rendered inside the
  OUT tab; dismiss state in `sessionStorage`
- `src/components/analysis-modal.tsx` — AI Analysis results with threat-level display, and the
  Suggestion's `apply` — the only control in the app that moves every ConversionSetting at once
- `src/components/api-key-modal.tsx` — API key configuration
- `src/components/about-modal.tsx` — About/info modal
- `src/components/update-banner.tsx` — the one thing a parked new build may do to a running session:
  say so, under the header, with the control that promotes it (ADR 0027). App-owned until #325 gives
  it a second caller
- `src/components/footer.tsx` — empty-state bottom chrome: the attribution links plus the About
  trigger, hidden once a Source loads. The 44px target sits on each control, not on the bar
- `src/components/ui/` — the three primitives this program still owns: `badge`, `error-text`, and
  `header-button` (the header's own control shape). Everything else — Button, Chip, Label, Modal,
  Slider, TabStrip, ToggleGroup, Tooltip, Toast — comes from `@cyberdeck/deck-kit/ui`

**ADRs**
- `../../docs/adr/` — all architectural decisions (deck-wide, at the repo root)
