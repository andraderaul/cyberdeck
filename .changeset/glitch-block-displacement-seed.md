---
'@cyberdeck/glitch': minor
---

GLITCH//Studio: Block Displacement Effect, plus the Seed and Re-roll that arrange it. Rectangular
blocks shift horizontally — the data-corruption tear — with block count and travel exposed on
GlitchSettings and wired into the control panel. Runs first at its canonical Pipeline position, the
structural Effect ahead of all the surface ones.

The Seed travels **beside** GlitchSettings rather than inside it: GlitchSettings is the look, the
Seed is the arrangement, and keeping them apart is what lets **Re-roll** hand the same look a new
arrangement. `applyPipeline(pixels, settings, seed)` is now pure in that pair — a fixed
settings+seed reproduces a render exactly, and `createSeed()` is the single place the app draws real
randomness. Noise's grain hash takes the Seed as its second input, as planned when it landed, so a
Re-roll moves the grain along with the blocks.
