---
'@cyberdeck/deck-kit': patch
---

The space ruler is named by role rather than by size (ADR 0030). `--gap-*` and `--sp-*` — two
rulers, fourteen names, six of them never used — become six: `--space-hairline`, `--space-tight`,
`--space-item`, `--space-group`, `--space-stack`, `--space-section`, keyed into Tailwind as
`gap-tight`, `px-item`, `py-section` and the rest. Each one names a relationship instead of a
magnitude, so the name survives a change of value the way `text-accent` already does.

The rename is clean; there is no alias window. The scale guard splits into two families — spacing
and radius no longer forbid the same names, since `rounded-xs` stays real while `p-xs` is dead — and
the spacing family bans the entire retired vocabulary, so `gap-sm` fails the build with the class,
the file and the line rather than silently rendering nothing. `SECTION_ONLY_GAPS` and the
`p-sp-3xl` trap it described are gone with the ruler.

The one rule worth reading before reaching for a name: `hairline` is any measurement that sizes an
overlay's *footprint* over the user's picture — its inset from the canvas edge and the gaps inside
the overlay row alike (ADR 0013, ADR 0021); `tight` is chrome measured against its own opaque
background. That rule is what the old `xs` (4px) / `2xs` (6px) pair could never state, and closing
that wart by construction is why the sixth role exists.

Inside the kit, seven of the primitives' tightest classes move 4px → 6px: `HeaderButton`,
`ThemeControl`, `ToggleGroup`, `Tooltip` and the toast stack. One of them is a wrapping row —
`ToggleGroup`'s non-full-width layout — where the extra 2px can send a control to a new line on a
narrow screen. Every other class in the kit is pixel-identical.
