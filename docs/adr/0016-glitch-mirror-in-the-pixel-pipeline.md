---
status: accepted (supersedes the "Mirror stays ASCII-only" point of ADR 0015)
---

# GLITCH gains mirror — in the pixel pipeline, not in CSS

ADR 0015 recorded mirror as ASCII-only, reasoning that GLITCH's canvas *is* the output so a mirrored
preview would disagree with Capture. We now bring mirror to GLITCH for cross-program parity, but
resolve that exact tension by mirroring **the pixels, not the preview**: the Source is flipped
horizontally when it's drawn into the sampling canvas (`renderGlitchFrame`), *before* the Pipeline
runs — so Effects apply on top of an already-mirrored buffer and the painted canvas that Export and
Recording sample is the mirrored image. What you see is the file you get.

This is a deliberate *implementation* divergence from ASCII, which mirrors with a cosmetic CSS
`transform: scaleX(-1)` on the visible canvas — flipping the preview but not the exported PNG/ASCII
text. That approach is fine for ASCII (its export is not the canvas alone) but would ship the
preview/Export disagreement ADR 0015 refused. So the two programs now share the *feature* and the
*interaction* (auto-on for the front camera, an `⇋` overlay toggle beside `✕ clear`) while differing
in how the flip is realised.

## Considered options

- **Cosmetic CSS mirror (copy ASCII literally).** Rejected: in GLITCH the canvas is the exported
  artifact, so the saved video/PNG would come out un-mirrored while the preview showed a mirror — the
  precise defect ADR 0014/0015 already reasoned out.
- **Real pixel flip in the Pipeline (chosen).** Honest WYSIWYG output; costs a transform on the
  sampling `drawImage` and threading an `isMirrored` flag from App state through `GlitchCanvas` into
  `renderGlitchFrame`.

## Consequences

- **Mirror lives beside `GlitchSettings`, never inside it** — like ASCII's `isMirrored`, it is
  source-tuning, not part of the look, so it does not ride in Presets, Re-roll, or Randomize.
- **Auto-mirror the front camera.** To match ASCII's felt default, `use-webcam-state` regains the
  `onFacingModeChange` callback it deliberately dropped; live front-camera opens mirrored. Because the
  flip is real, GLITCH's *default export for the selfie camera is mirrored* — the honest consequence
  of WYSIWYG, and the manual toggle turns it off.
- **ASCII's cosmetic mirror is now a known asymmetry**, not a divergence to celebrate: ASCII's export
  silently ignores the mirror the user sees. Left as-is here (out of scope) and logged as a follow-up
  to upgrade ASCII to a real flip so both programs match end-to-end.
- A future parity review should read this ADR before "fixing" the two mirror implementations to look
  identical — the difference is intentional and load-bearing.
