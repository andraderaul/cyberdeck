---
'@cyberdeck/glitch': minor
---

A **Wipe**: one draggable divider over the canvas, the Source on one side and the Chain's result on
the other. With up to ten Effects stacked, "what is this Chain actually doing to my image" had no
cheap answer — the only way to see underneath was to empty the Chain or bypass every Link one at a
time. Two side-by-side panes were the other shape and were refused: they charge half the viewport to
the artwork they exist to show. The canvas stays full-bleed and the comparison costs one line of
chrome.

The divider is chrome, never artwork, and by construction rather than by remembering. All four
output paths read the visible canvas, so nothing about the Wipe writes to it: the Source half is
blitted onto a second canvas stacked over it, and the line and handle are elements. PNG Export,
Copy, Capture and a Recording cannot see the comparison because there is no canvas it could be on.

It divides the fit region rather than the canvas element, so the letterbox bands stay out of it. The
Source comes off the sampling canvas, which already holds it at the point `applyChain` receives it,
mirror included — so a Live Source wipes at the same rate it glitches, with one Chain per frame and
no second pass. Off by default, gone on a Source change, and a null check on the render loop while
it is off. The handle is a slider: arrow keys, Home/End, an accessible name and a value, an opaque
background of its own over the artwork, and 44x44 bought as an overlay so the chrome stays the size
it draws at.
