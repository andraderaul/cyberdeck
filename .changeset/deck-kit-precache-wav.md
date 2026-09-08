---
'@cyberdeck/deck-kit': patch
---

`.wav` joins the precached shell's classified extensions.

The press sound (ADR 0029) is the first audio the deck emits, and `collectShell` refuses any file it
cannot classify — so without this the build fails, which is the guard working rather than a bug. It is
precached like the rest of the shell for the reason the classifier exists: the sample answers a
gesture, and a shell installed without it would answer the first offline press with silence and
nothing to say why.
