# ADR 0002 — Webcam live feed — rAF loop on the main thread

## Status

Accepted (amended in #316 and #326 — both programs have now taken the Worker upgrade path — and in
#411, which finished ASCII//Convert's return leg; see Implementation Notes)

## Context

Webcam mode needs to sample frames from the `HTMLVideoElement` and render ASCII continuously. This
requires a per-frame loop that reads video pixels, converts them, and paints the canvas — without
janking the browser's main thread.

## Decision

Drive rendering with `requestAnimationFrame`, throttled to ~15fps, running entirely on the browser's
main thread. `renderFrame()` is called roughly every 66ms; the throttle compares timestamps and drops
a frame when the delta since the last render is under 66ms. Only frames with
`readyState >= HAVE_ENOUGH_DATA` are processed.

15fps is enough for live ASCII — the output does not carry the visual fidelity of real video, and the
eye does not perceive a difference above ~10fps for ASCII art. The implementation reuses
`renderFrame()`, already extracted from the static-image flow, with no new dependency.

## Considered Alternatives

- **Move to a Web Worker immediately.**
  - *Cons:* Adds ~2–3× complexity with no perceptible gain at 15fps.
  - *Rejected because:* The cost isn't worth paying until jank is actually reported.
- **`setTimeout` throttle.**
  - *Rejected because:* `rAF` is paused automatically when the tab is backgrounded, saving CPU;
    `setTimeout` keeps firing.

## Consequences

**Positive:**
- Zero new dependencies; reuses the existing static-image render path.
- rAF pauses in background tabs, so an idle webcam tab spends no CPU.

**Negative:**
- All conversion CPU runs on the UI thread, so very high resolutions or slow hardware can jank. The
  upgrade path (Web Worker) is recorded below. **Both programs have now taken it** — GLITCH//Studio
  in #316, ASCII//Convert in #326 — and they took it at two different seams; see the amendments.

## Related ADRs

- ADR 0005 — Pure/impure boundary with RenderInstruction.
- ADR 0017 — The composable Effect Chain: `applyChain` is the one pure function that crossed.
- ADR 0027 — The deck installs: the Worker chunk is part of the precached shell.

## Implementation Notes

### The upgrade path as originally sketched

Move `renderFrame()` into a `Worker` using `OffscreenCanvas`: transfer the visible canvas with
`transferControlToOffscreen()`, pass video frames as `ImageBitmap`, convert and render inside the
Worker, communicate with transferables.

### Amendment (#316) — GLITCH//Studio took it, and took it differently

The jank this ADR was waiting for arrived: eight Effects and Chains up to `MAX_CHAIN_LENGTH` put a
single frame far past the 66ms the loop budgets for it, and every millisecond of that was the UI
thread's. **GLITCH//Studio now runs the Chain on a dedicated Worker** (`src/glitch/chain-worker.ts`,
`chain-job.ts`, `chain-runner.ts`); the rAF loop and the ~15fps throttle above are unchanged, and
what they now throttle is how often the main thread *samples a frame and hands it over*.

**GLITCH went first because its core is one pure function.** `applyChain(PixelBuffer, Chain, Seed) →
PixelBuffer` is the whole of what runs per frame, and `PixelBuffer` was already DOM-free by ADR 0005 —
the shell was already unwrapping `ImageData` into one and wrapping it back. The hard half of a Worker
port, a core that touches no DOM, was done before the port started; what was left was a message and
a transfer list.

**OffscreenCanvas was not used, and the sketch above is superseded on that point.**
`transferControlToOffscreen()` is permanent: once control is transferred, `getContext('2d')`,
`toBlob` and `toDataURL` on the placeholder throw. This app's four output paths — PNG Export,
Capture, Copy and Recording — are all *reads of the visible canvas* (`apps/glitch/CONTEXT.md`), so
transferring it would have traded the jank for losing every way out of the program. Only the fold
crosses; the sampling draw and the `putImageData` stay here, where the DOM is.

Three rules make it work:

- **Transfer, not copy, in both directions.** The sampled buffer is up to 800×800×4 (ADR 0001's
  sampling cap), and cloning it on both legs of every frame would hand back a good share of what
  moving the Chain off-thread bought.
- **Drop frames, never queue them.** At most one frame is in flight and one waiting; a newer frame
  replaces the waiting one, and the frame it replaced is dropped. A queue would grow for as long as
  a slow Chain is on screen and put the preview minutes behind the camera. The single waiting slot
  is what keeps the rule safe for a Source Image, which has no next frame to correct a drop with:
  the newest edit is always the one that survives, so the canvas shows the Chain the Editor holds.
  The shell keeps sampling on every throttled tick even while the Worker is busy, which is the
  other half of that: a fresh sample *replaces* the waiting one, so what eventually runs is the
  newest frame rather than whichever arrived first.
- **A Source Image asks once more when its frame is dropped, and the case is not backpressure.**
  Backpressure cannot reach that branch at all — the only thing that drops the newest Source Image
  render is a newer one, and React runs the older effect's cleanup before the newer render is
  submitted, so it is already cancelled by the time the drop lands. What reaches it is a **Worker
  that died holding the frame's pixels**: they were transferred and left with it, so there is
  nothing here to re-run them from, and a still image has no next tick to correct that with. One
  re-ask is enough and cannot spin, because by then the runner *is* the synchronous core and has
  nothing to drop with.
- **A synchronous fallback, always.** Where `Worker` is undefined, where constructing one throws
  (a Content-Security-Policy that refuses worker scripts), and from the moment a live Worker dies,
  the same `applyChain` runs on the calling thread. There is no state in which the program has no
  way to paint.

The Effects and `applyChain` did not change and are still unit-tested with no Worker in the room —
the Worker is shell. `chain-job.test.ts` pins the pixels of all ten Presets by digest, recorded from
`main` before the port, which is the assertion the whole change had to answer to.

**The paint is now asynchronous, and one behaviour follows from that.** PNG Export, Capture and
Copy are reads of the visible canvas, and the canvas is written a Worker round trip after the edit
that caused it rather than inside the same commit. So an Export fired within that window — a slider
moved and the button hit in the same breath, on a Chain slow enough to make the window worth
noticing — takes the frame before the edit. It is a valid render of a Chain the user held a moment
earlier, never a torn or half-painted one, and it self-corrects on the next Export. It is left
unhandled rather than unremarked: fixing it means the output panel awaiting the runner, which
threads a render concern through three components that have no other reason to know one exists. If
it is ever reported, that is the shape of the fix, and this paragraph is where it should be read
from.

**The cost is a second copy of the pipeline in the build.** A Worker is its own top-level module
graph, so Vite emits it as a separate chunk (~2.45 kB gzipped) and the entry chunk still carries the
pipeline for the fallback. That chunk is the first entry in GLITCH's `lazy` bundle-budget row, which
was `0` until now; it is fetched when a Source is opened, never at first paint, and it *is* part of
the precached shell (ADR 0027) — a running program fetches it, and an offline user who could not
would silently drop to the slow path.

### Amendment (#326) — ASCII//Convert took it, at a different seam

Its per-frame work is not one function but a pure conversion, a pure `computeFrame`, and a
`paintFrame` that draws a glyph per cell straight onto the canvas. Only the first two could cross
without `OffscreenCanvas`, and that is exactly what crossed: **`convertImage()` and `computeFrame()`
now run on a dedicated Worker** (`src/ascii/frame-worker.ts`, `frame-job.ts`, `frame-runner.ts`),
while `paintFrame()` stays on the main thread and remains the only function writing to the visible
canvas (ADR 0005). The Worker returns the converted frame; the shell paints. (It returned
`RenderInstruction[]` and `asciiRows` until #411 — see that amendment for the shape it returns now.)

So the seam is not GLITCH's applied twice. There, one pure function is the whole per-frame cost and
the shell's remaining work is a `putImageData`. Here the shell keeps a real share of the frame — a
`fillText` per cell — and what it hands over is the part that has no DOM in it. The three rules
above carry across unchanged (drop, never queue; a synchronous fallback always; a Source Image asks
once more when a dying Worker took its pixels), because they are properties of the *runner*, not of
what it runs: `frame-runner.ts` is `chain-runner.ts`'s shape, deliberately, so the deck has one
answer to backpressure rather than two.

Two things are this program's own:

- **The sampling draw stays here, and had to be split out to do so.** `convertImage()` used to take
  the sampling context and do its own `drawImage` + `getImageData`; that half is now
  `sampleSource()`, on the main thread with the hidden canvas ADR 0001 gave it, and the Mirror still
  rides on that draw ahead of everything (ADR 0016) — so the preview, the PNG, the TXT and the HTML
  keep agreeing by construction, and nothing past the boundary can tell a flipped frame from an
  unflipped one. What crosses is the buffer it returns.
- **Both legs transfer** — the inbound one from the start, the return leg since #411. The sampled
  pixels were always the one large value going *in*. Coming back, `RenderInstruction[]` was an array
  of objects and `asciiRows` an array of strings, neither a Transferable, so #326 declined a
  typed-array encoding rather than inventing one; the measurement below is what turned that decision
  over. The pure core now emits a **PackedFrame** — `{cols, rows, chars: Uint32Array, colors:
  Uint32Array}` — and `frameResultTransfers` names every buffer in the message.

The PRESETS row is the one caller that deliberately asks for the *synchronous* runner: it converts
ten Presets in a burst over one canvas, and the single waiting slot would drop nine of them.

`frame-job.test.ts` pins all three Exports for all ten Presets by digest, recorded from `main`
before the port — the assertion the whole change had to answer to. The pure core is unit-tested
directly, with no Worker in the room, exactly as before.

The cost is the same one GLITCH paid: a second copy of the two stages in the build (2.47 kB gzipped,
`bundle-budget.config.mjs`), fetched when a Source is opened and part of the precached shell
(ADR 0027).

**The paint is asynchronous here too, and this program has more surface for it.** PNG Export,
Capture, Recording and AI Analysis are reads of the visible canvas, so #316's paragraph applies to
them word for word. TXT and HTML Export are the part GLITCH has no counterpart for: they never touch
the canvas, they read the cropped frame `onConverted` hands `App` — and
that callback now fires a Worker round trip after the settings change rather than inside the same
commit. So the same window is reached by a second route: a slider moved and TXT Export hit in the
same breath writes the grid from before the edit. The verdict is #316's, for #316's reasons — a
valid render of settings the user held a moment earlier, never a torn or half-converted one,
self-corrected by the next Export, and fixing it means threading a render concern through
components that have no other reason to know one exists. What the window costs is *when*, never
*what*: the drop rule keeps the newest frame, so the grid those two Exports eventually read is
always the one the Editor holds.

### Amendment (#411) — the return leg transfers too

**The return leg was a structured clone, it was measured rather than assumed, and this is where it
went away.** `computeFrame` emits one entry per cell, blanks included, so the count is the grid and not a
property of the picture. Measured in headless Chromium on Apple silicon (medians of 40; the main
thread's share is `structuredClone` minus a `MessageChannel.postMessage`, which serializes
synchronously and does not deserialize), the same method and the same two grids before and after —
a ~1600×900 canvas at Resolution 10 and at Resolution 4:

| grid | return leg, cloned (#326) | return leg, transferred (#411) | the two stages that left |
|---|---|---|---|
| 23,940 cells (Resolution 10) | 3.9–4.8 ms | **0.00 ms** | 0.4 ms default · 2.4 ms with Edge Glyphs + `floyd` + `adaptive` |
| 149,850 cells (Resolution 4) | 27.5–33.6 ms | **0.00 ms** | 2.5 ms · 17–21 ms |

The frame budget is 66 ms. `0.00 ms` is the honest reading and not a rounding of something small:
with the buffers in the transfer list, `structuredClone` and `postMessage` are indistinguishable at
the timer's resolution at *both* grids, because neither walks the data. The cost did not shrink with
the grid — it stopped being proportional to it.

What #326 could not claim, this can. There, the clone cost more main-thread time than the two stages
that left, at both grids, with the margin *growing* — +2.0 to +3.8 ms at the coarse grid, +16 to
+28.6 ms at the fine one — so the blocking burst at Resolution 4 was larger than the pipeline it had
replaced and a Live Source there was plausibly slower than before the port. There is now nothing on
the return leg to compare against: the whole 27–34 ms is gone at the fine grid and the whole 4–5 ms
at the coarse one, and what is left on this thread is `sampleSource` and `paintFrame`.

**The shape, and why no step packs it.** Char codes and colours are the two arrays; x and y are
dropped because both are arithmetic on the index and `cols`. The pure core emits that natively —
a packing step would have to run either on the Worker (pure overhead over emitting it directly) or
on the main thread (which is the cost the shape exists to remove), and the synchronous fallback
consequently pays nothing for an encoding it does not need.

Two details are this app's, against the sketch that named them:

- **`chars` is a `Uint32Array` of code points, not a `Uint16Array` of code units.** `charsetGlyphs`
  splits a ramp by code point precisely because an authored Charset can reach past the BMP, and
  16 bits would hand the grid half a surrogate pair — reintroducing, at the thread boundary, the
  exact corruption `charset.ts` exists to prevent. `render-frame.test.ts` renders an authored `🌑🌕`
  ramp through all three Exports and is what holds it.
- **`colors` carries the CSS *spelling* as well as the channels.** The colour is written verbatim
  into an HTML Export's `style` attribute, so a frame that came back as `rgb(0,255,65)` where it
  used to say `#00ff41` would be a different document, byte for byte. This program emits two
  spellings — a hex literal for the fixed and dual modes, a decimal triple for `original` and
  `adaptive` — so one bit above the 24 says which, and the unpacking is exact.

Unpacking on the main thread is what the shape buys back, and it is bounded. `paintFrame` reads a
colour only where it changes, so a fixed Color Mode unpacks once for the whole frame; glyphs and
colours are interned by their packed key, so the distinct count is dozens rather than cells. The one
mode that can defeat the cache is `original`, which can put a different colour in every cell — and
measured at both grids and on `original` itself, the paint is unchanged within run-to-run noise
(~19 ms and ~104 ms per frame, dominated by `fillText` either way).

**`asciiRows` stopped being carried at all.** It was the third value on the return leg and the one
with no typed-array form; rather than encode it, it is *derived* — `frameRows` reads the characters
back out of the cropped frame's `chars`, and only TXT Export's click ever asks. A Live Source asks
for no cropped grid on any frame, so the rows the loop used to build and clone ~15 times a second
are now built zero times.

`frame-job.test.ts`'s thirty digests — every Export of every Preset — pass **unregenerated** across
this change, which is the assertion the whole thing had to answer to. They are spelled as the
`{char, x, y, color}` the frame used to carry, with x and y written out as the arithmetic that
replaced them, so the claim being held is still "these exact glyphs at these exact coordinates in
these exact colours".
