# ADR 0026 — GLITCH — datamosh is its own output path, not a Link and not a mode of Recording

## Status

Accepted

**Date:** 2026-08-23 · **Deciders:** andraderaul · **Related:** issue #313

## Context

GLITCH//Studio has one currency and one property. The currency is the **PixelBuffer**: every Effect
is a pure `PixelBuffer → PixelBuffer` and `applyChain` is a fold over the Chain's Links. The property
is determinism — same Chain, same Seed, same pixels — and the Preset golden tests and the
per-occurrence sub-seed (ADR 0017) both assume it holds unconditionally.

**Datamosh is neither.** It manipulates the *compressed* stream: drop an I-frame so the decoder keeps
painting the picture it already has, repeat P-frames so one scene's motion vectors land on another
scene's pixels. The artifact is the codec's own reconstruction error. No PixelBuffer appears in that
description — the input is a bitstream, and the output is a decoder in a state its author never
intended.

The app already says so in four places — `CONTEXT.md`, `apps/glitch/CLAUDE.md`, the kit's
`use-recording.ts` and its test all record that Recording captures the canvas the Chain painted and
is **not** datamosh. That is the scope fence, and `CONTEXT.md` lists real datamosh as v2. The
decision comes before the code because the two obvious homes — a Link in the Chain, a mode of
Recording — each cost one of the two things above.

## Decision

**Datamosh becomes its own output path.** Not a Link in the Chain, not a mode of Recording.

It sits **downstream of the Chain and beside Recording**: it takes the frames the Chain has already
painted, encodes them itself, mangles the encoded chunk sequence and decodes the result. It never
reaches back into `applyChain`, and `applyChain` never learns it exists, so the Chain stays the pure
fold ADR 0017 made it. **Recording's contract does not move** either — it still records the output
canvas, so the four "not datamosh" lines stay true as written and become pointers here rather than
promises to rewrite.

**It exists only for a Live Source.** A Source Image has no frames, and datamosh over one frame is
not datamosh but the imitation this ADR exists to refuse. There the control is simply absent, the
same silent absence `⏺ record` already has.

**Determinism is now scoped to the Chain, not the app.** Datamosh output is **not reproducible**, for
two independent reasons: the frame supply is a Live Source, different photons every run on the
wall-clock timing of ADR 0002's rAF loop; and rate-control belongs to the browser's encoder and
varies with load, hardware and thermal state, so even an identical frame sequence would not mosh
twice the same way. Re-roll changes the arrangement; it does not re-run a mosh. That is acceptable
**at the edge**, where the path is terminal — nothing downstream reads it and a reader of a Chain can
still predict the canvas. It would be intolerable **inside the Chain**, where one nondeterministic
Link poisons every Link after it and takes `chainMatch`, the golden tests and the occurrence sub-seed
with it.

**Real datamosh is reachable client-side — but not through `MediaRecorder`,** which returns a
finished, opaque blob with no per-frame codec control. **WebCodecs** is the primitive that fits, and
it is a browser API, not a wasm codec: it exposes keyframe forcing on the way in, the key/delta type
on the way out, and a decoder that accepts whatever chunk sequence it is handed. Dropping a key chunk
and feeding its deltas onto a different decoded picture is in-contract — I-frame removal and P-frame
repetition exactly, yielding the codec's real reconstruction error. Implementation Notes carries the
spec detail and the cost.

**Failure surfaces as an operational error** — an `AppError` to the toast (ADR 0006), never a silent
no-op. Missing WebCodecs is *absence*, not failure: the control is not rendered, the ADR 0007 shape.

## Considered Alternatives

- **A datamosh Link in the Chain.**
  - *Pros:* Reuses everything built — Link chips, reorder, repeats, Presets. One more chip in EDIT.
  - *Cons:* A Link receives one PixelBuffer, no history and no bitstream. Datamosh needs both.
  - *Rejected because:* Only two implementations exist and both disqualify it. Either the Link
    carries hidden frame-to-frame state, ending the fold's purity and with it `chainMatch`, the
    golden tests and the occurrence sub-seed; or it fakes the artifact by blending previous pixels
    and warping by an estimated flow field — an imitation *over pixels*, which is precisely what the
    app already says Recording is not. Shipping that under the real name makes the fence a lie.
- **An output-stage transform inside Recording — a "mosh" mode on the Record control.**
  - *Pros:* One control, one file, and it reads naturally: record, but moshed.
  - *Rejected because:* **It is false at the implementation level, not merely the wrong ontology.** A
    mode implies the two outputs share a pipeline and differ by a flag; they share nothing.
    `MediaRecorder` offers no frame-type visibility at all, so no flag could be added — the
    capability is *absent from the API surface*, not switched off. Datamosh needs WebCodecs, so the
    "mode" would be a second, fully independent pipeline wearing the first one's control, in a hook
    `deck-kit` shares with an app that has no use for codec mangling. The vocabulary cost — four
    rewritten lines — is the lesser objection.
- **Datamosh on a Source Image (mosh a still against itself, or synthesize frames from it).**
  - *Rejected because:* A still has no frames and no motion vectors; anything produced is invented —
    the pixel imitation again, one layer out. Absence is the honest answer.
- **`ffmpeg.wasm` for real codec control.**
  - *Rejected because:* The ~30MB bundle and init latency ADR 0007 already refused for Recording, and
    it is now unnecessary — WebCodecs reaches the real thing natively.

## Consequences

**Positive:**
- The Chain keeps its one strong property intact; nothing in ADR 0017's determinism scheme moves, and
  Recording's contract stands verbatim rather than becoming conditional.
- The OUT tab absorbs the feature with no new grammar: Live-Source-only, gated on *existence* rather
  than a disabled state, start in the tab and stop on the canvas badge (ADR 0020).
- Datamosh owns its encoder without dragging `deck-kit`'s Recording into WebCodecs.

**Negative:**
- **The app gains its first output not reproducible in Chain + Seed**, so the property must now be
  stated as one *of the Chain* rather than of the app.
- **A second encode path in one program:** WebCodecs encoder and decoder, plus either a muxer we do
  not have or a re-record through Recording.
- **A second support floor and a second silent absence.** Record hides on missing `MediaRecorder`,
  datamosh on missing WebCodecs, so ADR 0007's "silent absence rather than a message" cost is paid
  twice, for two different reasons, in one tab.
- **Quality is platform-dependent in a way nothing else here is.** Hardware decoders tolerate a
  malformed chunk sequence less well than software ones, so the same mosh can smear on one machine
  and toast on another.
- **Re-roll's reach shrinks in the user's mental model:** it re-rolls the arrangement, not the mosh.

## Related ADRs

- ADR 0002 — Webcam live feed: rAF loop on the main thread.
- ADR 0006 — Dual error system: `AppError` + toast for operational errors.
- ADR 0007 — Recording: progressive enhancement, no fallback.
- ADR 0017 — GLITCH: the composable Effect Chain.
- ADR 0020 — Control Strip: the single control grammar.

## Implementation Notes

**What each client-side route actually gives you:**

1. **`MediaRecorder` alone — nothing.** It returns encoded `Blob` chunks in a finished container, and
   `BlobEvent` exposes only `data` and `timecode`. `MediaRecorderOptions` carries
   `videoKeyFrameIntervalDuration` and `videoKeyFrameIntervalCount`, but the spec calls them
   *nominal* intervals the user agent merely considers — a hint, not per-frame control.
2. **Post-processing the container — real, but unreliable.** The WebM branch of `detectMimeType()` is
   Matroska: a `SimpleBlock` carries a keyframe flag in its flags byte and Cluster-relative
   timestamps, so dropping or repeating blocks is plain EBML work with no dependency. But the
   artifact then depends on the *playback* decoder's error concealment, and browser decoders are
   hardened to **hide** corruption — they conceal, freeze, or skip to the next keyframe rather than
   smear. VP9's altrefs and Safari's `video/mp4` branch make it worse. Not a foundation.
3. **WebCodecs — the real thing, no wasm codec required.** Per the spec, `VideoDecoder`'s
   `[[key chunk required]]` is set true in exactly two places, `configure()` and `flush()`, and
   `decode()` is the only place that clears it — when a submitted chunk is validated as a key chunk.
   Nothing validates that a *delta* chunk follows its real predecessor, so dropping key chunks and
   repeating deltas across a cut is in-contract, and the smear is the decoder's genuine
   reconstruction error. Support: Chrome/Edge 94+, Safari 16.4+, Firefox 130+ desktop (not Firefox
   Android).

**The open cost is the muxer.** WebCodecs yields chunks, not a file. Either write the moshed chunks
into a WebM container (a small dependency, or hand-rolled EBML), or decode them to a canvas and
re-record through the existing Recording path — reusing a primitive already owned, at the cost of a
second encode and of pinning output to Recording's 15fps.

If the mosh errors out, try `hardwareAcceleration: 'prefer-software'` before surfacing the toast;
hardware decoders reject malformed sequences software ones survive.

The control's home is `apps/glitch/src/components/output-panel.tsx`, beside `⏺ record`, gated the
same way — `isLive && canDatamosh && !isMoshing`, mirroring the shipped
`isLive && canRecord && !isRecording`. Error vocabulary follows
`apps/glitch/src/errors/app-error.ts`: a `datamoshFailed` / `datamoshExportFailed` pair beside
`recordingFailed` / `recordingExportFailed`.

## Questions / Future Work

- **Issue #321** implements this. It should be scoped against WebCodecs, not `MediaRecorder`, and its
  first slice is the muxer-versus-re-record choice above.
- **Whether a mosh is parameterised at all** (drop every *n*th key chunk, repeat depth, a mosh
  duration) is open. Wherever those params live, it is not in the Chain — a Chain carrying datamosh
  params would re-import the coupling this ADR spent its whole argument removing.
