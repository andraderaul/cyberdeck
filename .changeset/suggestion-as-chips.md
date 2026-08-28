---
'@cyberdeck/ascii': patch
---

Lay the Suggestion out as one chip per proposed field. The decision the panel puts in front of the
user is "do I want these instead of what I have", and until now the proposed ConversionSettings sat
in a label-over-value grid that had to be read column by column before that question could be
answered. Each axis now stands on its own — `charset: braille`, `dithering: bayer`,
`color mode: neon` — as a wrapping list of static chips, so the apply is taken against a visible
inventory rather than a paragraph.

The chips are the same seven the panel always drew, off the same map keyed on `ConversionSettings`
itself: nothing was added that the payload does not carry. The mock this came from also drew a
`STATUS CODE / THREAT LEVEL` band over the reading, and the Providers return neither — a readout
with no data behind it is worse than the prose it would replace, so it is not here.

Nothing about applying moved. The settings still never travel on their own, `apply` still takes the
whole suggestion or none of it, and the `revert` in the PRESETS tab still expires on the user's
first edit of their own.
