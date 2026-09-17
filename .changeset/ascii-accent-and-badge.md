---
'@cyberdeck/ascii': minor
---

The accent is a brighter violet. `ice`'s signature colour was re-derived in the kit (#355) so that
an accent label clears AA-small wherever it is drawn instead of on the base surface alone — the
header's `Configure AI key`, the About wordmark, and the OUT tab's `configure AI`, `AI Analyze`,
`AI Config` and `export png` were all below the floor and all read comfortably above it now. Same
hue, same saturation; the favicon, the icon set and the social card are regenerated to match.

The `Badge` also gets its border back. It asked for a thin info border and, because Tailwind cannot
parse an alpha modifier on a `var()` colour, rendered Preflight's default grey instead — a near-white
line nobody chose, on every badge in the program.
