---
"@cyberdeck/sprawl": minor
---

SPRAWL//Atlas city labels + hover inspection (#228) — orientation without a basemap (ADR 0021, P5).
City names ride on the strongest nodes (derived from the dataset, grouped per city and spatially
thinned so the dense European core doesn't pile names into an unreadable smear), each fading with
its node as the scale slides. Hovering a point reveals its identity and value —
`Fort Worth, US · 14.1 Tbps` — with a ring on the inspected node, the value in the same Gbps/Tbps
language as the scale reader, named as connected capacity, never traffic. The projection now runs
once in CSS space and feeds both the canvas paint (scaled to devicePixelRatio) and the DOM overlays,
so labels and hover land exactly on the light.
