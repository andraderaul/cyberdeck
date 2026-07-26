# ADR 0024 — The visual language becomes a named, guarded set of Themes

## Status

Accepted

**Date:** 2026-07-26 · **Related:** issue #266

## Context

The deck has one look — violet accent, cyan info, hot pink danger, electric warning, on a
near-black field — and it is undeclared. Nothing names it; it is simply the values sitting in the
kit's `tokens.css`. The demand is variation *within* the cyberpunk register (Gibson's washed-out
sky, a green-phosphor terminal), not a light mode: the accent palette does not survive a light
surface at all — cyan measures roughly 1.5:1 on white, electric roughly 1.2:1 — so light is a
different palette and a different project.

Two facts make a second palette harder than editing tokens.

**Half the colour bypasses the semantic layer.** Around 150 sites name a literal hue
(`text-violet`, `border-cyan`) instead of its role (`text-accent`, `text-info`) — about 110 across
the programs and 41 inside the kit's own primitives. The preset exposes both vocabularies side by
side, so the literal one keeps winning: it is shorter and nothing objects. Redefining the semantic
layer would recolour half the deck and leave the rest violet.

**The contrast guard ADR 0009 left behind is a hand-copy.** It exists in two programs of four,
duplicates its own arithmetic, mirrors token values by hand, and still claims to mirror a file the
tokens left when ADR 0014 moved them into the kit. One of its constants is declared but never
asserted, under a comment promising a pin that does not exist. It pins one palette because one
palette is all there is; with N palettes a hand-mirror is N chances to ship an unreadable theme and
have CI applaud.

## Decision

**The visual language becomes a set of named Themes.** The current look is named `ice`; `construct`
(green phosphor) and `chiba` (grey and sodium-vapour amber) join it. Every Theme is dark — the
neon-on-near-black relationship *is* the register.

**A Theme redefines the semantic layer only.** The primitive hue names remain `ice`'s vocabulary
and are not restated per Theme; the root block, defining the semantic layer in terms of them,
*is* `ice`. Themes vary hue and surface and nothing else: typography is excluded on a factual basis
(no font is loaded anywhere in the deck, so varying it is inert), texture and motion because a token
cannot express them.

**A Theme reaches everything the deck draws and stops where the user's pixels begin.** This is
ADR 0013's line — drawn to answer what an overlay stands on when the backdrop is arbitrary — reused
unchanged: the deck may recolour what it drew and may not recolour what you brought. Program chrome,
panels, the Terminal's phosphor and badges follow the Theme; a Source, GLITCH//Studio's Chain output
and ASCII//Convert's Color Modes do not.

**SPRAWL//Atlas is excluded, deliberately.** Its pixels are neither chrome nor the user's: they are
the piece, and ADR 0021 states the piece *is* cyan light against the dark, painted additively.
Recolouring it by setting is recolouring a work. It never sets the theme attribute.

**Derived tokens derive.** The eleven tokens hardcoding a hue as a literal — the ghost/dim alphas
and the role tint backgrounds — become `color-mix()` over their semantic source. The `deep` and
`soft` variants do not: they are chosen colours, not computed ones. The line falls exactly where the
contrast guard does not look, so the guard never evaluates a colour mix.

**The literal hue vocabulary is retired from the preset, and two guards live in the kit.** A
contrast guard resolves `tokens.css` and proves every Theme meets the contract below; a vocabulary
guard proves no source has gone back to naming a literal hue.

**The contract every Theme must meet:** subtle foreground, muted foreground and danger at 4.5:1 on
all three surfaces; accent at 4.5:1 on the base surface *and* 3:1 (WCAG 1.4.11, non-text) on all
three; ADR 0013's canvas-overlay pairs on their own opaque surface. The two-tier accent pin closes
the hole without failing the incumbent — `ice`'s violet clears 4.5:1 on the base surface and 3:1
everywhere — and matches how the accent is actually used: mostly border, ring and chip.

**Selection is the user's, in the header, as a control that cycles.** Persistence is per origin
because the programs deploy to four origins on a public-suffix domain; no program links to another,
so the split never surfaces in a session.

**Themes are named from the fictions' interior vocabulary, never by title.** The deck names things
in single evocative words — void, abyss, ghost — and has never cited a work. `matrix` and `neon`
are both already ASCII//Convert Color Modes, so a title-named Theme would also collide with a
neighbouring control in the same program.

## Considered Alternatives

- **Light mode.**
  - *Pros:* the conventional request; helps bright environments.
  - *Cons:* the accent palette dies on a light surface; requires a second palette, a second audit,
    and abandons the register.
  - *Rejected because:* the actual demand was variation within cyberpunk, not escape from it.

- **The Theme reaching the artwork** (glyph ramps, Color Modes, Effect presets).
  - *Pros:* a fully themed "world".
  - *Cons:* a domain core would cross the kit seam, and Theme would silently repaint the user's
    artefact.
  - *Rejected because:* it breaks the rule that each program's pipeline stays in the program.

- **Authorial Themes, fixed per program** (no picker).
  - *Pros:* stronger authorship; configurability dilutes intent.
  - *Cons:* ~95% of the work is identical either way, so it costs the same and delivers less.
  - *Rejected because:* a variation nobody can reach is a variation only the author sees.

- **Demanding AA-small from the accent on every surface.**
  - *Pros:* one rule, no tiers.
  - *Cons:* fails `ice` itself (violet is 3.90:1 on the elevated surface).
  - *Rejected because:* it turns "add Themes" into "reopen the deck's brand colour under deadline".

- **Keeping the literal names and relying on review.**
  - *Rejected because:* the shorter spelling wins by default, and the failure mode is one Theme
    broken in one corner — the least visible kind.

## Consequences

**Positive:**
- Both guards pay for themselves even if the roster never grows: the contrast guard stops mirroring
  values by hand and covers four programs instead of two; the semantic layer stops being the longer
  of two spellings.
- A new Theme becomes roughly a dozen semantic values.
- ADR 0013's boundary earns a second use, so the two decisions cannot drift apart.

**Negative:**
- A one-off promotion of ~150 sites, behaviour-zero but wide. It must never share a change with a
  Theme, or the "nothing changed" reviewability is lost.
- The pre-paint script is hand-inlined in three programs; the deck has no shared HTML.
- SPRAWL//Atlas takes patch version bumps for a feature it does not have, because the kit is
  versioned and internal dependencies bump on change.
- A cycling control hides the roster. The trade stops paying at about four Themes, past which it
  must become a popover.

## Related ADRs

- ADR 0009 — WCAG AA contrast audit: the contract generalises its pins per Theme.
- ADR 0013 — Canvas overlays own their background: supplies the chrome/user-pixels boundary reused
  here.
- ADR 0014 — Deck Kit: the tokens, the guards and the control all live in the kit.
- ADR 0020 — Control Strip: why selection is header chrome and not a Strip tab.
- ADR 0021 — SPRAWL//Atlas is a piece, not a tool: why it is excluded.

## Implementation Notes

The Theme is applied by a blocking inline script setting a data attribute on the document element
before first paint; applying it from the module entry point is cleaner and wrong, because the
deferred script lets the default palette paint for a frame. The resolution rule it encodes —
absent or unrecognised stored value falls back to `ice` — is a pure function in the kit, so the
logic is tested even though the inlined copy is not.

Sequencing is a vertical tracer through GOLEM//Console: the kit change first (derivation, component
tokens re-pointed at roles, its own promotions, both guards), then GOLEM//Console promotes, then it
gains the Themes and the control, then GLITCH//Studio, then ASCII//Convert. GOLEM//Console is the
tracer because it has the smallest literal surface, no canvas of user pixels, and both hard
vocabulary questions — the Terminal's phosphor and the Cache lens's hit/miss pair are roles that do
not exist yet and must be named once, before the other programs promote against them.

## Questions / Future Work

- Font delivery is unresolved and independent: `--font-mono` names two families the deck ships
  neither of, so most people see the system's default monospace.
- The exact values of `construct` and `chiba` are design work, constrained but not determined by the
  contract.
