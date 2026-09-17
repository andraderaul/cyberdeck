---
'@cyberdeck/golem': patch
---

The one control this program has is now a target you can hit, and the panels it prints into can be
scrolled without a mouse (#355).

The **command line** drew 794x17.6 — wide enough to aim at and 26px short on the axis a thumb has
least of, the shortest target on the deck on the whole control grammar of the program (ADR 0018). A
real 44px box rather than a target overlay, because an `<input>` renders no `::after` for
`ui/touch-target.ts` to hang one on. The height comes out of the log above it rather than out of the
panel, which keeps its reserved height, and the prompt row reads as the strip it always was.

The **five scrolling panels** — the Source listing, the Console log, Registers, Memory and the
Terminal — each take a tab stop and draw a focus ring, which is what WCAG 2.1.1 asks of a region
that scrolls. A keyboard user could drive the machine and could not scroll back through what it
printed, in the one program on the deck whose entire interface is a keyboard. Nothing about ADR 0018
moves: focus scrolls a read-only surface and drives nothing, so the Console is still the only
grammar, and every panel is still free of controls.
