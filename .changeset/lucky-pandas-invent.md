---
'@cyberdeck/glitch': patch
---

Introduce the composable Effect Chain in the core (ADR 0017), behind the existing controls. Rendering now folds through `applyChain`, with each Link drawing on a Seed derived from which occurrence of its Effect it is, so a future Chain can carry the same Effect twice without the repeats sharing an arrangement. No control changes and no rendering changes: every Preset renders byte-for-byte as before.
