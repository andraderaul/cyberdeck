---
'@cyberdeck/deck': patch
---

Promoted to the role-named space ruler (ADR 0030): `gap-sm` becomes `gap-item`, and the two `sp-*`
section steps the hub was the only caller of become `group` and `section` at their existing pixel
values — the door's rhythm is unchanged.

A card's badge padding goes 4px → 6px. The chevron's hover travel stays 4px but leaves the named
scale for Tailwind's own `translate-x-1`: a travel distance is not a spacing relationship, and no
role name describes it.
