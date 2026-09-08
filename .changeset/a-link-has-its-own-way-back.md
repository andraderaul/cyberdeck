---
'@cyberdeck/glitch': minor
---

Every Link in the Chain has its own way back: a `↺` leading the Link's action row, returning that
Link's params to the defaults a fresh one is minted with and touching nothing else — nudge a
threshold too far and come back without losing the Chain you built around it. ASCII//Convert's
scoped reset at the other end of the deck, in this program's terms: there the unit is a tool, here
it is the Link.

There is no second table of defaults to keep in step. The `↺` reads `EFFECT_REGISTRY[type].defaults`
— the same entry `createLink` seeds a new Link from — so a re-curated default reaches the reset the
moment it is edited. It is a param edit and only a param edit: the Link keeps its id, its slot and
its bypass, the Chain keeps its order, and the Link beside it is untouched.

A Link already on its defaults keeps its control and disables it, saying why — the answer duplicate
already gives beside it, and an absent control would reflow the row the moment a Link came home. The
`↺` takes a real 44x44 box rather than an overlay, because the three controls it joins are real
boxes and the panel's reserved height was derived with that row already in it: measured in Chromium
at both breakpoints, every Effect's panel comes back the height it was. What gives instead is the
heading, which now truncates on the narrowest phones so the longest Effect name and four 44px
targets can share one 320px row.
