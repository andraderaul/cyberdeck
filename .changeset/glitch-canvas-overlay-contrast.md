---
'@cyberdeck/glitch': patch
---

GLITCH//Studio: the LIVE / REC badges and the clear control are readable again over a bright result.
They sat transparent on the canvas, so they took their contrast from whatever the Pipeline had just
painted — hot pink on a bright Noise field is close to invisible. Each now carries an opaque surface
from the palette and holds the ratio ADR 0009 signed off.

Translucency wouldn't have fixed it: the canvas is the user's artwork, so no alpha survives every
backdrop. `contrast.test.ts` pins the pairs, mirroring ADR 0009's regression guard.
