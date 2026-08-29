# @cyberdeck/glitch

## 0.12.0

### Minor Changes

- 2e02186: A **step back** to the roll before this one, and the Seed written down in hex. Re-roll was a slot
  machine with no way back: pull it fifteen times, land on something good, nudge one slider and that
  arrangement was gone — no readout, no undo, and the Seed that produced it was never on screen. The
  Editor now keeps the last eight arrangements the session left behind, and one control beside Re-roll
  walks back through them, one press per roll. The current Seed reads under the Chain row as
  `0x8f2c1a3b` — never over the canvas, where a badge would need an opaque box that lands on the
  user's own result (ADR 0013).

  What comes back is a **Seed**, not a snapshot. It re-runs under the look as it stands now, so moving
  a slider between the roll and the step back changes the picture that reappears. That is the
  deliberate shape: an entry holding chain + params + seed would be faithful and would stop being a
  Seed history — it would be session undo, which covers every edit and deserves its own decision.

  Only Re-roll records. The animated Seed does not: it is a Re-roll on every painted frame, and a few
  seconds of it would push hundreds of entries and bury every roll the user actually asked for. Nor do
  a Preset, a Randomize or an import — those three change the **look**, and the arrangement they leave
  behind belonged to a look that is gone. Nothing persists across a reload: a roll is worth returning
  to only while you still remember seeing it.

  **The list of rolls with a thumbnail each did not ship, and the number is why.** Recognising the
  arrangement is what would make a list worth having — `0x8f2 / 0x2c1 / 0x91a` is unreadable, and
  clicking through hex is re-rolling from a smaller stock. Runtime was never the obstacle: the Chain
  over a 96x96 sample costs 0.6–1.3 ms per preset look, so eight previews are single-digit
  milliseconds, and they can run on the main thread without touching the Worker's one waiting slot.
  The **entry bundle** was. GLITCH//Studio sits at 74.43 kB gzipped against a 75.00 ceiling — 570
  bytes — and a bare-bones thumbnail path (a small sampling canvas, a synchronous render per Seed, a
  row of previews, no loading state and no tests) measured **75.08 kB**: over the ceiling before any of
  the parts a shipped version would need. Thumbnails would also have to re-render on every param
  change to stay honest, since an entry is a Seed rather than a snapshot, so a frozen preview would
  lie in exactly the case the feature exists for. The step back delivers the recovery without the
  previews, and lands at **74.76 kB** — inside the ceiling, which was not raised.

## 0.11.0

### Minor Changes

- 1f1f3c7: A Link can now be **bypassed** — silenced without leaving the Chain. Finding out what a Link was
  contributing used to mean removing it, which cost the params it had been tuned to and brought it
  back on defaults. A bypassed Link keeps its params, its position and its slot against the ten-Link
  cap: it is silenced, not absent, so the chip stays in the row (marked with a dashed border and a ⊘,
  and announced as bypassed in its accessible name) and the `N of 10 effects` count still counts it.
  Its params stay editable while it is silent, which is half the point — tune a Link you cannot hear
  yet, then switch it back on.

  Bypass is part of the look, so it moves with the look and only with the look: it rides through a
  Re-roll and an animated Seed untouched, and a Preset or a Randomize replaces the look outright with
  one whose every Link is audible. Silencing a Link marks the active Preset `(modified)`, and
  switching it back on restores the match.

  The Chain file carries it — `"bypassed": true` on a silenced Link, written only when it is true —
  **at format version 1, unchanged**. Every Chain file exported before this still imports, with every
  Link active.

- 3f1a48f: A **Wipe**: one draggable divider over the canvas, the Source on one side and the Chain's result on
  the other. With up to ten Effects stacked, "what is this Chain actually doing to my image" had no
  cheap answer — the only way to see underneath was to empty the Chain or bypass every Link one at a
  time. Two side-by-side panes were the other shape and were refused: they charge half the viewport to
  the artwork they exist to show. The canvas stays full-bleed and the comparison costs one line of
  chrome.

  The divider is chrome, never artwork, and by construction rather than by remembering. All four
  output paths read the visible canvas, so nothing about the Wipe writes to it: the Source half is
  blitted onto a second canvas stacked over it, and the line and handle are elements. PNG Export,
  Copy, Capture and a Recording cannot see the comparison because there is no canvas it could be on.

  It divides the fit region rather than the canvas element, so the letterbox bands stay out of it. The
  Source comes off the sampling canvas, which already holds it at the point `applyChain` receives it,
  mirror included — so a Live Source wipes at the same rate it glitches, with one Chain per frame and
  no second pass. Off by default, gone on a Source change, and a null check on the render loop while
  it is off. The handle is a slider: arrow keys, Home/End, an accessible name and a value, an opaque
  background of its own over the artwork, and 44x44 bought as an overlay so the chrome stays the size
  it draws at.

### Patch Changes

- Updated dependencies [3f1a48f]
  - @cyberdeck/deck-kit@0.7.1

## 0.10.0

### Minor Changes

- bdec989: The glitch moves: **animate** draws a new Seed on every painted frame of a Live Source, so the
  corruption boils instead of standing still. It sits beside Re-roll in EDIT, because that is what it
  is — Re-roll at fifteen frames a second — and it costs almost nothing precisely because the Seed
  already lived beside the Chain rather than inside it: advancing the arrangement is not editing the
  look, so the active Preset stays highlighted and never drifts into `(modified)`.

  Only for a Live Source — a Source Image has no elapsing time for an arrangement to advance
  through, the same gate Record uses. Switching it off settles on the arrangement the last frame
  drew, a whole Seed like any other, rather than freezing mid-frame. A Recording captures the
  animation, since Recording has always been a plain read of the output canvas.

  Block Displacement and Noise are the two Effects the Seed feeds, so those are what move: every
  curated Preset carries Noise and so at least shimmers, and the eight carrying Block Displacement
  tear as well. DEGAUSS and PHOSPHOR are the two without it — their geometry holds still under a
  boiling grain.

- c94c072: Export and import a Chain as JSON — the user's own Preset.

  Randomize deliberately never invents structure: which Links, how many and in what order ride
  through untouched, because bad structure sinks a look faster than a bad number. So structural
  variety can only come from curation, and until now only the six shipped Presets could carry it. A
  Chain built by hand in the EDIT tab now leaves the app as a file from OUT and comes back from
  PRESETS, which is where a brought look belongs — it is applied exactly as one of the six is.

  The file carries the **Chain only**: no Seed (importing draws a fresh one, as applying a Preset
  does) and no Link `id` (UI plumbing, which `chainMatch` already ignores). An imported Chain clears
  the active Preset — it is a look the user brought, not one of the six edited away from. Nothing in
  the file is trusted: an unknown Effect, a param outside its range, malformed JSON or a Chain past
  `MAX_CHAIN_LENGTH` are each rejected — never clamped — with a message naming what is wrong,
  surfaced through a toast.

- 7bac583: The Chain now runs on a Worker thread. ADR 0002 chose the main thread and recorded the Web Worker as
  the upgrade path; GLITCH takes it first, because its whole per-frame core is one pure function over a
  currency that was already DOM-free. The look is untouched — the same Chain and the same Seed paint
  the same pixels — but the eight Effects no longer compete with the interface for the same thread, so
  a heavy Chain over a Live Source leaves the controls responsive instead of freezing them between
  frames.

  Frames move by transfer rather than by copy in both directions, and a slow Chain drops frames instead
  of building a backlog behind the camera. Where a browser has no `Worker`, refuses one, or loses one
  mid-session, the very same Chain runs where it always did.

- 77af42f: Four more curated Presets, and the first that reach for Halftone and Wave.

  PHOSPHOR is the tube's own dot triads — the picture re-quantized onto the shadow mask with the
  raster over it, and the first look on the roster that moves no pixel out of place. DEGAUSS is the
  wipe across a screen coming back to itself: the picture rolls through a long bend while the raster
  underneath stays straight. BILLBOARD plays the whole scene on something the size of a building, a
  grid coarse enough that a cell reads as a lamp. CROSSTALK bends and breaks at once — tears carved
  into the frame, then a tight ripple rolling them sideways.

  The roster reads gentlest first, so each is inserted at the loudness it lands on rather than
  appended. Halftone and Wave shipped registered, runnable and unreachable from the front door:
  Randomize rides a base's structure through untouched, so only a curated Chain can put a new Effect
  in reach of the PRESETS tab.

- 5df832a: GLITCH//Studio installs, and it runs with the network off. It always could — the Chain has only ever
  been applied on your machine — but the browser was never told to keep the bytes. Now it is: a web app
  manifest makes the program installable under its own mark, and a service worker precaches the whole
  shell on the first visit, so the second one opens, takes an image or your webcam, and exports with no
  network at all. Installed, it opens standalone on the same near-black the page paints.

  A new version never takes over a session in progress. It installs quietly behind the one you are
  using — a Live Source stays live, a Recording in flight is never yanked — and runs the next time you
  open the program, or right away if you take the offer that appears under the header.

- afb175f: Halftone joins the Chain as a seventh Effect: the image comes back as a grid of dots whose area
  tracks each cell's luminance, in the cell's own colour or in white. It is neither structural nor
  surface — it re-quantizes — so the canonical Preset order sits it on the seam between the two, after
  Chromatic Aberration and before Scanlines. It draws on nothing: same Chain, same output, whatever
  the Seed.
- e6bc35d: Wave joins the Chain as an eighth Effect: whole rows or columns slide along a sine, bending the
  picture instead of breaking it. It is the geometric axis the others left uncovered — Block
  Displacement moves discrete, seeded blocks and Chromatic Aberration moves each channel radially,
  where Wave moves the image as a whole along a continuous function. Bilinear sampling with clamped
  edges, and it draws on nothing: same Chain, same output, whatever the Seed. The canonical Preset
  order places it first among the structural Effects that move the whole image — after the discrete
  ones, so the bend carries what they left behind, and ahead of the per-channel ones, so their split
  rides on the bent picture.

### Patch Changes

- b39f63d: The hidden sampling canvas (ADR 0001) is cleared before the Source is drawn into it. Canvas 2D's
  `drawImage` composites source-over, so a Source carrying an alpha channel blended onto whatever the
  previous render had left there: the Chain stayed pure in Chain + Seed while the pixels it was
  handed drifted with each re-render, and a PNG Export could differ from a fresh render of the same
  state. An opaque Source could never drift this way, which is what kept it hidden.
- bf2b5e9: A tab, an install prompt and a shared link now show GLITCH//Studio rather than the stock Vite mark
  and a bare URL. The program has its own favicon — the deck's block after the Chain has been through
  it, displaced and split across channels — in the sizes a browser tab, an iOS home screen and an
  install prompt each ask for, a description written from the reader's side, and an Open Graph /
  Twitter card that is the program applied to its own name. `theme-color` matches the Theme the
  pre-paint script paints, so the browser chrome no longer flashes a different colour.
- Updated dependencies [5df832a]
  - @cyberdeck/deck-kit@0.6.0

## 0.9.6

### Patch Changes

- 0dc87b9: `Chip` holds 44px on both axes, not just height. It pays for its target in layout rather than in an
  overlay, because it stands in a scrolling row of its own kind where a centred overlay would reach
  into its neighbour's — but only `min-h` was ever spelled, and a Chip is as wide as its label. Three
  in the deck were short enough to sit under the target: ASCII//Convert's `1×` / `2×` / `4×` PNG scale
  chips at 31px, GLITCH//Studio's `VHS` Preset at 38px, and its add-effect `+` at 29px above `sm`.

  `justify-center` comes along because a stretched Chip's slack would otherwise fall entirely to one
  side of a label that no longer fills it.

- Updated dependencies [0dc87b9]
  - @cyberdeck/deck-kit@0.5.2

## 0.9.5

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

## 0.9.4

### Patch Changes

- 499e5e5: Randomize goes icon-only on mobile, matching Re-roll — the ⚄ glyph alone below `sm`, the label back
  from `sm` up. The accessible name stays "randomize" at both sizes.

## 0.9.3

### Patch Changes

- f79c3fe: The duplicate and remove controls on the focused Link no longer sit flush against each other. They
  were separated by a gap step that does not exist in the deck's scale, so Tailwind generated no class
  at all and the two controls — one of them destructive — touched.
- f79c3fe: Sliders show keyboard focus again. The tall invisible hit area that makes them easy to grab also
  removed the focus ring, with nothing in its place, so tabbing through a Link's params gave no sign
  of where you were. The indicator now sits on the thumb.
- f79c3fe: The canvas overlay's controls — mirror, switch camera, clear, and the REC badge that stops a take —
  now answer a 44x44 pointer target, as do duplicate and remove on the focused Link. The overlay chips
  stood at ~32px tall and the Link actions at roughly 21x24px.

  The overlay chips stand on the artwork, so their height comes from an invisible overlay and they draw
  exactly as before. The LIVE badge wears the same shared chrome but is not a control, so it
  deliberately gains no target.

- Updated dependencies [f79c3fe]
- Updated dependencies [f79c3fe]
- Updated dependencies [f79c3fe]
  - @cyberdeck/deck-kit@0.5.0

## 0.9.2

### Patch Changes

- 57678dc: GLITCH//Studio gains an ultra-thin footer on the empty state, carrying the `source code →` and
  `author →` links plus an `about` trigger — the same footer feature ASCII//Convert just grew. It
  shows only before a Source loads, so the Control Strip owns the bottom edge once glitching starts.
  `about` opens a new About modal: what the program is, and the deck-wide `made with ai` note. No
  AI-scan section, the one thing GLITCH doesn't share with ASCII//Convert.
- Updated dependencies [57678dc]
  - @cyberdeck/deck-kit@0.4.0

## 0.9.1

### Patch Changes

- c15492a: The EDIT tab's mobile layout reclaims its cramped Chain row and surfaces the whole palette:

  - Re-roll collapses to its ⟳ icon on mobile so it stops reserving ~90px on the Chain row; the "re-roll" label returns from `sm` up.
  - The add-effect "+" chip grows to match that icon's 60×44 footprint on mobile so the two read as a matched pair, and shrinks back to a chip on desktop.
  - The "add effect" palette wraps instead of scrolling horizontally, so every Effect is visible at once on a phone rather than hidden behind a scroll.

## 0.9.0

### Minor Changes

- f103199: GLITCH//Studio's Theme control stops cycling and becomes a popover (ADR 0024): the header trigger
  now opens a panel listing the whole roster — seven Themes, up from three — so a Theme is picked by
  name rather than discovered by pressing. The pre-paint script names the full roster in order, so the
  chosen Theme still applies before first paint with no flash of the default. The Theme still stops
  where the user's pixels begin — the Chain's output does not follow it.

### Patch Changes

- Updated dependencies [f103199]
  - @cyberdeck/deck-kit@0.3.0

## 0.8.0

### Minor Changes

- abed3c7: GLITCH//Studio gains the deck's Theme control, in the header (ADR 0024). Chrome, panels and the
  LIVE / REC badges follow the Theme; the Chain's output does not. The Theme stops where the user's
  pixels begin — the same line ADR 0013 already drew for canvas overlays — so no chrome setting
  silently recolours the artefact you are making.

  Also fixes the Chain editor's remove control, which carried `hover:text-hot`. That is not a class,
  so the control has never changed colour on hover.

### Patch Changes

- Updated dependencies [abed3c7]
  - @cyberdeck/deck-kit@0.2.0

## 0.7.0

### Minor Changes

- c1b0361: Surface the front/rear camera switch on the Live Source. The webcam lifecycle already carried
  `switchCamera`; GLITCH//Studio now exposes it as a canvas overlay control on touch devices, the same
  gate ASCII//Convert uses.

## 0.6.2

### Patch Changes

- 30602c5: Stop the page from scrolling sideways when you open the add-effect palette on mobile. The palette's
  `add effect` fieldset carries the UA `<fieldset>` rule `min-inline-size: min-content`, so it refused
  to shrink below the six effect chips' combined width and pushed the whole document ~73px past the
  viewport instead of letting its own row scroll. Adding `min-w-0` lets the fieldset shrink to the
  panel width so the chips scroll in place — the same fight the chain row below already won with
  `flex-1 min-w-0`.

## 0.6.1

### Patch Changes

- a09ed7c: Stop the EDIT tab from jumping on mobile each time you switch Effects. The params panel stacks its
  controls below `sm`, so each Effect's height differed (1 to 3 controls — pixel sort the tallest),
  and only a `min-h` floor was reserved: switching Effect changed the panel's height and reflowed the
  whole strip, moving the canvas boundary by up to ~135px. The panel now reserves the tallest Effect's
  stacked height on mobile so it holds steady across switches; at `sm` the params flow into equal
  columns and every Effect is already one row, so the floor drops back.

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
