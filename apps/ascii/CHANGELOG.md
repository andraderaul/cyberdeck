## [1.25.0](https://github.com/andraderaul/ascii-art-converter/compare/v1.24.0...v1.25.0) (2026-07-16)

## 1.34.0

### Minor Changes

- 3d60d4d: The **Live Source** is now one act away with a **Source Image** on the canvas. Reaching the camera
  used to mean clearing the Source, landing back on the empty state and choosing it there — three acts
  to change one input, for no reason anyone had decided: the empty state was simply the only place a
  Source had ever been chosen, and the Live Source inherited that placement without anyone asking
  whether a _switch_ needed its own way in.

  `◉ live source` sits on the canvas beside `✕ clear`, and it is homed there deliberately. Both act on
  the Source, where the Control Strip is about _how_ to convert rather than _what_ to convert
  (ADR 0020) — so the switch stays out of the tab grammar. It shows only while a Source Image is what
  the canvas is converting; the Live Source's own tuning (mirror, switch camera) takes that slot on
  the other side.

  A camera that is missing or refused is answered the way the empty state has always answered it —
  attempt it, and let the refusal arrive as a toast (ADR 0006) — so there is one rule rather than two.
  What changes is what the failure leaves behind: **the loaded Source Image stays on the canvas**
  instead of being cleared out from under the message explaining why the camera never opened. A
  running Recording is stopped before the Source changes, exactly as clearing it already did.

  Fixed along the way, and reachable before this: tearing down the Live Source left the source mode
  still reading `webcam`, which made the _next_ request for it a silent no-op — so `use webcam` on the
  empty state did nothing at all after a Live Source had once been cleared.

## 1.33.0

### Minor Changes

- 22134d4: Show each Preset as what it does to the Source that is loaded, so the PRESETS tab is browsed by look
  rather than by name. `Demoscene`, `Silkscreen`, `Core Dump` and `Blueprint` are good names and not
  one of them says what will appear — so the front door was a browsing loop: pick, look, pick again.

  Every chip now carries a small conversion of the loaded Source in that Preset's own Charset, Color
  Mode, Dithering and Edge Glyph setting. It is the ordinary pipeline at a fraction of the cells, not a
  second one, and the settings it converts with are the Preset's own snapshot untouched — so a
  thumbnail cannot advertise a look the chip does not apply. The picture is rendered at twice the box
  it is drawn in and scaled down, which is what makes it the canvas seen small rather than a canvas
  configured differently: every glyph keeps the size the Preset's Resolution gives it.

  A Source Image is converted once and remembered for the session — it is immutable, so its seven
  thumbnails are too — and a Live Source is frozen into a single still rather than re-derived at 15fps,
  so all seven chips advertise one instant and the loop pays nothing.

- 0183214: Say what each Export costs, under the control that charges it. The OUT tab offered `export png`,
  `export txt` and `export html` as three equal buttons, and they are not equal: each one throws away
  a different half of the result, and nothing on screen said which half before the click.

  The distinction was never missing, only misfiled — `CONTEXT.md`'s **HTML Export** entry has stated
  it plainly for as long as that Export has existed ("o **PNG Export** guarda a cor e destrói o texto,
  o **TXT Export** guarda o texto e larga a cor"), and the sentence had simply never left the
  glossary. It now reads under the buttons: PNG keeps the colour and hands back nothing selectable,
  TXT keeps selectable text and drops the colour, HTML keeps both and opens with no network.

  Inline in the tab rather than behind an export terminal. A modal would charge one click to read what
  fits under a button and a second to act, so the one-click path to each Export survives untouched —
  and the copy is carried to a screen reader on `aria-describedby`, which otherwise still heard three
  identical buttons. The PNG scale chips keep their place above the row, and the Live Source's Capture
  and Record are unchanged.

### Patch Changes

- c4aef50: Lay the Suggestion out as one chip per proposed field. The decision the panel puts in front of the
  user is "do I want these instead of what I have", and until now the proposed ConversionSettings sat
  in a label-over-value grid that had to be read column by column before that question could be
  answered. Each axis now stands on its own — `charset: braille`, `dithering: bayer`,
  `color mode: neon` — as a wrapping list of static chips, so the apply is taken against a visible
  inventory rather than a paragraph.

  The chips are the same seven the panel always drew, off the same map keyed on `ConversionSettings`
  itself: nothing was added that the payload does not carry. The mock this came from also drew a
  `STATUS CODE / THREAT LEVEL` band over the reading, and the Providers return neither — a readout
  with no data behind it is worse than the prose it would replace, so it is not here.

  Nothing about applying moved. The settings still never travel on their own, `apply` still takes the
  whole suggestion or none of it, and the `revert` in the PRESETS tab still expires on the user's
  first edit of their own.

- 1f20586: The header reads as the deck's display type.

  The wordmark sat at a body size in the body face, so the one line that names the program read like
  the copy underneath it. It, its `image → ascii art` subtitle and the header's controls now take
  `--font-display` at the tracking the deck's uppercase readouts use, and the subtitle joins the
  wordmark in uppercase. From `sm` up the wordmark also climbs one step, to 18px.

  Presentational only. Behaviour, layout and the control set are unchanged, the labels stay lowercase
  on the controls, the 44x44 targets are untouched, and no accessible name moves. The palette is
  deliberately untouched too — a lighter accent is an eighth Theme under ADR 0024 and a decision of
  its own.

  Below `sm` the header keeps the tracking it already shipped: it is one row carrying the wordmark
  and both controls there, and 0.18em across them is ~30px that row does not have at 320px.

- Updated dependencies [3f1a48f]
  - @cyberdeck/deck-kit@0.7.1

## 1.32.0

### Minor Changes

- 949d6ff: Curate three more Presets, one for each axis the front door could not reach. The four the app
  shipped were chosen before the converter had a shape axis, a Dithering or an image-derived palette,
  so every one of them spelled all three off and nothing in the PRESETS tab led a casual user to any
  of them.

  **Blueprint** is the Edge Glyph look: a sparse round ramp under a high contrast and a low
  brightness, so the shading falls away to blank and dots and the directional strokes are what the eye
  reads. It draws a Source's contours instead of shading its surfaces — a landscape comes back as
  ridge lines, a graphic as hollow letterforms.

  **Core Dump** is the Dithering look, and the clearest case of a coarse Charset being rescued rather
  than decorated: `binary` is three glyphs, so undithered it floors a photograph into blank, `0` and
  `1` and most of a picture lands in blank. The ordered tile spends those two boundaries across
  sixteen cells and the same three characters carry continuous tone — a picture surfacing out of a
  page of ones and zeros.

  **Silkscreen** is the `adaptive` look, and the only chip that paints in no colour of the deck's: the
  palette comes off the Source, flattened onto `blocks` so a filled cell reads as a field of ink. Its
  brightness is a coverage decision rather than a stylistic one — a cell that takes the Charset's
  opening space paints nothing, and a look whose subject is the Source's own palette cannot afford to
  drop its shadows.

  The original four are untouched, and the new three are appended rather than interleaved so the
  opening chip stays the face the program has always opened with.

## 1.31.1

### Patch Changes

- c9e4f3e: The AI surface follows its adapters off the first-paint path.

  AI Analysis is optional and off by default — the key stays on the user's own device and, without an
  AI Config, the Analyze control is not even rendered — which is why the three provider adapters have
  loaded through a dynamic `import()` since the feature landed. The two modals that only exist beside
  them, and the service that picks an adapter, did not follow. They do now: a visitor who never
  configures a provider no longer downloads any of it, and the entry chunk drops from 75.97 kB
  gzipped to 72.63.

  Nothing about the surface itself changes. The AI Config modal opens fully formed rather than as a
  frame with its contents still arriving, and a scan still answers its click instantly — the scanning
  frame it opens on is drawn from the entry chunk, so the modal's own chunk loads behind it.

## 1.31.0

### Minor Changes

- d97b7fd: Add the `adaptive` Color Mode: the palette is quantized from the Source itself, so the art comes back recoloured in its own colours rather than in a preset's. The colour cube is cut into a fixed 4×4×4 lattice and each cell is painted the mean of the bin it falls in — never the nearest of a ranked few, which would be a Voronoi over data-dependent means and would move the partition with the picture. Because the bin edges are constants, the palette is recomputed on every frame, a Live Source included: one held from a webcam's first frame would paint the whole session in the colours of one dark, warming-up frame. Preview, PNG Export, TXT Export and HTML Export all read the one grid, so they agree by construction.
- 8a7b8a2: HTML Export: the result as coloured, selectable text.

  PNG Export keeps the colour and destroys the text; TXT Export keeps the text and drops the colour.
  The OUT tab now carries a third format that keeps both — a self-contained HTML document where every
  cell is real text inside a `<pre>`, painted with the colour its Color Mode gave it. It embeds its
  own font stack and fetches nothing, so a viewer opening it offline sees what the preview showed, and
  the art selects and copies with its line breaks and column alignment intact.

- beb3fc4: ASCII//Convert installs, and it runs with the network off. It always could — nothing here fetches
  anything at runtime, and the conversion has only ever happened on your machine — but the browser was
  never told to keep the bytes. Now it is: a web app manifest makes the program installable under its
  own mark, and a service worker precaches the whole shell on the first visit, so the second one opens
  and converts with no network at all. Installed, it opens standalone on the same near-black the page
  paints.

  A new version never takes over a session in progress. It installs quietly behind the one you are
  using — a Recording in flight is never yanked — and runs the next time you open the program, or
  right away if you take the offer that appears under the header. The AI Analysis call is left alone
  entirely: it is not this deploy's, so the worker never touches it, and no reply of your provider's
  is ever served from a cache.

- bbab400: Dithering: a Bayer or Floyd–Steinberg pass over the sampled grid before the Charset buckets a cell, so a coarse Charset carries a gradient instead of banding it — pick it from the EDIT tab, `none` by default and unchanged from today.
- 473aeb2: Edge Glyphs: where the local gradient reads as a contour, the cell takes a directional character instead of a brightness one — a shape axis beside the Charset's ramp, opt-in from the EDIT tab and off by default.
- 5fa1e1b: A Charset can now be authored. The EDIT tab's charset panel ends in a field where you write your
  own ramp, darkest to lightest, and the canvas follows every keystroke — the converter always
  accepted any such string and only the UI withheld it. A ramp under two characters is refused with
  the reason rather than applied, so the picture keeps the last Charset that read cleanly instead of
  flickering through half-typed ones, and the ramp is indexed by glyph rather than by UTF-16 unit, so
  a character past the BMP arrives whole in the preview and in all three Exports.
- 337f442: The AI Analysis now proposes the ConversionSettings for the image it just described, on the same
  round trip: charset, edge glyphs, color mode, resolution, brightness and contrast, laid out in the
  scan modal with one `apply`. Nothing moves on its own — applying is the click, and what it displaced
  comes back from a `revert` chip in the PRESETS tab until you start editing on top of it. A
  suggestion naming a Charset or Color Mode that doesn't exist, or a number the sliders couldn't
  reach, is refused rather than coerced — the scan still reports, it simply offers nothing.

### Patch Changes

- bf2b5e9: A tab, an install prompt and a shared link now show ASCII//Convert rather than the stock Vite mark
  and a bare URL. The program has its own favicon (the `▓` density block, drawn so it survives 16px)
  in the sizes a browser tab, an iOS home screen and an install prompt each ask for, a description
  written from the reader's side, and an Open Graph / Twitter card whose picture is a frame of what
  the program does: a lit sphere sampled onto the `.:-=+*#%@` Charset. `theme-color` matches the
  Theme the pre-paint script paints, so the browser chrome no longer flashes a different colour.
- b39f63d: The hidden sampling canvas (ADR 0001) is cleared before the Source is drawn into it. Canvas 2D's
  `drawImage` composites source-over, so a Source carrying an alpha channel blended onto whatever the
  previous conversion had left there, and the cells depended on how many renders came before rather
  than on the ConversionSettings alone. An opaque Source could never drift this way, which is what
  kept it hidden.
- Updated dependencies [5df832a]
  - @cyberdeck/deck-kit@0.6.0

## 1.30.5

### Patch Changes

- 199721a: The AI Config mark is `◇`, hollow to AI Analyze's filled `◈` — the program's two AI surfaces now
  read as one family. It replaces `⚿` (SQUARED KEY), which was never missing from the font as it
  looked: it drew correctly, but it is a boxed glyph whose meaning lives in fine interior detail, and
  at the 11px the header renders it at, the box outline is all that survives — indistinguishable from
  the empty rectangle a browser draws for a glyph it _doesn't_ have.

  The mark is now `aria-hidden` at both callsites, so the header button and the modal heading name
  themselves in words. Unhidden, `⚿` had been joining the accessible name, and a screen reader opened
  the button with "squared key".

- 0dc87b9: `Chip` holds 44px on both axes, not just height. It pays for its target in layout rather than in an
  overlay, because it stands in a scrolling row of its own kind where a centred overlay would reach
  into its neighbour's — but only `min-h` was ever spelled, and a Chip is as wide as its label. Three
  in the deck were short enough to sit under the target: ASCII//Convert's `1×` / `2×` / `4×` PNG scale
  chips at 31px, GLITCH//Studio's `VHS` Preset at 38px, and its add-effect `+` at 29px above `sm`.

  `justify-center` comes along because a stretched Chip's slack would otherwise fall entirely to one
  side of a label that no longer fills it.

- Updated dependencies [0dc87b9]
  - @cyberdeck/deck-kit@0.5.2

## 1.30.4

### Patch Changes

- 81b8731: Icon-only controls draw their glyph at 18px, from one constant (`ICON_GLYPH_SIZE`). The 44x44 target
  landed without the mark inside it changing, so a control could be fully operable and still read as
  unpressable — an 11px glyph adrift in a 44px box. Covers the kit's tooltip trigger, modal close and
  toast dismiss, GLITCH's duplicate / remove / add and its Randomize and Re-roll below `sm`, and
  ASCII//Convert's AI-config dismiss.

  Controls over the canvas are deliberately untouched: there the backdrop is the user's artwork
  (ADR 0013) or the piece itself (ADR 0021), and growing that chrome charges the work for its own
  controls — the same reason those controls buy their target as an overlay instead of in layout.

- Updated dependencies [81b8731]
  - @cyberdeck/deck-kit@0.5.1

## 1.30.3

### Patch Changes

- f79c3fe: Sliders show keyboard focus again. The tall invisible hit area that makes them easy to grab also
  removed the focus ring, with nothing in its place, so tabbing through the EDIT panel gave no sign of
  where you were. The indicator now sits on the thumb.
- f79c3fe: The canvas overlay's controls — mirror, switch camera, clear, and the REC badge that stops a take —
  now answer a 44x44 pointer target. They stood at ~32px tall, and the icon-only ones at ~27px wide on
  touch.

  They stand on the artwork, so the height comes from an invisible overlay and the chips draw exactly
  as they did before; only the icon-only ones take real width, which no height overlay could give them.

- Updated dependencies [f79c3fe]
- Updated dependencies [f79c3fe]
- Updated dependencies [f79c3fe]
  - @cyberdeck/deck-kit@0.5.0

## 1.30.2

### Patch Changes

- 57678dc: The `about` trigger leaves the header for a new ultra-thin footer on the empty state. The footer
  also carries the `source code →` and `author →` links — attribution that used to hide inside the
  About modal. It shows only before a Source loads: once the Control Strip owns the bottom edge, a
  footer under it would just invite a mis-tap. The modal keeps the longer narrative (the intro, `ai
scan`, and `made with ai`), so the header sheds a secondary control and the About content splits by
  how often you reach for it.
- Updated dependencies [57678dc]
  - @cyberdeck/deck-kit@0.4.0

## 1.30.1

### Patch Changes

- 4886d40: The Theme picker moves to the end of the header row, after `about` and the AI key control. It is the
  least program-specific thing up there — it changes what ASCII//Convert is drawn in, not what the
  conversion does — so it reads and tabs last, and the program's own controls come first.
- Updated dependencies [4886d40]
  - @cyberdeck/deck-kit@0.3.2

## 1.30.0

### Minor Changes

- f103199: ASCII//Convert's Theme control stops cycling and becomes a popover (ADR 0024): the header trigger
  now opens a panel listing the whole roster — seven Themes, up from three — so a Theme is picked by
  name rather than discovered by pressing. The pre-paint script names the full roster in order, so the
  chosen Theme still applies before first paint with no flash of the default.

### Patch Changes

- Updated dependencies [f103199]
  - @cyberdeck/deck-kit@0.3.0

## 1.29.0

### Minor Changes

- abed3c7: ASCII//Convert gains the deck's Theme control, in the header beside `about` and the AI key
  (ADR 0024).

  The Color Modes are untouched. A Theme is what the program is drawn in; a Color Mode is what the
  conversion paints, and picking one cannot change art you have already made. It is also why no Theme
  is called `matrix` or `neon`: this is the only program where both controls are visible, and they
  must not read as one setting shown twice.

  Also fixes the default modal's background, which carried `bg-elevated` — not a class, so the modal
  has been transparent since it was written.

  The Neural Scan's threat chips follow the Theme too. They named hues directly as inline styles —
  the one spelling the class-level promotion could not see — so they would have kept `ice`'s pink and
  cyan on a green or grey field. Their washes are now mixed from the role's own colour.

### Patch Changes

- Updated dependencies [abed3c7]
  - @cyberdeck/deck-kit@0.2.0

## 1.28.2

### Patch Changes

- 30602c5: Stop the page from scrolling sideways in the EDIT tab's charset and color-mode tools. Their
  `<fieldset>` wrappers carry the UA rule `min-inline-size: min-content`, so they refused to shrink
  below their chip rows and pushed the document past the viewport instead of letting the rows scroll —
  charset by ~484px on mobile and even ~74px at desktop widths (its five category groups are wider than
  the panel), color mode by ~63px on mobile. Adding `min-w-0` to both fieldsets lets them shrink to the
  panel width so the chips scroll in place.

## 1.28.1

### Patch Changes

- a09ed7c: Stop the EDIT tab from jumping each time you switch tools. The params panel reserved only a `min-h`
  floor, but the tools render different heights — color mode's two chip rows are the tallest, charset
  next, the sliders shortest — so switching tool changed the panel's height and reflowed the whole
  strip. Unlike GLITCH's editor this shifted at every breakpoint, not just mobile: charset and color
  mode fill the panel with their own chip grids at all widths and never collapse into the slider
  group's single row. The panel now reserves the tallest tool's height so it holds steady across
  switches.

## 1.28.0

### Minor Changes

- 4bd889a: ASCII//Convert adopts the Control Strip (ADR 0020), the anatomy proven in GLITCH//Studio: a
  horizontal, bottom-anchored surface at both breakpoints, opening on PRESETS with the canvas visible
  throughout. The EDIT tab carries every ConversionSettings control as tool chips — charset, color
  mode, resolution, brightness, contrast — with the focused tool's control in the panel above the
  row, and the three sliders reading as one group on desktop.

  The legacy control surfaces are gone with it: the desktop aside, the mobile bottom sheet and its
  floating trigger, and the `advanced` Disclosure. Both programs now share one control grammar.

- 4bd889a: ASCII//Convert's OUT tab (ADR 0020) unifies the two per-source bars into one surface with source
  gating: a Source Image offers PNG and TXT Export plus AI Analysis, a Live Source offers Capture,
  Recording and AI Analysis. The AI config banner is rehomed inside OUT, beside the Analysis it
  advertises, and its configure flow still opens the API key modal.

  Recording's start and stop now live apart, as in GLITCH: start is a control in OUT, stop is the
  canvas REC badge, which becomes tappable and carries the elapsed timer — so a take survives a tab
  switch and is stoppable from anywhere.

  ExportBar and LiveSourceBar are gone. A full ASCII session — choose a Source, apply a Preset, tune
  the conversion, Export/Capture/Analyze — now runs in the Strip alone, and both programs share one
  control grammar.

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

## 1.27.1

### Patch Changes

- 2c5869d: mirror now flips the sampled pixels instead of the visible canvas, so the PNG and TXT Exports match
  the mirrored preview (ADR 0016). A mirrored TXT Export has each row's characters reversed — the
  honest WYSIWYG result of a real flip.

## 1.27.0

### Minor Changes

- 4148beb: Converge the control panel onto GLITCH//Studio's presets-first model (ADR 0016). Presets are now the front door, always visible, and the per-setting controls (resolution, color mode, charset, brightness, contrast) fold away behind an `advanced` disclosure that starts closed — matching GLITCH on both the desktop sidebar and the mobile controls sheet. The presets move into their own `PresetPicker` component and the modified marker now spells "(modified)" into the chip's accessible name.

## 1.26.0

### Minor Changes

- 29f8558: Converge on GLITCH//Studio's single Source-entry model (ADR 0015). The always-present sidebar upload/webcam panel is removed — the empty-state hero is now the one place a Source is chosen, and the live webcam controls (mirror, switch-camera) move onto the canvas overlay beside clear. The mobile controls sheet drops its source/settings tabs. The empty-state hero is now the shared deck-kit component and carries a privacy tagline.

## 1.25.1

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

### Features

- **ascii:** trim TXT Export to the fit region ([#66](https://github.com/andraderaul/ascii-art-converter/issues/66)) ([#69](https://github.com/andraderaul/ascii-art-converter/issues/69)) ([64106b8](https://github.com/andraderaul/ascii-art-converter/commit/64106b8c807b2f9a4ec9297e8125b3e3ddf911b1)), closes [#65](https://github.com/andraderaul/ascii-art-converter/issues/65)

## [1.24.0](https://github.com/andraderaul/ascii-art-converter/compare/v1.23.0...v1.24.0) (2026-07-16)

### Features

- **canvas:** clear-source control + LIVE badge overlay ([#68](https://github.com/andraderaul/ascii-art-converter/issues/68)) ([92ff123](https://github.com/andraderaul/ascii-art-converter/commit/92ff1230b60ba17fb644c206cce0153e7a1c7b6e))

## [1.23.0](https://github.com/andraderaul/ascii-art-converter/compare/v1.22.1...v1.23.0) (2026-07-16)

### Features

- **ascii:** contain-fit preserving Source aspect ratio ([#65](https://github.com/andraderaul/ascii-art-converter/issues/65)) ([#67](https://github.com/andraderaul/ascii-art-converter/issues/67)) ([eb46a1e](https://github.com/andraderaul/ascii-art-converter/commit/eb46a1e66fe8b6fab8300dac005591d9a9b9e77e))

### Code Refactoring

- **arch:** adapter contracts, use-ai-config silent failures, render-frame extraction ([#64](https://github.com/andraderaul/ascii-art-converter/issues/64)) ([c150040](https://github.com/andraderaul/ascii-art-converter/commit/c150040eaa31a87313a070806e27d75e8dcd4db1))

## [1.22.1](https://github.com/andraderaul/ascii-art-converter/compare/v1.22.0...v1.22.1) (2026-05-30)

### Bug Fixes

- leak test ([756980f](https://github.com/andraderaul/ascii-art-converter/commit/756980f13270e0f7e85e8c8f0006aa98bb5b9aa5))

### Code Refactoring

- **ai:** shared adapter helpers + provider Record map ([#61](https://github.com/andraderaul/ascii-art-converter/issues/61)) ([70ca429](https://github.com/andraderaul/ascii-art-converter/commit/70ca429deb69380964fdd0a9acfeb5cf74c5d8a2))
- **ui:** ApiKeyModal Button adoption + HeaderButton primitive ([#62](https://github.com/andraderaul/ascii-art-converter/issues/62)) ([0aaf31f](https://github.com/andraderaul/ascii-art-converter/commit/0aaf31fe4a925402eb25828be703a15d79b34a57)), closes [#53](https://github.com/andraderaul/ascii-art-converter/issues/53) [#54](https://github.com/andraderaul/ascii-art-converter/issues/54)
- **ui:** split DownloadBar into LiveSourceBar + ExportBar ([#63](https://github.com/andraderaul/ascii-art-converter/issues/63)) ([29b46fa](https://github.com/andraderaul/ascii-art-converter/commit/29b46fa49507eddb6941607967f3ab6d73d4f400))

## [1.22.0](https://github.com/andraderaul/ascii-art-converter/compare/v1.21.0...v1.22.0) (2026-05-22)

### Features

- **hooks:** extract useDialog and adopt in Modal + MobileBottomSheet ([#60](https://github.com/andraderaul/ascii-art-converter/issues/60)) ([171ed3d](https://github.com/andraderaul/ascii-art-converter/commit/171ed3d3e9f00d1f8d37cede0b81a63559e2d362)), closes [#49](https://github.com/andraderaul/ascii-art-converter/issues/49)

## [1.21.0](https://github.com/andraderaul/ascii-art-converter/compare/v1.20.0...v1.21.0) (2026-05-22)

### Features

- **ui:** SourceImageDropZone primitive + WebcamState type export ([#59](https://github.com/andraderaul/ascii-art-converter/issues/59)) ([e903868](https://github.com/andraderaul/ascii-art-converter/commit/e90386861a816cff59a25e23ee053aefeb2575cf)), closes [#52](https://github.com/andraderaul/ascii-art-converter/issues/52) [#48](https://github.com/andraderaul/ascii-art-converter/issues/48)

### Code Refactoring

- **analysis-modal:** unify THREAT_META record and extract ScanErrorState component ([#57](https://github.com/andraderaul/ascii-art-converter/issues/57)) ([a6124f8](https://github.com/andraderaul/ascii-art-converter/commit/a6124f809a4a76a4a72a63c9bf34c017b3893330))

## [1.20.0](https://github.com/andraderaul/ascii-art-converter/compare/v1.19.0...v1.20.0) (2026-05-21)

### Features

- **ui:** Chip primitive + DownloadBar cleanup ([#56](https://github.com/andraderaul/ascii-art-converter/issues/56)) ([bccabea](https://github.com/andraderaul/ascii-art-converter/commit/bccabeaf856f295f0ad96545d53a44edcb8ed439)), closes [#47](https://github.com/andraderaul/ascii-art-converter/issues/47) [#55](https://github.com/andraderaul/ascii-art-converter/issues/55)

### Documentation

- **claude:** fix and complete CLAUDE.md key files ([1a4f06d](https://github.com/andraderaul/ascii-art-converter/commit/1a4f06db33f7eec9bdc141580c343c412c889565))
- **readme:** add missing ADRs 0006–0009 to architectural decisions table ([3c58cc8](https://github.com/andraderaul/ascii-art-converter/commit/3c58cc820e43a4ee40fe061a594e75284902f807))
- **readme:** remove project structure section ([299ea63](https://github.com/andraderaul/ascii-art-converter/commit/299ea63e0c8b32c467cc164ba40b7345e37de9a1))

## [1.19.0](https://github.com/andraderaul/ascii-art-converter/compare/v1.18.0...v1.19.0) (2026-05-21)

### Features

- **api-key-modal:** show provider key-generation link below select ([#44](https://github.com/andraderaul/ascii-art-converter/issues/44)) ([4658580](https://github.com/andraderaul/ascii-art-converter/commit/465858025dac1f12ef9d3f46fcdf560ef47b386a)), closes [#7](https://github.com/andraderaul/ascii-art-converter/issues/7)

## [1.18.0](https://github.com/andraderaul/ascii-art-converter/compare/v1.17.3...v1.18.0) (2026-05-21)

### Features

- **control-panel:** label preset section and improve modified indicator ([#45](https://github.com/andraderaul/ascii-art-converter/issues/45)) ([59b3b7c](https://github.com/andraderaul/ascii-art-converter/commit/59b3b7cfaa2e632a208936dec23d7e70f981273f)), closes [#39](https://github.com/andraderaul/ascii-art-converter/issues/39) [#ffe600](https://github.com/andraderaul/ascii-art-converter/issues/ffe600)

## [1.17.3](https://github.com/andraderaul/ascii-art-converter/compare/v1.17.2...v1.17.3) (2026-05-21)

### Bug Fixes

- **contrast:** wcag aa audit — replace text-muted with text-fg-subtle ([#43](https://github.com/andraderaul/ascii-art-converter/issues/43)) ([6f8e6e4](https://github.com/andraderaul/ascii-art-converter/commit/6f8e6e4982ce971f8594a7badf5f70325d787f67)), closes [#38](https://github.com/andraderaul/ascii-art-converter/issues/38) [#7e7eaf](https://github.com/andraderaul/ascii-art-converter/issues/7e7eaf)

## [1.17.2](https://github.com/andraderaul/ascii-art-converter/compare/v1.17.1...v1.17.2) (2026-05-21)

### Bug Fixes

- route EmptyStateHero webcam button through switchMode ([#40](https://github.com/andraderaul/ascii-art-converter/issues/40)) ([e1153c6](https://github.com/andraderaul/ascii-art-converter/commit/e1153c6e8c561175cebcd56a27619723c5cff7a2)), closes [#36](https://github.com/andraderaul/ascii-art-converter/issues/36)

## [1.17.1](https://github.com/andraderaul/ascii-art-converter/compare/v1.17.0...v1.17.1) (2026-05-21)

### Bug Fixes

- **about-modal:** apply neutral register to section headings ([#42](https://github.com/andraderaul/ascii-art-converter/issues/42)) ([95f7f89](https://github.com/andraderaul/ascii-art-converter/commit/95f7f89e72cc62cef2a56b573f9b9c20752cda00)), closes [#8](https://github.com/andraderaul/ascii-art-converter/issues/8)

## [1.17.0](https://github.com/andraderaul/ascii-art-converter/compare/v1.16.1...v1.17.0) (2026-05-21)

### Features

- **banner:** add AI Config banner near DownloadBar when no AI Config is set ([#41](https://github.com/andraderaul/ascii-art-converter/issues/41)) ([cef88d1](https://github.com/andraderaul/ascii-art-converter/commit/cef88d12fb91746506ebbcf5a1b88333a3c09035)), closes [#6](https://github.com/andraderaul/ascii-art-converter/issues/6)

## [1.16.1](https://github.com/andraderaul/ascii-art-converter/compare/v1.16.0...v1.16.1) (2026-05-20)

### Bug Fixes

- hide DownloadBar when no source is loaded ([c73500f](https://github.com/andraderaul/ascii-art-converter/commit/c73500f7de463ad521a988437f09f19c0663871d))

## [1.16.0](https://github.com/andraderaul/ascii-art-converter/compare/v1.15.1...v1.16.0) (2026-05-20)

### Features

- **header:** 44px touch target + configure-ai pill border ([#32](https://github.com/andraderaul/ascii-art-converter/issues/32)) ([3588eef](https://github.com/andraderaul/ascii-art-converter/commit/3588eeff6c7febdef961d9d8d593972794ed8a25))

## [1.15.1](https://github.com/andraderaul/ascii-art-converter/compare/v1.15.0...v1.15.1) (2026-05-20)

### Bug Fixes

- expand header button touch targets ([#23](https://github.com/andraderaul/ascii-art-converter/issues/23)) ([59ccf2c](https://github.com/andraderaul/ascii-art-converter/commit/59ccf2cb35bdd2a9741d7abdedb8de05bf94eca7))

## [1.15.0](https://github.com/andraderaul/ascii-art-converter/compare/v1.14.0...v1.15.0) (2026-05-20)

### Features

- **presets:** named ConversionSettings presets with modified indicator ([#30](https://github.com/andraderaul/ascii-art-converter/issues/30)) ([317de7e](https://github.com/andraderaul/ascii-art-converter/commit/317de7ef6ae8cc01407f4a35f4f7410be2d1c51d))
- **toast:** info/warn/error variants + neutral error copy ([#33](https://github.com/andraderaul/ascii-art-converter/issues/33)) ([a02aeb2](https://github.com/andraderaul/ascii-art-converter/commit/a02aeb2aa34409d4d41b7cfc762a3e98af50194f))

## [1.14.0](https://github.com/andraderaul/ascii-art-converter/compare/v1.13.0...v1.14.0) (2026-05-20)

### Features

- **a11y:** slider aria-valuetext, threat icon, contrast fix ([#31](https://github.com/andraderaul/ascii-art-converter/issues/31)) ([695e404](https://github.com/andraderaul/ascii-art-converter/commit/695e4047d9aa2fe84cc54eaba20558f3000bdce5)), closes [#9898c0](https://github.com/andraderaul/ascii-art-converter/issues/9898c0) [#6b6b9a](https://github.com/andraderaul/ascii-art-converter/issues/6b6b9a)
- **download-bar:** png scale picker (1×/2×/4×) + output resolution ([#35](https://github.com/andraderaul/ascii-art-converter/issues/35)) ([ea475ea](https://github.com/andraderaul/ascii-art-converter/commit/ea475ea964c80597eba6598d131ab4e6162875b6))

## [1.13.0](https://github.com/andraderaul/ascii-art-converter/compare/v1.12.0...v1.13.0) (2026-05-20)

### Features

- **modal:** escape-to-close and focus trap ([#34](https://github.com/andraderaul/ascii-art-converter/issues/34)) ([017db3f](https://github.com/andraderaul/ascii-art-converter/commit/017db3fe0c07e7426bdd307c92214ccfaeffea49))

## [1.12.0](https://github.com/andraderaul/ascii-art-converter/compare/v1.11.0...v1.12.0) (2026-05-19)

### Features

- **button:** add record variant; separate live-initiation from export ([#29](https://github.com/andraderaul/ascii-art-converter/issues/29)) ([640a9df](https://github.com/andraderaul/ascii-art-converter/commit/640a9df0f0df7098f99ada4e629d0f3a8a15caf3)), closes [#14](https://github.com/andraderaul/ascii-art-converter/issues/14)

## [1.11.0](https://github.com/andraderaul/ascii-art-converter/compare/v1.10.0...v1.11.0) (2026-05-19)

### Features

- **upload-zone:** expose mirror toggle in webcam panel ([#28](https://github.com/andraderaul/ascii-art-converter/issues/28)) ([6422a85](https://github.com/andraderaul/ascii-art-converter/commit/6422a854cad50d9b0b857e263065f208a6f61242)), closes [#12](https://github.com/andraderaul/ascii-art-converter/issues/12)

## [1.10.0](https://github.com/andraderaul/ascii-art-converter/compare/v1.9.0...v1.10.0) (2026-05-19)

### Features

- **control-panel:** inline info tooltips for all five controls ([#27](https://github.com/andraderaul/ascii-art-converter/issues/27)) ([3342c29](https://github.com/andraderaul/ascii-art-converter/commit/3342c299ff566dff9eacb3572c9eb92b0b687b3f)), closes [#11](https://github.com/andraderaul/ascii-art-converter/issues/11)

## [1.9.0](https://github.com/andraderaul/ascii-art-converter/compare/v1.8.0...v1.9.0) (2026-05-19)

### Features

- **recording:** split timer pill from stop, add DOM REC overlay ([#25](https://github.com/andraderaul/ascii-art-converter/issues/25)) ([3b26549](https://github.com/andraderaul/ascii-art-converter/commit/3b2654924d77c48f53bf8f89bba1693702a5eba5)), closes [#9](https://github.com/andraderaul/ascii-art-converter/issues/9)

## [1.8.0](https://github.com/andraderaul/ascii-art-converter/compare/v1.7.0...v1.8.0) (2026-05-19)

### Features

- **slider:** default marker, marks ticks, and double-click reset ([#24](https://github.com/andraderaul/ascii-art-converter/issues/24)) ([85ec903](https://github.com/andraderaul/ascii-art-converter/commit/85ec903230b2ff54655d5f01bb4c7196f5f90eb7)), closes [#8](https://github.com/andraderaul/ascii-art-converter/issues/8)

### Documentation

- add voice and tone guideline (cyberpunk vs neutral registers) ([#26](https://github.com/andraderaul/ascii-art-converter/issues/26)) ([b1ed68d](https://github.com/andraderaul/ascii-art-converter/commit/b1ed68d8d5f1961d68e32221207b0089e6b52aa6)), closes [#10](https://github.com/andraderaul/ascii-art-converter/issues/10)

## [1.7.0](https://github.com/andraderaul/ascii-art-converter/compare/v1.6.0...v1.7.0) (2026-05-19)

### Features

- grouped Charset picker and Color Mode swatches ([#22](https://github.com/andraderaul/ascii-art-converter/issues/22)) ([f90a44b](https://github.com/andraderaul/ascii-art-converter/commit/f90a44b999d1b7b53fea80798f334e07e7936db7)), closes [#4](https://github.com/andraderaul/ascii-art-converter/issues/4) [#5](https://github.com/andraderaul/ascii-art-converter/issues/5)

## [1.6.0](https://github.com/andraderaul/ascii-art-converter/compare/v1.5.0...v1.6.0) (2026-05-19)

### Features

- mobile bottom-sheet with Source/Settings tabs ([#21](https://github.com/andraderaul/ascii-art-converter/issues/21)) ([6f2abfc](https://github.com/andraderaul/ascii-art-converter/commit/6f2abfc2c54d7f59abb5f2563b2a260478fe2ffa)), closes [#3](https://github.com/andraderaul/ascii-art-converter/issues/3) [#1](https://github.com/andraderaul/ascii-art-converter/issues/1) [#4](https://github.com/andraderaul/ascii-art-converter/issues/4) [#2](https://github.com/andraderaul/ascii-art-converter/issues/2) [#3](https://github.com/andraderaul/ascii-art-converter/issues/3) [#6](https://github.com/andraderaul/ascii-art-converter/issues/6) [#7](https://github.com/andraderaul/ascii-art-converter/issues/7) [#5](https://github.com/andraderaul/ascii-art-converter/issues/5) [#8](https://github.com/andraderaul/ascii-art-converter/issues/8)

## [1.5.0](https://github.com/andraderaul/ascii-art-converter/compare/v1.4.0...v1.5.0) (2026-05-19)

### Features

- empty-state hero with dual CTA in canvas area ([#20](https://github.com/andraderaul/ascii-art-converter/issues/20)) ([8b17ea9](https://github.com/andraderaul/ascii-art-converter/commit/8b17ea972814ccb7c07ed88296274ae1281da032)), closes [#2](https://github.com/andraderaul/ascii-art-converter/issues/2)

## [1.4.0](https://github.com/andraderaul/ascii-art-converter/compare/v1.3.1...v1.4.0) (2026-05-18)

### Features

- add synthwave and matrix-dual dual-color ([c807a8c](https://github.com/andraderaul/ascii-art-converter/commit/c807a8ca6433f3e285e1d94cb0f55d013e3881ce)), closes [#1](https://github.com/andraderaul/ascii-art-converter/issues/1) [#ccff00](https://github.com/andraderaul/ascii-art-converter/issues/ccff00) [#ff0099](https://github.com/andraderaul/ascii-art-converter/issues/ff0099) [#ff4500](https://github.com/andraderaul/ascii-art-converter/issues/ff4500) [#0066ff](https://github.com/andraderaul/ascii-art-converter/issues/0066ff) [#00ffff](https://github.com/andraderaul/ascii-art-converter/issues/00ffff) [#ff00ff](https://github.com/andraderaul/ascii-art-converter/issues/ff00ff) [#0066ff](https://github.com/andraderaul/ascii-art-converter/issues/0066ff) [#ff4500](https://github.com/andraderaul/ascii-art-converter/issues/ff4500) [#ff4500](https://github.com/andraderaul/ascii-art-converter/issues/ff4500) [#0066ff](https://github.com/andraderaul/ascii-art-converter/issues/0066ff)

## [1.3.1](https://github.com/andraderaul/ascii-art-converter/compare/v1.3.0...v1.3.1) (2026-05-05)

### Bug Fixes

- **modal:** fix overlay appearing completely dark due to same color as background ([ab85c02](https://github.com/andraderaul/ascii-art-converter/commit/ab85c023e7ae1a56131696f5461975f354008bb3)), closes [#0a0a0f](https://github.com/andraderaul/ascii-art-converter/issues/0a0a0f)

## [1.3.0](https://github.com/andraderaul/ascii-art-converter/compare/v1.2.3...v1.3.0) (2026-05-05)

### Features

- **charset:** expand charset library from 4 to 12 options ([4010b78](https://github.com/andraderaul/ascii-art-converter/commit/4010b7894f3440250b75f912190301ab395c5a13))

### Bug Fixes

- improve file download in desktop ([e895b25](https://github.com/andraderaul/ascii-art-converter/commit/e895b258e13e486f95f57fbdea5a6124a1921a8a))

## [1.2.3](https://github.com/andraderaul/ascii-art-converter/compare/v1.2.2...v1.2.3) (2026-05-04)

### Bug Fixes

- should-fix and accessibility items from TODO ([a7508dc](https://github.com/andraderaul/ascii-art-converter/commit/a7508dc8a46ccecfd7e7e776f6ca7fd83e3e6419))

## [1.2.2](https://github.com/andraderaul/ascii-art-converter/compare/v1.2.1...v1.2.2) (2026-05-04)

### Bug Fixes

- **ai:** introduce NetworkError and guard unknown providers ([ba5be74](https://github.com/andraderaul/ascii-art-converter/commit/ba5be74a75558fba9ce4d27fbf6f509185382124))

### Documentation

- update CLAUDE.md to reflect current codebase state ([d167df0](https://github.com/andraderaul/ascii-art-converter/commit/d167df08c8da5e98c0bf55f14d6832746709165b))

## [1.2.1](https://github.com/andraderaul/ascii-art-converter/compare/v1.2.0...v1.2.1) (2026-05-04)

### Bug Fixes

- give honest toast messages when localStorage is unavailable ([5b55e3c](https://github.com/andraderaul/ascii-art-converter/commit/5b55e3ca766aff11027f25acac08ab1118b9ff65))

### Code Refactoring

- streamline blob sharing and downloading in recording and download components ([bd3965c](https://github.com/andraderaul/ascii-art-converter/commit/bd3965cf2b81ab695a0f808256b3c8e6ef68debc))

## [1.2.0](https://github.com/andraderaul/ascii-art-converter/compare/v1.1.1...v1.2.0) (2026-05-03)

### Features

- add toast error system for storage and export failures ([44263ff](https://github.com/andraderaul/ascii-art-converter/commit/44263fff43ceba7b419fb0381c994fd5e3fb9698))
- enhance DownloadBar with recording functionality ([d406be3](https://github.com/andraderaul/ascii-art-converter/commit/d406be356fd0c1db461feab6ff7181220804d18f))

### Documentation

- add adr seven ([9c77ace](https://github.com/andraderaul/ascii-art-converter/commit/9c77aceff245a29451fa40915869a81add0f47c4))
- add demo GIF and AI analysis screenshot to README ([0400663](https://github.com/andraderaul/ascii-art-converter/commit/04006630ee86837e4b0279bf2dc2e601913d30e4))

### Code Refactoring

- improve download ([c8c6f05](https://github.com/andraderaul/ascii-art-converter/commit/c8c6f057ccd7edafa2c3ad35f08a4887193be369))
- improve slider gesture ([8d4d87a](https://github.com/andraderaul/ascii-art-converter/commit/8d4d87a29afa6ed1a56ea1f9228f37da4c916f33))
- update tags ([86926a8](https://github.com/andraderaul/ascii-art-converter/commit/86926a8ba86252aa5082d4ebc848e934ce45137e))

## [1.1.1](https://github.com/andraderaul/ascii-art-converter/compare/v1.1.0...v1.1.1) (2026-05-02)

### Bug Fixes

- improve slider drag on mobile with touch-action pan-y ([ea4aadc](https://github.com/andraderaul/ascii-art-converter/commit/ea4aadc22bc3f7d22d6e3a7589e3141a3d2afdff))

### Code Refactoring

- extract Badge and ErrorText to ui/ ([7d2e2b0](https://github.com/andraderaul/ascii-art-converter/commit/7d2e2b009d8728d32f5e08b488bfa3b01a0da5a2))
- extract Button to ui/, unify 5 variants across download-bar, analysis-modal, upload-zone ([d78f333](https://github.com/andraderaul/ascii-art-converter/commit/d78f333d61b766a4d5aa25c5e76cb48be89c46ba))
- update prompt ([5b05764](https://github.com/andraderaul/ascii-art-converter/commit/5b057644b7c154f5ae87787d7c18c1b82bf5095f))

## [1.1.0](https://github.com/andraderaul/ascii-art-converter/compare/v1.0.0...v1.1.0) (2026-05-02)

### Features

- AI narrative analysis via user-provided API key ([6779dcb](https://github.com/andraderaul/ascii-art-converter/commit/6779dcb53e855e809630fae9c545c2c2f1118069))
- extract shared Modal primitive with backdrop blur and two variants ([56dbc58](https://github.com/andraderaul/ascii-art-converter/commit/56dbc5881e71fc0334745e5432727c43c820ed71))
- mobile-responsive header, download bar, and layout fixes ([685dea9](https://github.com/andraderaul/ascii-art-converter/commit/685dea9469aef5a9f25acc1c9a0f2e4a51ffc872))

### Bug Fixes

- memoize handleAnalyze with useCallback ([b6264ad](https://github.com/andraderaul/ascii-art-converter/commit/b6264ad04af8bcfcacc52bc51a8ad7dacea5dc63))
- narrow COLOR_MODE_COLORS to Partial<Record<ColorMode, string>> ([071cc4b](https://github.com/andraderaul/ascii-art-converter/commit/071cc4b975d52d8c8ad8f1b935a3d3165b200297))
- remove non-null assertions and surface upload/webcam errors ([0f650f5](https://github.com/andraderaul/ascii-art-converter/commit/0f650f566522e12c56a57d90a634cdf90f14e4b5))
- replace modal backdrop divs and drop zone with accessible elements ([0b1681c](https://github.com/andraderaul/ascii-art-converter/commit/0b1681c67aa88d94eeb76e383575438243063fbc))
- return canvas directly from resizeImage to eliminate async decode race ([42d3a02](https://github.com/andraderaul/ascii-art-converter/commit/42d3a02a541c0bc10633285c26a6b318d0b34fbc))
- sync canvas pixel buffer to display size via ResizeObserver ([b05b0f3](https://github.com/andraderaul/ascii-art-converter/commit/b05b0f374056c92a2974f0cac5898477c98a4f83))

### Performance Improvements

- read CSS font family once on mount instead of every paintFrame call ([c5d803e](https://github.com/andraderaul/ascii-art-converter/commit/c5d803e0fda9c8ec29e6bf48a1dd855986ad7dd5))

### Code Refactoring

- create device utils ([a1458cc](https://github.com/andraderaul/ascii-art-converter/commit/a1458cccee72542f0318b980331208cd9aa1f3fe))
- enhance type safety in useWebcamState hook ([23c4ff7](https://github.com/andraderaul/ascii-art-converter/commit/23c4ff7a72590c9080fd464ad100c8cf62ae6170))
- extract Slider and Label to ui/, unify Resolution control ([c07e0a7](https://github.com/andraderaul/ascii-art-converter/commit/c07e0a7cfc9dc17606fb3363752f61f86570cf72))
- extract ToggleGroup to ui/, unify upload-zone tabs ([893ddf8](https://github.com/andraderaul/ascii-art-converter/commit/893ddf833e7a7b53141055e31600a597e95f56f1))
- extract triggerDownload to eliminate exportPng/capture duplication ([de7bb6f](https://github.com/andraderaul/ascii-art-converter/commit/de7bb6f4b0b74feb47ec5d3ffcf1605d388c8474))
- extract useWebcamState hook with useReducer from UploadZone ([159d2f2](https://github.com/andraderaul/ascii-art-converter/commit/159d2f2f79c9222b48165d1e135d262027d896f7))
- move AnalysisState from analysis-modal.tsx to ai/types.ts ([20f6d24](https://github.com/andraderaul/ascii-art-converter/commit/20f6d246de38d63bf800fd9b3bd56c72038b4c4a))
- name ASCII conversion and rendering constants ([ff755f4](https://github.com/andraderaul/ascii-art-converter/commit/ff755f447cbc2b24403cd53da87f5592e8deb03f))
- remove over-extracted constants from converter ([70fb9a0](https://github.com/andraderaul/ascii-art-converter/commit/70fb9a00ce025aee35e622b4e3dfd7d794643591))
- replace 3 modal useState with ActiveModal discriminated union ([87542b6](https://github.com/andraderaul/ascii-art-converter/commit/87542b65dab8273ec887fd96ac6e9b35a0c29058))
- replace inline styles with Tailwind classes in AI modals ([dc8550c](https://github.com/andraderaul/ascii-art-converter/commit/dc8550c29d06eee3b9949122ec9f4e7c85c8de75))
- restructure ASCII domain module, add quality gates and portfolio docs ([18cf58e](https://github.com/andraderaul/ascii-art-converter/commit/18cf58e6303f62f68e18e131244b1cea173517d3))
- tailwind ([dea021f](https://github.com/andraderaul/ascii-art-converter/commit/dea021f134d36eca3c8f52aa0bf9f526fd70551a))
- use as const instead of as SourceMode cast in UploadZone ([c327678](https://github.com/andraderaul/ascii-art-converter/commit/c3276786b35fec4e9df9f6899d3ec4d11599ba7e))
