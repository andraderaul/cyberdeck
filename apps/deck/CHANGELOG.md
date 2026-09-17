# @cyberdeck/deck

## 0.3.0

### Minor Changes

- 42d3b96: The accent is a brighter violet — `ice`'s signature colour, re-derived in the kit (#355) so that an
  accent label clears AA-small on every surface it is drawn on. On the door that is the checked row of
  the Theme picker, which was under the floor. The favicon, the icon set and the social card are
  regenerated to match.
- d7f4e42: The front door makes a sound, and the mute is on the door.

  One listener at the document on `pointerdown`, one preloaded WAV, one mute — the mechanism of ADR
  0029, taken whole from `@cyberdeck/deck-kit/sound` rather than written again here. **Sound is on by
  default**, so a visitor hears one press before they can decline; the mute sits beside the Theme
  picker in the header, labelled, and is remembered under the deck-wide `cyberdeck:sound` key.

  The hub is included on purpose and it is the one workspace where that needed checking. ADR 0025's
  fence forbids it an input, an artifact, a domain core, an embedded program and retention machinery; a
  press sound is none of them, and a mute is a preference about how the deck presents itself — the same
  clause that already admitted the Theme picker — rather than state about your use kept to bring you
  back.

  Measured in Chromium over the built output, the header fits at 320, 360 and 375: the mute costs its
  44px in a row that had the room, and the word it shows from `sm` up is hidden below that.

  The hub has no service worker, so its share of the build rule is only that the sample is emitted as a
  file under `dist/assets` instead of being folded into the entry chunk as a data URI, where it would
  charge first paint for a sound only a press ever needs.

### Patch Changes

- c80f78f: Promoted to the role-named space ruler (ADR 0030): `gap-sm` becomes `gap-item`, and the two `sp-*`
  section steps the hub was the only caller of become `group` and `section` at their existing pixel
  values — the door's rhythm is unchanged.

  A card's badge padding goes 4px → 6px. The chevron's hover travel stays 4px but leaves the named
  scale for Tailwind's own `translate-x-1`: a travel distance is not a spacing relationship, and no
  role name describes it.

- Updated dependencies [bf772a2]
- Updated dependencies [d7f4e42]
- Updated dependencies [c80f78f]
- Updated dependencies [42d3b96]
- Updated dependencies [55c00ac]
  - @cyberdeck/deck-kit@0.8.0

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
