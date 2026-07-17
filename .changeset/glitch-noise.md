---
'@cyberdeck/glitch': minor
---

GLITCH//Studio: Noise Effect. Speckles the image with grain, with amount and a mono/colour tint
exposed on GlitchSettings and wired into the control panel. Mono draws one signed perturbation per
pixel and moves every channel by it, leaving hue alone; colour draws per channel, pulling them
apart into chroma static. Grain derives from a positional hash rather than `Math.random`, so the
Effect is a pure function of GlitchSettings and the Pipeline keeps its promise that no randomness
is hidden — the draw takes the Seed as a second input once Block Displacement lands. Runs last at
its canonical Pipeline position, the outermost surface Effect, after Scanlines.
