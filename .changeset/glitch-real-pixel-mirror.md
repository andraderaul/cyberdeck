---
"@cyberdeck/glitch": minor
---

Add a mirror to the Live Source, matching ASCII//Convert (ADR 0016). Unlike ASCII's cosmetic CSS flip, GLITCH mirrors the pixels in the Pipeline — the Source is flipped on the sampling draw, before the Effects run — so the exported PNG/recording carries the flip and never disagrees with the preview. The front camera auto-mirrors on start, and a `⇋ mirror` toggle sits in the canvas overlay beside clear (icon-only on touch).
