---
'@cyberdeck/deck-kit': patch
'@cyberdeck/ascii': patch
'@cyberdeck/glitch': patch
---

`Chip` holds 44px on both axes, not just height. It pays for its target in layout rather than in an
overlay, because it stands in a scrolling row of its own kind where a centred overlay would reach
into its neighbour's — but only `min-h` was ever spelled, and a Chip is as wide as its label. Three
in the deck were short enough to sit under the target: ASCII//Convert's `1×` / `2×` / `4×` PNG scale
chips at 31px, GLITCH//Studio's `VHS` Preset at 38px, and its add-effect `+` at 29px above `sm`.

`justify-center` comes along because a stretched Chip's slack would otherwise fall entirely to one
side of a label that no longer fills it.
