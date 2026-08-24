# @cyberdeck/deck

## 0.2.0

### Minor Changes

- 10acf75: The attribution bar becomes a kit primitive, and the hub grows one.

  ASCII//Convert and GLITCH//Studio had converged on the same footer — an empty diff but for the
  repository each links to — which is ADR 0014's bar for extraction rather than mere duplication. The
  hub made the third caller, so `Footer` moves into `deck-kit/ui`: `sourceHref` is a prop because
  ASCII//Convert's repository predates the monorepo, and `onAbout` is optional because the hub has no
  About modal to open.

  The hub's bottom edge was a single line of text; it now carries the same `source code →` and
  `author →` the programs do, at the same 44px targets. Nothing changes for ASCII//Convert or
  GLITCH//Studio — same markup, same behavior, one copy fewer.

### Patch Changes

- 10acf75: The hub's share card points at the hub.

  `og:url`, `og:image` and `twitter:image` were written before the hub had a Vercel project and
  guessed its name — `cyberdeck-hub`. It landed as `cyberdeck-deck`, so every absolute URL addressed
  an origin that does not exist: the card built, the roster guard passed, and anyone sharing the deck
  got a preview with a broken image. All three now name the real deploy.

- Updated dependencies [10acf75]
  - @cyberdeck/deck-kit@0.7.0

## 0.1.0

### Minor Changes

- 1100b70: The deck gets a front door.

  CYBERDECK ships as a fifth workspace and the deck's first surface that is neither a tool nor a
  piece: it is the deck's chrome, constituted by consuming no user material, producing no artifact,
  and having no subject but the deck itself (ADR 0025). It names the four programs, says what each one
  does and which category it belongs to, and links into its live deploy — which is navigation, and the
  whole point of a door.

  It consumes the deck kit like the programs do and sets the theme attribute like the three tools,
  carrying the same hand-inlined pre-paint script. That is the easiest call on ADR 0024's boundary
  rather than the hardest: the hub is entirely what the deck drew, so there is no user work underneath
  to recolour.

  It ships a face on a link like the four programs do: its mark is the roster in one glyph — four
  blocks, one of them a different hue for the deck's one piece — and its card is the door at preview
  size, the same names, categories and taglines the page renders.

### Patch Changes

- Updated dependencies [5df832a]
  - @cyberdeck/deck-kit@0.6.0
