---
"@cyberdeck/sprawl": minor
---

SPRAWL//Atlas scale instrument (#226) — the heart of the piece (ADR 0021). The map opens in
OVERFLOW (`1 px = 1 Gbps`, honestly blown white — the failure is the tutorial) and you repair it by
rewriting the scale coarser: a continuous wheel / drag / arrow-key gesture *over the canvas* (the
map is the control, ADR 0020) slides the logarithmic window in log space, so structure emerges
smoothly from the smear with no order-of-magnitude jump. The always-visible reader tracks
`1 px ≈ N Gbps/Tbps` live and flips out of its electric OVERFLOW voice into cyan once the map is no
longer blown out. Points are painted as a soft additive glow that swells with brightness, so dense
regions bloom into one incandescent smear.
