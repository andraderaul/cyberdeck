---
'@cyberdeck/glitch': patch
'@cyberdeck/ascii': patch
---

Reorder a Link by dragging it on a phone. The Chain row used HTML5 drag-and-drop, which never fires
on touch, so reordering was reachable only with a mouse or a keyboard — the one structural edit
that stayed desktop-only. Pointer Events replace it, covering mouse, pen and finger through one
path.

The REC badge's hover no longer goes translucent over the artwork (GLITCH), and neither badge
announces its timer once a second any more — the accessible name carries the elapsed time instead.
