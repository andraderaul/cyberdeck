---
'@cyberdeck/deck-kit': minor
---

The `Modal` primitive crosses the seam into the kit (ADR 0014): it was ASCII//Convert's local
dialog, and GLITCH//Studio's new About modal is the second real caller, so it moves verbatim to
`@cyberdeck/deck-kit/ui` over the already-shared `useDialog` hook. It also gains a mobile fix — the
dialog now caps its height to the viewport and scrolls internally, so a tall modal no longer
overflows and clips its own title on a short screen. The overlay picks up padding as part of that
fix, so on a screen narrower than the `cyber` variant's own max-width every dialog — the API key and
Analysis modals included — is now inset from the edge instead of running flush to it.
