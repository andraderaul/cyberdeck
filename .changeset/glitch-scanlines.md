---
'@cyberdeck/glitch': minor
---

GLITCH//Studio: Scanlines Effect. Dims every Nth row for a CRT raster, with density and intensity
exposed on GlitchSettings and wired into the control panel. Density rides a curated 0..1 scale
that maps to a pixel period inside the Effect, so the slider reads the way round its name
promises, and carries one notch per reachable period so every step of the control moves the
raster. Runs at its canonical Pipeline position, the first of the surface Effects, after Channel
Shift.
