---
"@cyberdeck/deck-kit": minor
---

The visual language becomes a set of named Themes (ADR 0024): `ice` — the look the deck shipped
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
