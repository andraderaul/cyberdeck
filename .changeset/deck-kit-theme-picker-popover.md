---
"@cyberdeck/deck-kit": minor
---

The Theme roster grows to seven and the picker becomes a popover (ADR 0024). `ice`, `construct` and
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
