---
'@cyberdeck/ascii': patch
---

The header reads as the deck's display type.

The wordmark sat at a body size in the body face, so the one line that names the program read like
the copy underneath it. It, its `image → ascii art` subtitle and the header's controls now take
`--font-display` at the tracking the deck's uppercase readouts use, and the subtitle joins the
wordmark in uppercase. From `sm` up the wordmark also climbs one step, to 18px.

Presentational only. Behaviour, layout and the control set are unchanged, the labels stay lowercase
on the controls, the 44x44 targets are untouched, and no accessible name moves. The palette is
deliberately untouched too — a lighter accent is an eighth Theme under ADR 0024 and a decision of
its own.

Below `sm` the header keeps the tracking it already shipped: it is one row carrying the wordmark
and both controls there, and 0.18em across them is ~30px that row does not have at 320px.
