---
'@cyberdeck/ascii': patch
---

A failed Source Image render reaches the ErrorBoundary again, and a dying Worker can no longer strand a frame.

Two holes the move to a Worker opened, both of them the render becoming a promise. A throw out of
`renderFrame` used to leave the effect and land in the boundary whose fallback reads "render failed
— try a different image or adjust settings"; as a floating promise it became an unhandled rejection
nobody observed, and the user got a frozen canvas instead of the message written for it. The canvas
now re-throws it from its next render, so the boundary is back in reach.

**The Source Image only.** A failed frame on the rAF loop is logged and ridden out, the way a
dropped one already is — there is a fresh frame ~66 ms behind it, and the boundary has no reset
path, so routing a transient live failure there would replace the canvas *and the overlay on it*
for good. That overlay carries the Recording stop control, and one bad frame must not be what takes
a running take away from you. The PRESETS row takes a third answer for a third reason — the Control
Strip is that boundary's sibling, so a derivation that throws leaves the chips reading as names
rather than taking the program down; it now says so in the console instead of failing silently.

And the runner's fallback path ran a real conversion inside the Worker's `error` listener with both
its slots already emptied: a throw there settled nothing, and the promise it left behind could never
be settled by anything else — a canvas that never paints. It is settled in a `finally` now, with the
error still surfaced.

The return leg's clone cost is measured and recorded in ADR 0002.
