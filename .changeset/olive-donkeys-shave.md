---
'@cyberdeck/deck-kit': patch
'@cyberdeck/glitch': patch
'@cyberdeck/ascii': patch
---

Icon-only controls draw their glyph at 18px, from one constant (`ICON_GLYPH_SIZE`). The 44x44 target
landed without the mark inside it changing, so a control could be fully operable and still read as
unpressable — an 11px glyph adrift in a 44px box. Covers the kit's tooltip trigger, modal close and
toast dismiss, GLITCH's duplicate / remove / add and its Randomize and Re-roll below `sm`, and
ASCII//Convert's AI-config dismiss.

Controls over the canvas are deliberately untouched: there the backdrop is the user's artwork
(ADR 0013) or the piece itself (ADR 0021), and growing that chrome charges the work for its own
controls — the same reason those controls buy their target as an overlay instead of in layout.
