# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Commands

```bash
npm run dev        # start Vite dev server
npm run build      # tsc -b && vite build
npm run test       # run all tests (vitest)
npm run test:coverage          # vitest run --coverage
npx vitest run src/ascii/renderer.test.ts  # run a single test file

npm run lint       # biome lint .
npm run lint:fix   # biome lint . --write
npm run check      # biome check . (lint + format)
npm run check:fix  # biome check . --write
npm run format     # biome format . --write
```

## Architecture

Single-page React/TS/Vite app. Fully client-side — no backend server. AI analysis is optional and uses the user's own API key (Anthropic, OpenAI, or Gemini).

### Conversion pipeline

1. `UploadZone` hands either an `HTMLImageElement` (Source Image) or `HTMLVideoElement` (Live Source) to `App`
2. `App` holds `ConversionSettings` state and passes both down to `AsciiCanvas`
3. `AsciiCanvas` keeps a **hidden off-screen canvas** (`hiddenRef`) sized `cols × rows` — this is used only for pixel sampling via `getImageData`. The visible canvas is sized in pixels. These two canvases must stay separate (see ADR 0001)
4. `AsciiCanvas` decides *when* to render: once per settings change via `useEffect` for Source Image, or in a `requestAnimationFrame` loop throttled to ~15fps for Live Source (see ADR 0002). It calls `renderFrame()` from `src/ascii/render-frame.ts`
5. `renderFrame()` in `src/ascii/render-frame.ts` orchestrates a single render: computes `cols × rows` from canvas size and resolution, draws source onto the hidden canvas → `convertImage()` → `computeFrame()` → `paintFrame()`. Returns `false` (skips render) if canvas is too small to fit any character; returns `true` on success
6. `computeFrame()` is **pure** — given cells and settings, returns `RenderInstruction[]` and `asciiRows` with no DOM access (see ADR 0005)
7. `paintFrame()` is the only function that writes to `CanvasRenderingContext2D` for rendering
8. `onConverted` callback sends the plain-text rows up to `App`, where they're held in `asciiRows` state for TXT Export

### AI analysis

Optional feature — user supplies their own API key. `use-ai-config` stores the `AIConfig` in `localStorage`. `analyzeCanvas()` in `analysis-service.ts` dynamically imports the correct adapter (Anthropic, OpenAI, or Gemini), calls it, and validates the response with `validate()`. AI errors (`AuthError`, `QuotaError`, `ParseError`) are typed classes caught in `app.tsx` and routed to `AnalysisModal` for type-specific feedback (see ADR 0003, ADR 0006).

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
| **Source Image** | Static uploaded image; immutable during session | uploadedImage, input image |
| **Live Source** | Active webcam stream | stream, camera, video source |
| **ConversionSettings** | All conversion params (charset, colorMode, resolution, brightness, contrast) | options, settings |
| **AsciiCell** | Atomic unit: one character + its original RGB | ProcessedPixel |
| **Color Mode** | Colorization scheme applied during render | colorMode as domain term |
| **Resolution** | Chars-per-canvas (controlled by character size) | fontSize, granularity |
| **Export** | Taking the result out (PNG or TXT) | download |
| **Capture** | Exporting a single frame from Live Source (doesn't stop the loop) | snapshot, screenshot |
| **Recording** | Capturing Live Source as a video file via MediaRecorder | video export, screen record |
| **AI Analysis** | Optional AI-powered description + threat-level of the ASCII canvas | AI scan, AI detection |

### Design system

All visual tokens live as CSS custom properties in `src/index.css`. Tailwind is configured in `tailwind.config.js` to reference those same variables — so `text-violet` and `var(--violet)` resolve to the same value. Components use Tailwind classes for static tokens and inline `var(--token)` references for runtime-dynamic values (e.g. threat level colors).

### Comment convention

**1. Only the non-obvious "why".** Never restate what the code or a name already says. Keep a comment only when it carries rationale a reader couldn't infer from the code itself:

- a deliberate design choice (`Sequential by design — a stop must settle before the following start`)
- a behavior-preserving constraint or "do not simplify this" guard
- a reference to an ADR or a domain term from CONTEXT.md

If a comment would only paraphrase the declaration below it, delete it and let the name carry the meaning.

```ts
// Bad — restates the name
// Body scroll lock
useEffect(() => { ... })

// Good — explains a constraint the code can't show
// Safari private mode / sandboxed iframe — silently ignore
```

**2. JSDoc (`/** */`) on module-level declarations.** Document exported functions, types, and other top-level declarations with JSDoc blocks rather than `//`.

Use plain `//` for everything that can't attach to a module-level declaration:

- notes inside a function or component body (a guard, a local const, an anonymous `useEffect`)
- `biome-ignore` directives
- **file headers** — a `/** */` block at the top of a file is not detached by a blank line; TypeScript binds it to the next declaration, so a module banner would surface as that declaration's hover text. Keep file headers as `//`.

```ts
/**
 * Pure: derives render instructions and ascii text from a cell grid — no DOM, fully testable.
 * See ADR 0005 for the pure/impure boundary rationale.
 */
export function computeFrame(...) { ... }
```

Both rules compose: JSDoc is the *format* for declaration-level comments, the "why" rule decides *whether* the comment earns its place at all. A declaration with nothing non-obvious to say gets no JSDoc.

### Key files

**ASCII core**
- `src/ascii/types.ts` — `ConversionSettings`, `ColorMode`, `Charset`, `CHARSET_MAPS`, `AsciiCell`
- `src/ascii/converter.ts` — `convertImage()`, `getAsciiChar()`, luminosity math
- `src/ascii/image-utils.ts` — `resizeImage()` (caps Source Image at 800px wide before sampling)
- `src/ascii/renderer.ts` — `computeFrame()` (pure), `paintFrame()` (side effects) — see ADR 0005
- `src/ascii/render-frame.ts` — `renderFrame()`: pipeline orchestrator — cols/rows math, convertImage → computeFrame → paintFrame; returns `boolean`
- `src/ascii/presets.ts` — `PRESETS`, `Preset`, `settingsMatch()` (named ConversionSettings snapshots)

**AI analysis**
- `src/ai/types.ts` — `AIConfig`, `AIProviderName`, `AIProvider`, `Analysis`, `ThreatLevel`, `AnalysisState`
- `src/ai/analysis-service.ts` — `analyzeCanvas()`, lazy-imports correct adapter, validates response
- `src/ai/adapters/` — `AnthropicAdapter`, `OpenAIAdapter`, `GeminiAdapter`
- `src/ai/errors.ts` — `AuthError`, `QuotaError`, `ParseError`
- `src/ai/use-ai-config.ts` — `AIConfig` state + `localStorage` persistence

**Errors & utilities**
- `src/errors/app-error.ts` — `AppError`, `createError`, `normalizeError`, `Errors` namespace
- `src/hooks/use-recording.ts` — `useRecording`, `isRecordingSupported`, format detection
- `src/hooks/use-toast.ts` — toast queue state
- `src/hooks/use-webcam-state.ts` — webcam lifecycle state
- `src/utils/cn.ts` — `cn()` (clsx + tailwind-merge)
- `src/utils/load-image-file.ts` — `loadImageFile()` (File → HTMLImageElement, validates type/size)
- `src/utils/device.ts` — device/browser detection helpers
- `src/utils/share.ts` — `shareOrDownloadBlob()` (Web Share API with download fallback)

**Components**
- `src/components/ascii-canvas.tsx` — lifecycle coordinator: drives static and rAF render paths
- `src/components/control-panel.tsx` — ConversionSettings controls
- `src/components/upload-zone.tsx` — image upload and Live Source activation
- `src/components/download-bar.tsx` — Export and Capture controls
- `src/components/empty-state-hero.tsx` — initial empty state with upload and webcam entry points
- `src/components/mobile-bottom-sheet.tsx` — slide-up sheet for mobile controls
- `src/components/mobile-controls.tsx` — ConversionSettings controls layout for mobile
- `src/components/ai-config-banner.tsx` — informational banner for AI config; dismiss state in `sessionStorage`
- `src/components/analysis-modal.tsx` — AI Analysis results with threat-level display
- `src/components/api-key-modal.tsx` — API key configuration
- `src/components/about-modal.tsx` — About/info modal
- `src/components/toast-provider.tsx` — renders the toast queue
- `src/components/error-boundary.tsx` — generic React error boundary with customizable fallback
- `src/components/ui/` — design system primitives: `badge`, `button`, `error-text`, `label`, `modal`, `slider`, `toast`, `toggle-group`, `tooltip`

**ADRs**
- `docs/adr/` — all architectural decisions
