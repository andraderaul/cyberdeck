---
'@cyberdeck/ascii': patch
---

The hidden sampling canvas (ADR 0001) is cleared before the Source is drawn into it. Canvas 2D's
`drawImage` composites source-over, so a Source carrying an alpha channel blended onto whatever the
previous conversion had left there, and the cells depended on how many renders came before rather
than on the ConversionSettings alone. An opaque Source could never drift this way, which is what
kept it hidden.
