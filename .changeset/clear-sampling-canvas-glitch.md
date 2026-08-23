---
'@cyberdeck/glitch': patch
---

The hidden sampling canvas (ADR 0001) is cleared before the Source is drawn into it. Canvas 2D's
`drawImage` composites source-over, so a Source carrying an alpha channel blended onto whatever the
previous render had left there: the Chain stayed pure in Chain + Seed while the pixels it was
handed drifted with each re-render, and a PNG Export could differ from a fresh render of the same
state. An opaque Source could never drift this way, which is what kept it hidden.
