---
"@cyberdeck/sprawl": minor
---

SPRAWL//Atlas walking skeleton (#225) — the deck's fourth program and its first *piece, not tool*
(ADR 0021). Scaffolds `apps/sprawl` wired to the deck-kit visual language, and renders the world's
connected capacity as light end-to-end: a committed sample dataset → the pure
`project(dataset, scale, viewport)` (equirectangular projection + a logarithmic scale window that
clamps to white above the top — the honest overflow) → `paintFrame`, the one canvas-touching step,
painting points as additive light on a dark field. Fixed scale for now; the scale gesture, real
PeeringDB snapshot, labels, basemap and shareable link follow.
