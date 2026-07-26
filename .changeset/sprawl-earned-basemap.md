---
"@cyberdeck/sprawl": minor
---

SPRAWL//Atlas earned basemap overlay (#229, ADR 0021 P6) — a continental outline that is *conquered*,
not given. Off by default, so the first screen is pure light on dark; press `B` (or the corner chip,
for touch) and a faint continental gabarito — a vendored Natural Earth 110m coastline — registers on
the *same* equirectangular frame as the points and confirms the guess the dark already let you make.
It strokes thin and dim over the light, so it reads as confirmation rather than the ground the points
sit on, and toggling never disturbs the current scale or viewport. The coastline is a static vendored
asset (`vendor-coastline.mjs`) — no scheduled re-vendor; coastlines don't drift.
