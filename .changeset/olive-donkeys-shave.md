---
'@cyberdeck/ascii': minor
---

The AI Analysis now proposes the ConversionSettings for the image it just described, on the same
round trip: charset, edge glyphs, color mode, resolution, brightness and contrast, laid out in the
scan modal with one `apply`. Nothing moves on its own — applying is the click, and what it displaced
comes back from a `revert` chip in the PRESETS tab until you start editing on top of it. A
suggestion naming a Charset or Color Mode that doesn't exist, or a number the sliders couldn't
reach, is refused rather than coerced — the scan still reports, it simply offers nothing.
