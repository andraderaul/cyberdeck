# @cyberdeck/glitch

## 0.6.0

### Minor Changes

- 4bd889a: The Control Strip's EDIT tab (ADR 0020): the Chain reads left→right as a row of Link chips in
  processing order, with the focused Link's params in the panel above it — stacked on mobile, laid
  out as one group on desktop. Every structural edit keeps full parity across breakpoints: drag or
  left/right arrows to reorder, a `+` chip for the add palette, duplicate and remove on the focused
  Link, repeats allowed.

  The legacy control surfaces are gone with it — the desktop aside, the mobile bottom sheet and its
  floating trigger, and the `advanced` Disclosure. A mobile user can now build a look from scratch
  with the canvas in view the whole time.

- 4bd889a: The Control Strip's OUT tab (ADR 0020): PNG Export, Capture, Copy and Recording move into the third
  tab with today's per-source availability unchanged, and the always-visible ExportBar is gone —
  export is the session's terminal action and affords a tab switch.

  Recording is the one stateful output, so its start and stop now live apart: start is a control in
  OUT, stop is the canvas REC badge, which becomes tappable and carries the elapsed timer. A take
  keeps running while you tweak the look in PRESETS or EDIT, and is stoppable from any of them
  without new chrome.

  A full GLITCH session — choose a Source, apply a Preset, tweak the Chain, take the result out — now
  runs in the Strip alone.

- 4bd889a: Control Strip shell with its PRESETS tab (ADR 0020). The Preset chips and Randomize move to a
  horizontal, bottom-anchored surface present at both breakpoints, so the canvas stays visible while
  a look is browsed and applied — the blind-editing loop the bottom sheet forced is gone for the
  front door. The desktop aside and the mobile sheet keep the `advanced` layer only.

### Patch Changes

- 4bd889a: The Control Strip's shell crosses into deck-kit as `TabStrip` (ADR 0020's extraction slice). With
  the Strip landed in both programs, the tablist markup, the selected-tab state and the single
  mounted panel were byte-identical — ADR 0014's "empty diff plus two real callers" met exactly. The
  tab set and the panels stay in each app: those are vocabulary and domain surface, and neither
  crosses the seam.

  `MobileBottomSheet` is removed from the kit. It lost its only two callers when the sheets died, and
  nothing on the deck references it.

- 4bd889a: Reorder a Link by dragging it on a phone. The Chain row used HTML5 drag-and-drop, which never fires
  on touch, so reordering was reachable only with a mouse or a keyboard — the one structural edit
  that stayed desktop-only. Pointer Events replace it, covering mouse, pen and finger through one
  path.

  The REC badge's hover no longer goes translucent over the artwork (GLITCH), and neither badge
  announces its timer once a second any more — the accessible name carries the elapsed time instead.

- Updated dependencies [4bd889a]
  - @cyberdeck/deck-kit@0.1.0

## 0.5.0

### Minor Changes

- e6ec788: Build your own chain. The advanced panel now has an effect palette — add any effect, remove one, or duplicate a row — so the same effect can appear more than once: two pixel sorts, or a channel split before _and_ after a sort. Repeats each get their own arrangement rather than redrawing the first. Chains are capped at 10 effects, and the palette says how full the chain is as you go.
- e6ec788: The Chain is now the look. App state holds an ordered list of Links instead of a flat settings object, the six Presets are Chains carrying only the Effects they actually use, and an Effect is on because its Link is present — the on/off toggles and the "zero means off" convention are gone. Every Preset renders exactly as it did before. The advanced panel lists the active look's Links in order, so a Preset that leaves an Effect out simply has one section fewer.
- e6ec788: Reorder the Effects in a look. Each row in the advanced panel now carries a grab handle: drag it to move that Effect earlier or later in the chain, or focus it and use the up and down arrow keys. Because order is part of the look, moving an Effect marks the active Preset as modified — and moving it back restores the match.

### Patch Changes

- e6ec788: Withhold duplicate for pixel sort, where a straight copy would have changed nothing. Sorting an already-sorted run leaves it as it was, so a second pixel sort with identical settings renders exactly like one — the control now says so instead of spending a click on an invisible change. A second pixel sort is still available from the add palette, where tuning it differently (a horizontal pass crossed with a vertical one) does produce the double melt.
- e6ec788: Introduce the composable Effect Chain in the core (ADR 0017), behind the existing controls. Rendering now folds through `applyChain`, with each Link drawing on a Seed derived from which occurrence of its Effect it is, so a future Chain can carry the same Effect twice without the repeats sharing an arrangement. No control changes and no rendering changes: every Preset renders byte-for-byte as before.

## 0.4.0

### Minor Changes

- dc04d68: Add Chromatic Aberration, a sixth Effect: a radial lens fringe that leaves the centre sharp and pulls the red and blue channels apart toward the edges. It runs after Channel Shift in the Pipeline, carries a strength slider in the advanced panel, and ships subtly enabled in the VAPORWAVE Preset.

## 0.3.0

### Minor Changes

- 4148beb: Add a mirror to the Live Source, matching ASCII//Convert (ADR 0016). Unlike ASCII's cosmetic CSS flip, GLITCH mirrors the pixels in the Pipeline — the Source is flipped on the sampling draw, before the Effects run — so the exported PNG/recording carries the flip and never disagrees with the preview. The front camera auto-mirrors on start, and a `⇋ mirror` toggle sits in the canvas overlay beside clear (icon-only on touch).

## 0.2.0

### Minor Changes

- 29f8558: Add explanatory tooltips at Effect level plus Seed in the advanced panel (ADR 0015), mirroring ASCII//Convert's, and adopt the shared deck-kit empty-state hero.

## 0.1.1

### Patch Changes

- 681f750: Extract the operational-error mechanism into `@cyberdeck/deck-kit/errors` (ADR 0014, Candidate B):
  `AppError`, `createError`, `isAppError`, `normalizeError` (including the generic `unknown_error`
  fallback). Each app keeps its own `Errors` catalog, now importing `createError` from the kit — the
  vocabulary never crosses the seam. Internal refactor — no behavior change.
- 8aeaaa1: Migrate the framework-neutral hooks `use-dialog` and `use-toast` into
  `@cyberdeck/deck-kit/hooks` (ADR 0014). Both apps import them from the kit; the copies are deleted.
  Internal refactor — no behavior change.
- a1d41d6: Extract the vocabulary-neutral canvas Recording core into `@cyberdeck/deck-kit/recording` (ADR 0014,
  Candidate C1): `useRecording`, `detectMimeType`, `isRecordingSupported`, `formatElapsedTime`,
  `mimeToExtension`, and the `PREFERRED_MIME_TYPES` / `RECORDING_FPS` constants. The interface is
  reshaped to `useRecording(canvasRef, { onError?(reason), filename(ext) })` — the core emits a neutral
  `'start' | 'export'` reason each app words itself, and the filename is injected, so the MediaRecorder
  plumbing is shared while every string stays app-side. `mimeToExtension` is removed from both apps'
  `output.ts`. GLITCH still surfaces recording failures via toast; ASCII behaves as before. Internal
  refactor — no behavior change.
- 76be5f2: Extract the first shared package on the deck, `@cyberdeck/deck-kit` (ADR 0014). The visual language
  (`tokens.css` + Tailwind preset), the `cn` / `share` / `device` / `load-image-file` utils, and the
  `Button` primitive now live in the kit and are consumed as source by both apps. Internal refactor —
  no behavior change.
- 147fe0a: Migrate the remaining byte-identical `ui/` primitives into `@cyberdeck/deck-kit/ui` (ADR 0014):
  `chip`, `label`, `slider`, `toast`, `toggle-group`, `source-image-drop-zone`, `error-boundary`,
  `toast-provider`, and `mobile-bottom-sheet`, with their colocated tests. Both apps import them from
  the kit; the copies are deleted. Internal refactor — no behavior change.

## 0.1.0

### Minor Changes

- 60ed3a4: GLITCH//Studio: the control panel moves behind an **advanced** affordance. Every Effect's params and
  the Re-roll control are unchanged — they now sit inside a collapsed disclosure rather than facing
  the user on open, which is the progressive-disclosure layer the presets-first front door sits above
  (#86).

  The panel is the tweak layer, not the front door: a casual creator should reach a good-looking
  result without meeting a wall of sliders, and the sliders should still allow the ugly extremes for
  anyone who goes looking. A new `Disclosure` primitive owns the open state and the
  `aria-expanded` / `aria-controls` wiring.

- 7a8ec91: GLITCH//Studio: Block Displacement Effect, plus the Seed and Re-roll that arrange it. Rectangular
  blocks shift horizontally — the data-corruption tear — with block count and travel exposed on
  GlitchSettings and wired into the control panel. Runs first at its canonical Pipeline position, the
  structural Effect ahead of all the surface ones.

  The Seed travels **beside** GlitchSettings rather than inside it: GlitchSettings is the look, the
  Seed is the arrangement, and keeping them apart is what lets **Re-roll** hand the same look a new
  arrangement. `applyPipeline(pixels, settings, seed)` is now pure in that pair — a fixed
  settings+seed reproduces a render exactly, and `createSeed()` is the single place the app draws real
  randomness. Noise's grain hash takes the Seed as its second input, as planned when it landed, so a
  Re-roll moves the grain along with the blocks.

- 6808c38: GLITCH//Studio: Copy. A **copy** control beside PNG Export writes the glitched result to the
  clipboard as a PNG, so it pastes straight into a post or chat. Copy is PNG Export on a different
  destination — it reads the canvas as-is, which makes it work identically for a Source Image and a
  Live Source, and leaves the rAF loop untouched.

  `copyCanvasToClipboard` hands the `ClipboardItem` the _pending_ blob promise rather than an awaited
  blob: Safari resolves the write against the gesture that constructed the item, so awaiting first
  loses the gesture and the write is refused.

  Since a Copy leaves the screen unchanged, it confirms with an info toast. Clipboard failures surface
  as an error toast via the operational `AppError` flow (ADR 0006), split in two: a browser that can't
  write images at all gets pointed to Export, since "try again" is advice that can never come good.

- 3210ab0: GLITCH//Studio: Live Source and Capture. The empty state now offers the webcam beside the upload;
  activating it runs the full Pipeline over the feed in a `requestAnimationFrame` loop throttled to
  ~15fps (ADR 0002), painting the same canvas the static path does. **Capture** takes one glitched
  frame out as PNG without stopping the loop — it only reads the pixels the loop last painted.

  The shell absorbed the new Source without a second path: `renderGlitchFrame` takes a `GlitchSource`
  (image _or_ video), because one webcam frame is just another Source to sample. The Seed is held
  across frames rather than re-rolled per frame, which is what keeps the corruption pattern still
  instead of boiling — animating it stays v2.

  `useWebcamState` is a hand-copy of ASCII//Convert's lifecycle hook (ADR 0011), diverging where this
  app's domain demands it: its side-effects are **Commands**, since `Effect` here means a pure
  `PixelBuffer` transform, and the preview is deliberately **not mirrored** — the canvas _is_ the
  output, so ASCII's CSS-transform mirror would hand back a Capture that disagrees with the preview.

- 5fe6e66: GLITCH//Studio: mobile layout, an empty-state refresh, and error-toast coverage across the failure
  paths — the final polish slice.

  On mobile the controls move into a slide-up bottom sheet reached from a floating **⚙ controls**
  button, so the canvas gets the whole screen; the sheet carries the same stack the desktop aside does
  — Presets first, the per-Effect panel folded behind **advanced**. `mobile-bottom-sheet` and its
  `use-dialog` (focus trap, scroll lock, Escape, swipe-to-dismiss) are hand-copies of
  ASCII//Convert's (ADR 0011); `MobileControls` is this app's own, without ASCII's source/settings
  tabs — the Source is chosen from the empty state and cleared from the canvas, so the sheet is only
  ever the look's tweak surface.

  The empty state now presents its two ways in — drop a Source Image, or go to the Live Source — side
  by side as equal choices, rather than the webcam trailing behind an "or".

  Operational failures are surfaced consistently as toasts via the AppError flow (ADR 0006): Export,
  Capture, Copy, and a denied camera each say what went wrong instead of failing quietly.

- 61b2dc7: GLITCH//Studio: Noise Effect. Speckles the image with grain, with amount and a mono/colour tint
  exposed on GlitchSettings and wired into the control panel. Mono draws one signed perturbation per
  pixel and moves every channel by it, leaving hue alone; colour draws per channel, pulling them
  apart into chroma static. Grain derives from a positional hash rather than `Math.random`, so the
  Effect is a pure function of GlitchSettings and the Pipeline keeps its promise that no randomness
  is hidden — the draw takes the Seed as a second input once Block Displacement lands. Runs last at
  its canonical Pipeline position, the outermost surface Effect, after Scanlines.
- c2191ba: GLITCH//Studio: Pixel Sort Effect. Sorts contiguous runs of pixels by luminance within a
  threshold band — the iconic "melted" smear — with direction (horizontal/vertical), threshold and
  run length exposed on GlitchSettings and wired into the control panel. Runs at its canonical
  Pipeline position, ahead of Channel Shift.
- df89a72: GLITCH//Studio: Recording — take the glitched Live Source out as a video, not just a still frame. A
  **record** control appears beside Capture while the webcam runs, a timer counts the take, and
  **stop** hands the file over: the native share sheet on mobile, a download on desktop.

  Recording records the output canvas — the pixels the Pipeline already painted — so it is not
  datamosh, and like Capture it reads the canvas without touching the rAF loop that paints it. Frames
  are captured at the loop's own ~15fps (ADR 0002), and the container follows what the browser will
  actually encode (vp9 → vp8 → webm → mp4). Where `MediaRecorder` + `captureStream` are unsupported
  the control is absent rather than degraded — no GIF fallback (ADR 0007).

  Each take is stamped — `glitch-recording-<ms>.webm` — so a second one doesn't collide with the first.
  PNG Export and Capture keep their stable names: a Capture is one click to redo, a take isn't.

  `useRecording` is a hand-copy of ASCII//Convert's hook (ADR 0011) with one divergence: a Recording
  that can't start, or a take that can't be handed over, says so in a toast rather than doing nothing
  (ADR 0006).

- c6c7468: GLITCH//Studio: Scanlines Effect. Dims every Nth row for a CRT raster, with density and intensity
  exposed on GlitchSettings and wired into the control panel. Density rides a curated 0..1 scale
  that maps to a pixel period inside the Effect, so the slider reads the way round its name
  promises, and carries one notch per reachable period so every step of the control moves the
  raster. Runs at its canonical Pipeline position, the first of the surface Effects, after Channel
  Shift.
- 07990b2: GLITCH//Studio: app skeleton and tracer pipeline. Upload a Source Image, see a real-time
  glitched preview driven by the Channel Shift Effect, and take it out as a PNG Export. Establishes
  the pure core (`PixelBuffer`, `applyPipeline`) and the `renderGlitchFrame` imperative shell, with
  the Source scaled to fit an 800×800 sampling cap before processing.
- f02cda4: Presets + Randomize: six curated looks (VAPORWAVE, VHS, NEON RAIN, CORRUPTED, SIGNAL LOSS, KERNEL
  PANIC) are now the app's front door, with one applied on open — one click to a good-looking result,
  sliders still folded away behind `advanced`. The active Preset is highlighted and marks itself
  `(modified)` once a slider is edited, while a Re-roll keeps it highlighted: a new arrangement is not
  a customisation. Applying a Preset draws a fresh Seed, so everyone shares the look and nobody is
  handed the identical image. Randomize discovers a fresh look by picking a Preset and jittering its
  numbers within curated ranges.

### Patch Changes

- df89a72: GLITCH//Studio: the LIVE / REC badges and the clear control are readable again over a bright result.
  They sat transparent on the canvas, so they took their contrast from whatever the Pipeline had just
  painted — hot pink on a bright Noise field is close to invisible. Each now carries an opaque surface
  from the palette and holds the ratio ADR 0009 signed off.

  Translucency wouldn't have fixed it: the canvas is the user's artwork, so no alpha survives every
  backdrop. `contrast.test.ts` pins the pairs, mirroring ADR 0009's regression guard.
