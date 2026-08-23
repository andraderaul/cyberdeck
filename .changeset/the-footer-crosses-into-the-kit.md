---
'@cyberdeck/deck-kit': minor
'@cyberdeck/deck': minor
---

The attribution bar becomes a kit primitive, and the hub grows one.

ASCII//Convert and GLITCH//Studio had converged on the same footer — an empty diff but for the
repository each links to — which is ADR 0014's bar for extraction rather than mere duplication. The
hub made the third caller, so `Footer` moves into `deck-kit/ui`: `sourceHref` is a prop because
ASCII//Convert's repository predates the monorepo, and `onAbout` is optional because the hub has no
About modal to open.

The hub's bottom edge was a single line of text; it now carries the same `source code →` and
`author →` the programs do, at the same 44px targets. Nothing changes for ASCII//Convert or
GLITCH//Studio — same markup, same behavior, one copy fewer.
