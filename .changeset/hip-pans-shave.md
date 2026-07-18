---
'@cyberdeck/ascii': patch
---

mirror now flips the sampled pixels instead of the visible canvas, so the PNG and TXT Exports match
the mirrored preview (ADR 0016). A mirrored TXT Export has each row's characters reversed — the
honest WYSIWYG result of a real flip.
