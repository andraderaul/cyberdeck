---
'@cyberdeck/glitch': minor
---

The Control Strip's EDIT tab (ADR 0020): the Chain reads left→right as a row of Link chips in
processing order, with the focused Link's params in the panel above it — stacked on mobile, laid
out as one group on desktop. Every structural edit keeps full parity across breakpoints: drag or
left/right arrows to reorder, a `+` chip for the add palette, duplicate and remove on the focused
Link, repeats allowed.

The legacy control surfaces are gone with it — the desktop aside, the mobile bottom sheet and its
floating trigger, and the `advanced` Disclosure. A mobile user can now build a look from scratch
with the canvas in view the whole time.
