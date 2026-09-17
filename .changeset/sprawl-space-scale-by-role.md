---
'@cyberdeck/sprawl': patch
---

Promoted to the role-named space ruler (ADR 0030): `gap-sm` becomes `gap-item`, `px-2xs` becomes
`px-tight`, and so on.

Every class over the piece itself — the export controls, the scale reader, the basemap toggle and
the provenance credit — takes `hairline`, the 4px role that exists so an overlay's footprint never
grows over what it sits on (ADR 0021). Nothing here moves a pixel.
