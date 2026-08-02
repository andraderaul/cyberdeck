---
'@cyberdeck/ascii': patch
---

The AI Config mark is `◇`, hollow to AI Analyze's filled `◈` — the program's two AI surfaces now
read as one family. It replaces `⚿` (SQUARED KEY), which was never missing from the font as it
looked: it drew correctly, but it is a boxed glyph whose meaning lives in fine interior detail, and
at the 11px the header renders it at, the box outline is all that survives — indistinguishable from
the empty rectangle a browser draws for a glyph it *doesn't* have.

The mark is now `aria-hidden` at both callsites, so the header button and the modal heading name
themselves in words. Unhidden, `⚿` had been joining the accessible name, and a screen reader opened
the button with "squared key".
