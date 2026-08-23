# ADR 0025 — GLITCH — datamosh is its own output path, not a Link and not a mode of Recording

## Status

Proposed

**Date:** 2026-08-23 · **Deciders:** andraderaul · **Related:** issue #313

## Context

GLITCH//Studio has one currency and one property. The currency is the **PixelBuffer**: every Effect is
a pure `PixelBuffer → PixelBuffer`, and `applyChain` is a fold over the Chain's Links. The property is
determinism — the same Chain and the same Seed produce the same pixels, with no hidden source of
randomness, and the Preset golden tests and the per-occurrence sub-seed (ADR 0017) are both built on
that being unconditionally true.

**Datamosh is not a function over a pixel grid.** It manipulates the *compressed* stream: drop an
I-frame so the decoder keeps painting the picture it already has, repeat P-frames so one scene's
motion vectors get applied to another scene's pixels. The artifact is the codec's own reconstruction
error. There is no PixelBuffer anywhere in that description — the input is a bitstream and the output
is a decoder in a state its author never intended.

The app already knows this and says so in four places. `CONTEXT.md` states that Recording records the
output canvas the Chain painted and is **not** datamosh; `apps/glitch/CLAUDE.md` repeats it; the kit's
`use-recording.ts` carries it as a doc comment and its test as a comment. Those four lines are the
scope fence, and `CONTEXT.md` lists real datamosh as v2. The decision has to be made before any code,
because the two obvious homes — a Link in the Chain, a mode of Recording — each cost one of the two
things above.

## Decision

**Datamosh becomes its own output path.** Not a Link in the Chain, not a mode of Recording.

It sits **downstream of the Chain and beside Recording**. It consumes the frames the Chain has already
painted onto the output canvas, encodes them itself, mangles the encoded chunk sequence, and decodes
the result — it never reaches back into `applyChain`, and `applyChain` never learns it exists. The
Chain therefore stays exactly what ADR 0017 made it: a pure fold, deterministic in Chain + Seed.

**Recording's contract does not move.** It still records the output canvas, the way Capture still
grabs one frame of it. The four "this is not datamosh" lines stay true as written and become pointers
to this ADR rather than promises to rewrite.

**It exists only for a Live Source.** A Source Image has no frames, and datamosh over a single frame
is not datamosh — it is the imitation this ADR exists to refuse. On a Source Image the control is
simply absent, the same silent absence `⏺ record` already has, for the same reason.

**Determinism is now scoped to the Chain, not to the app.** Datamosh output is **not reproducible**,
and this ADR states that plainly rather than hedging it. Two independent reasons: the frame supply is
a Live Source (the webcam hands you different photons every run, and the rAF loop of ADR 0002 delivers
them on wall-clock timing), and the encoder's rate-control decisions belong to the browser and vary
with load, hardware and thermal state — so even an identical frame sequence would not mosh twice the
same way. Re-roll changes the arrangement; it does not re-run a mosh.

That is acceptable **at the edge** because the path is terminal: nothing downstream reads it, it
cannot feed back into the Editor, look-equality never sees it, and a reader of a Chain can still
predict the canvas. It would be intolerable **inside the Chain**, where a single nondeterministic Link
poisons every Link after it and takes `chainMatch`, the Preset golden tests and the occurrence
sub-seed down with it.

**Real datamosh is reachable client-side — but not through `MediaRecorder`.** `MediaRecorder` hands
back a finished, opaque encoded blob and offers no per-frame codec control; its two keyframe-interval
options are a nominal hint to the user agent, not a per-frame lever. **WebCodecs** is the primitive
that fits, and it is a browser API rather than a wasm codec: `VideoEncoder.encode(frame, { keyFrame })`
controls keyframes on the way in, `EncodedVideoChunk.type` is `'key' | 'delta'` on the way out, and
`VideoDecoder` accepts whatever chunk sequence it is handed once one key chunk has landed. Dropping a
later key chunk and feeding the deltas that followed it onto a different decoded picture is legal, not
a trick — which is exactly I-frame removal and P-frame repetition, yielding the codec's real
reconstruction error. See Implementation Notes for what that costs.

**Failure surfaces as an operational error** — an `AppError` to the toast (ADR 0006), never a silent
no-op. Missing WebCodecs is *absence*, not failure: the control is not rendered, the ADR 0007 shape.

## Considered Alternatives

- **A datamosh Link in the Chain.**
  - *Pros:* Reuses everything already built — the Link chips, reorder, repeats, Presets, the add
    palette. It would ship as one more chip in the EDIT tab.
  - *Cons:* A Link receives one PixelBuffer with no history and no bitstream. Datamosh needs both.
  - *Rejected because:* Only two implementations exist, and both are disqualifying. Either the Link
    carries hidden frame-to-frame state, which ends the fold's purity and with it `chainMatch`, the
    golden tests and the occurrence sub-seed; or it fakes the artifact by blending previous pixels
    and warping by an estimated flow field — an imitation *over pixels* rather than the codec's
    reconstruction error, which is precisely what `CONTEXT.md` already says Recording is not. Shipping
    the imitation under the real name would make the app's own scope fence a lie.
- **An output-stage transform inside Recording — a "mosh" mode on the Record control.**
  - *Pros:* One control, one file, and it reads naturally: record, but moshed.
  - *Cons:* Recording's contract is a single sentence written into `CONTEXT.md`, `CLAUDE.md`, the
    kit's `use-recording.ts` and its test. A mode makes that sentence conditional and forces all four
    rewrites.
  - *Rejected because:* It is also false at the implementation level. `MediaRecorder` is the wrong
    primitive and cannot be made into the right one, so "a mode" would be a second, independent
    pipeline wearing the first one's control — and Recording lives in `deck-kit`, shared with
    ASCII//Convert, which has no use for a codec-mangling stage. Rewriting a true boundary into a
    false one to save a button is a bad trade.
- **Datamosh on a Source Image (mosh a still against itself, or synthesize frames from it).**
  - *Rejected because:* A still has no frames and no motion vectors; anything produced is invented.
    That is the pixel imitation again, one layer out. Absence is the honest answer.
- **`ffmpeg.wasm` for real codec control.**
  - *Cons:* The ~30MB bundle and init latency ADR 0007 already refused for Recording.
  - *Rejected because:* Still disproportionate, and now unnecessary — WebCodecs reaches the real
    thing natively.

## Consequences

**Positive:**
- The Chain keeps its one strong property intact. Nothing in ADR 0017's determinism scheme moves, and
  `applyChain` stays a pure fold.
- Recording's contract stands verbatim. The four "not datamosh" lines survive as accurate pointers to
  this ADR instead of being rewritten into conditionals.
- The OUT tab absorbs the feature with no new grammar: Live-Source-only, gated on *existence* rather
  than a disabled state, start in the tab and stop on the canvas badge — the shape `⏺ record` already
  established (ADR 0020).
- Owning its own path lets datamosh own its own encoder without dragging `deck-kit`'s Recording into
  WebCodecs. ASCII//Convert is untouched.

**Negative:**
- **The app gains its first output that is not reproducible in Chain + Seed.** The property must now
  be stated as a property *of the Chain*, not of the app. `CONTEXT.md`'s `applyChain` line stays true
  only because datamosh is deliberately outside it.
- **A second encode path in one program.** WebCodecs encoder + decoder, plus either a muxer we do not
  have or a re-record through the existing Recording path. Neither is free.
- **A second support floor and a second silent absence.** Record hides on missing `MediaRecorder`;
  datamosh hides on missing WebCodecs. Two controls in one tab can now vanish for two different
  reasons, and ADR 0007's "silent absence rather than a message" cost is paid twice.
- **Quality is platform-dependent in a way nothing else in the app is.** Hardware decoders are less
  tolerant of a deliberately malformed chunk sequence than software ones, so the same mosh can smear
  on one machine and error into a toast on another.
- **Re-roll's reach shrinks in the user's mental model.** It re-rolls the arrangement, not the mosh,
  and the UI must not imply otherwise.

## Related ADRs

- ADR 0002 — Webcam live feed: rAF loop on the main thread (the ~15fps frame supply datamosh reads).
- ADR 0006 — Dual error system: `AppError` + toast for operational errors.
- ADR 0007 — Recording: progressive enhancement, no fallback (the absent-control precedent).
- ADR 0017 — GLITCH: the composable Effect Chain (the purity and determinism this ADR protects).
- ADR 0020 — Control Strip: the single control grammar, and the OUT tab's output actions.

## Implementation Notes

**What each client-side route actually gives you**, since this is what reframes the follow-up work:

1. **`MediaRecorder` alone — nothing.** `canvas.captureStream()` → `MediaRecorder` returns encoded
   `Blob` chunks in a finished container. There is no frame-type visibility, no "make this a
   keyframe", no "drop this frame". `MediaRecorderOptions` carries `videoKeyFrameIntervalDuration` and
   `videoKeyFrameIntervalCount`, but both are *nominal* intervals the user agent may honour as it
   likes — an interval hint, not per-frame control — and neither is safe to build on.
2. **Post-processing the produced container — real, but unreliable.** The WebM branch of
   `detectMimeType()` is Matroska: a `SimpleBlock` carries a keyframe flag, and dropping or repeating
   blocks and rewriting timecodes is plain EBML work with no dependency. The catch is that the
   artifact then depends on the *playback* decoder's error concealment, and browser decoders are
   hardened to **hide** corruption — they conceal, freeze, or skip to the next keyframe rather than
   smear. VP9's altref frames and superframes make it worse, and Safari's `video/mp4` branch is a
   different container with harder IDR dependencies. Not a foundation.
3. **WebCodecs — the real thing, no wasm codec required.** `VideoEncoder`/`VideoDecoder` give the two
   levers datamosh needs. Per the spec, `VideoDecoder`'s `[[key chunk required]]` is set true only by
   `configure()` and `flush()` and goes false after the first key chunk decodes; after that, delta
   chunks are accepted regardless of whether they truly follow. Dropping key chunks and repeating
   deltas across a cut is therefore in-contract, and the smear is the decoder's genuine reconstruction
   error. Support: Chrome/Edge 94+, Safari 16.4+, Firefox 130+ desktop (not Firefox Android) — so the
   floor is real and the control's absence below it follows ADR 0007.

**The open cost is the muxer.** WebCodecs yields chunks, not a file. Two routes: write the moshed
chunks into a WebM container (a small dependency, or hand-rolled EBML), or decode the moshed chunks to
a canvas and re-record that through the existing Recording path — which reuses a primitive already
owned, at the cost of a second encode and of pinning output to Recording's 15fps.

If the mosh errors out, favour `hardwareAcceleration: 'prefer-software'` on the decoder before
surfacing the toast; hardware decoders reject malformed sequences that software ones survive.

The control's home is `apps/glitch/src/components/output-panel.tsx`, beside `⏺ record`, gated on
existence the same way that one is — `isLive && canDatamosh && !isMoshing`, mirroring the shipped
`isLive && canRecord && !isRecording`.

Error vocabulary follows the existing pattern in `apps/glitch/src/errors/app-error.ts` — a
`datamoshFailed` / `datamoshExportFailed` pair beside `recordingFailed` / `recordingExportFailed`.

## Questions / Future Work

- **Issue #321** implements this. It should be scoped against WebCodecs, not `MediaRecorder`, and its
  first slice is the muxer-versus-re-record choice above.
- **Whether a mosh is parameterised at all** (drop every *n*th key chunk, repeat depth, a mosh
  duration) is open. Wherever those live, it is not in the Chain — a Chain that carried datamosh
  params would re-import the coupling this ADR spent its whole argument removing.
