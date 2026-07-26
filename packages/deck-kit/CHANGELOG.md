# @cyberdeck/deck-kit

## 0.2.0

### Minor Changes

- abed3c7: The visual language becomes a set of named Themes (ADR 0024): `ice` — the look the deck shipped
  with, named for the first time — plus `construct` (green phosphor) and `chiba` (grey and
  sodium-vapour amber). All three are dark; the deck has no modes, it has Themes.

  A Theme redefines the semantic layer and nothing else. The tinted backgrounds derive from their
  source hue with `color-mix()`, and the border, card, button and input token families now point at
  roles instead of primitives, so a new look is a block of about twenty-five values.

  New: `ThemeControl` (a header control that cycles), the roster and its resolution rule at
  `@cyberdeck/deck-kit/theme`, and the roles the deck had drawn without naming — `--color-phosphor`,
  `--color-link`, `--color-hit` and `--color-miss`.

  The literal hue names — violet, cyan, hot-pink, electric, void, abyss, shadow, slate, muted, dim,
  ghost — are gone from the Tailwind preset. They were the shorter of two spellings, which is why
  half the deck kept reaching for them. Components name roles now.

  Three guards ship with it, all in the ordinary test command: a contrast guard that resolves the
  real token values and holds every Theme to a stated contract, a vocabulary guard that fails with
  the class, file and line if a retired name comes back, and a roster guard that keeps the
  TypeScript, the Theme blocks and each program's inlined pre-paint script in agreement.

  The vocabulary guard bans every primitive the stylesheet declares, derived from the stylesheet
  rather than listed by hand — a literal colour no Theme restates _is_ `ice`'s vocabulary, which is
  the definition that also catches `--white` and the two electric variants. Those never had a
  Tailwind class to lose, so a ban list written from the preset's removals walked straight past them
  while `var(--white)` pinned a rule to `ice` just as surely as `var(--violet)` would. It reads each
  program's `index.html` too, which is where a hue could be named before React exists.

  `--fg-on-accent` is new: a selection highlight is the only place the deck paints text on an opaque
  accent, and it is the one pair a Theme cannot get right by accident — whether the text wants to be
  lighter or darker depends on how bright that accent is. The contract pins it at AA-small.

  **Selected text changes in `ice`.** It was near-white on violet, which measures 3.80:1 and has never
  met the floor the rest of the palette clears. It is black on the same violet now, at 4.80:1. The
  Theme's colour is untouched; only the text standing on it moves.

## 0.1.0

### Minor Changes

- 4bd889a: The Control Strip's shell crosses into deck-kit as `TabStrip` (ADR 0020's extraction slice). With
  the Strip landed in both programs, the tablist markup, the selected-tab state and the single
  mounted panel were byte-identical — ADR 0014's "empty diff plus two real callers" met exactly. The
  tab set and the panels stay in each app: those are vocabulary and domain surface, and neither
  crosses the seam.

  `MobileBottomSheet` is removed from the kit. It lost its only two callers when the sheets died, and
  nothing on the deck references it.
