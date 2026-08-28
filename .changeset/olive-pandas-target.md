---
'@cyberdeck/deck-kit': patch
---

`TOUCH_TARGET_OVERLAY` joins the public `/ui` surface. It was module-local while the kit's own
Tooltip was its only caller — ADR 0014's bar is two real callers, not one — and GLITCH//Studio's
Wipe handle is the second: a control standing alone on the user's artwork, drawing smaller than 44px
in both axes, which is the exact shape the constant exists for. No behaviour changes; the two
constants it sits beside are unmoved.
