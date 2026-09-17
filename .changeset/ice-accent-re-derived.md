---
'@cyberdeck/deck-kit': minor
---

`ice`'s accent is re-derived: `--violet` goes from `#b829ff` to `#c652ff` — the same hue and the
same saturation, eight points brighter.

The old value cleared AA-small on `--bg` and nowhere else (4.51:1, then 4.35:1 and 3.90:1), which
ADR 0009 recorded and excused for two labels. Sixteen accent labels across four programs were
sitting on lit surfaces by the time #329's guards could see them, and the survey behind #355 found
that **all sixteen were `ice`-only**: the other six Themes already clear the floor on every ground
they draw on. `ice`'s accent is the one that predates the Theme Contract and was never re-derived
under it.

It now measures 5.69 / 5.48 / 4.92 on the three surfaces, 5.21 on `--color-accent-bg` and 4.64 on
the tightest ground it is actually drawn on — the accent ghost over `--bg-elevated`, which is why
the value is not the bare-minimum `#c44dff` (that one lands on 4.49 there). Black on the accent, the
one pair a brighter accent could have broken, improves too: 4.80:1 → 6.05:1. `--soft-violet` follows
to `#df9eff`, keeping the accent-to-soft distance in the band the other six Themes sit in.

**The Theme Contract's accent tier collapses to one.** It used to relax to WCAG 1.4.11's 3:1 off the
base surface for one stated reason — demanding AA-small everywhere would have failed `ice` itself.
That incumbent is gone, and what the tier bought was sixteen defects under a green guard. `--accent`
is now held to AA-small on all three surfaces in every Theme; the roster's tightest is `ice` at
4.92:1.

**A third vocabulary guard.** Every colour in the Tailwind preset is `var(--token)` with no
`<alpha-value>` placeholder, so Tailwind cannot parse it and silently drops any candidate carrying
an alpha modifier: `bg-accent/20` emits nothing at all, and a thinned *border* is worse, because
Preflight has already painted one in its own grey. Seven were shipping. The guard fails the build
with the class, the file and the line, like the hue and scale guards beside it — the deck tints with
named tokens (`bg-accent-ghost`, `-dim`, `-soft`, and the `subtle`/`base`/`strong` border ladder),
which are values the Contract can read, rather than with a slash.
