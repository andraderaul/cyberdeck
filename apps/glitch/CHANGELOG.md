# @cyberdeck/glitch

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
