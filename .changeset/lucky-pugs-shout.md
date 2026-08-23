---
'@cyberdeck/ascii': minor
---

A Charset can now be authored. The EDIT tab's charset panel ends in a field where you write your
own ramp, darkest to lightest, and the canvas follows every keystroke — the converter always
accepted any such string and only the UI withheld it. A ramp under two characters is refused with
the reason rather than applied, so the picture keeps the last Charset that read cleanly instead of
flickering through half-typed ones, and the ramp is indexed by glyph rather than by UTF-16 unit, so
a character past the BMP arrives whole in the preview and in all three Exports.
