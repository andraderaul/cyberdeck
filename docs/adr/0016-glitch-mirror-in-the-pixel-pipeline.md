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

This landed as a deliberate *implementation* divergence from ASCII, which mirrored with a cosmetic
CSS `transform: scaleX(-1)` on the visible canvas — flipping the preview but not the exported
PNG/ASCII text. **That divergence is now closed (#124):** `renderFrame` threads an `isMirrored` flag
down to the sampling `drawImage`, which flips the Source before a pixel becomes an `AsciiCell`, and
the CSS transform is gone. ASCII's flip sits one call deeper than GLITCH's only because that is
where its sampling draw lives (`convertImage`) — in both programs it happens on the sampling draw,
ahead of the pure core (ADR 0005). The flip is taken about the contain-fit region (ADR 0010), so a
letterboxed Source stays inside its own bands.

The two programs therefore share the *feature*, the *interaction* (auto-on for the front camera, an
`⇋` overlay toggle beside `✕ clear`) **and the mechanism** — a real pixel flip ahead of the domain
core, in both cases. Mirror is no longer an ASCII/GLITCH asymmetry of any kind.

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
- **ASCII followed (#124).** Its cosmetic mirror was logged here as a known asymmetry — the export
  silently ignored the mirror the user saw — and has since been upgraded to the same real flip.
- **ASCII's TXT Export mirrors too.** A real flip feeds mirrored pixels into the conversion, so each
  row's characters come out genuinely reversed. That is the honest WYSIWYG outcome and not a bug to
  "fix" by splitting PNG and TXT orientation, which would re-introduce the preview/Export
  disagreement this ADR exists to remove.
