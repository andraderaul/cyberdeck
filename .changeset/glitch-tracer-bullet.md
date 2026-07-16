---
'@cyberdeck/glitch': minor
---

GLITCH//Studio: app skeleton and tracer pipeline. Upload a Source Image, see a real-time
glitched preview driven by the Channel Shift Effect, and take it out as a PNG Export. Establishes
the pure core (`PixelBuffer`, `applyPipeline`) and the `renderGlitchFrame` imperative shell, with
the Source scaled to fit an 800×800 sampling cap before processing.
