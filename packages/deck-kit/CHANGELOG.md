# @cyberdeck/deck-kit

## 0.4.0

### Minor Changes

- 57678dc: The `Modal` primitive crosses the seam into the kit (ADR 0014): it was ASCII//Convert's local
  dialog, and GLITCH//Studio's new About modal is the second real caller, so it moves verbatim to
  `@cyberdeck/deck-kit/ui` over the already-shared `useDialog` hook. It also gains a mobile fix — the
  dialog now caps its height to the viewport and scrolls internally, so a tall modal no longer
  overflows and clips its own title on a short screen. The overlay picks up padding as part of that
  fix, so on a screen narrower than the `cyber` variant's own max-width every dialog — the API key and
  Analysis modals included — is now inset from the edge instead of running flush to it.

## 0.3.2

### Patch Changes

- 4886d40: The Theme picker's trigger gets the horizontal room its pill shape needs. It is 44px tall for the
  touch target, so the pill radius clamps to 22px, and with 4px of padding on each side a short name
  like `ice` came out roughly as wide as it was tall — a circle with a few pixels of straight edge
  rather than a pill. `px-md` gives the label room on either side, so the shape reads as intended at
  every Theme name in the roster.

## 0.3.1

### Patch Changes

- 4627ac3: The Source Image drop zone lights its border on hover, matching the webcam panel it sits beside in the empty-state hero. Until now only the drop target reacted to a drag, so the left half of the hero read as dead to the mouse while the right half answered.

## 0.3.0

### Minor Changes

- f103199: The Theme roster grows to seven and the picker becomes a popover (ADR 0024). `ice`, `construct` and
  `chiba` are joined by four drawn from the Sprawl trilogy's interior vocabulary:

  - `kuang` — Neuromancer's Kuang Grade Mark Eleven icebreaker: arterial red on near-black. The accent
    owns red, so danger vacates to hot magenta — the one palette where a role had to move to make room
    for the accent, and the tightest against the contract because of it.
  - `ougou` — Count Zero's Ougou Feray, the loa of iron and technology: a cool blued-steel field under
    a warm ember accent.
  - `solitude` — Mona Lisa Overdrive's Dog Solitude, the toxic junkyard: rust corrosion under a sickly
    chem-yellow warning.
  - `onyx` — the deck with the neon off: silver on true black, colour spent only on genuine status.

  Each new Theme is one semantic-layer block and nothing else — the tints derive and the component
  tokens point at roles — and each cleared the Theme Contract before it shipped. The contrast guard
  discovers Themes from the stylesheet, so all four are held to the full contract with no change to
  guard code.

  `ThemeControl` stops cycling and becomes a popover: the trigger opens a panel that lists the whole
  roster, marks the Theme in force, and lets a user pick one by name. It opens, moves and dismisses by
  keyboard, returns focus to the trigger on close, and carries accessible names for the panel and each
  option. The four-Theme cycling ceiling — a roster-size assertion that existed to force exactly this
  migration — is retired now that the control no longer trades discoverability for width; `ice`-first,
  default and named-once still hold in their own tests.

  The picker hook's interface changes to match: `useTheme` exposes the Theme in force, a
  `setTheme(theme)` action, and the roster itself so the popover has one source for its list. The
  `nextTheme` cycling helper is gone. Resolution of an absent or unrecognised stored value to `ice` is
  unchanged, so a retired Theme name still falls back rather than leaving an unstyled deck.

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
