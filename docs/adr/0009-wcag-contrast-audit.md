# ADR 0009 — WCAG AA contrast audit and remediation

## Status

Accepted · **guard superseded by [ADR 0024](0024-themes-named-and-guarded-visual-language.md)** ·
**`--violet`'s row and its exception superseded by the re-derivation below (#355)**

The audit below stands as the record of what was measured and why. Its *regression guard* does not:
it pinned hex values by hand, in two programs of four, from a file the tokens left in ADR 0014. It
is now the Theme Contract, which resolves the real token values and holds every Theme to them.
Where this document names a literal hue, read the role it plays — the literal vocabulary was
retired in ADR 0024, so `--violet` is `--accent`, `--muted` is `--fg-dim`, and so on.

**Date:** 2026-05-20 · **Related:** issue #38, issue #16

## Context

Issue #16 listed a contrast audit as a deliverable but it was never completed. Issue #38 reopened
the requirement. This ADR documents the systematic audit, the pairs that fail, what was fixed, and
what was intentionally left as-is.

All ratios are computed using the WCAG 2.1 relative luminance formula (IEC 61966-2-1 sRGB).
Thresholds:
- **AA-small**: ≥ 4.5:1 (text under 18pt / 14pt bold)
- **AA-large**: ≥ 3:1 (text 18pt+ or 14pt+ bold)
- **Non-text**: ≥ 3:1 (WCAG 1.4.11, UI components and graphical objects)

Surface backgrounds in use: `--void #0a0a0f`, `--abyss #0f0f1a`, `--shadow #1a1a2e`.

### Audit results — text token pairs

All foreground tokens against the three dark surface backgrounds.

| Token | Value | On void | On abyss | On shadow | AA-small verdict |
|---|---|---|---|---|---|
| `--muted` | `#6b6b9a` | 3.95:1 | 3.80:1 | 3.41:1 | **FAIL** everywhere |
| `--fg-subtle` (old) | `#7e7eaf` | 5.16:1 | 4.98:1 | 4.46:1 | **FAIL** on shadow |
| `--fg-subtle` (new) | `#8080b2` | 5.31:1 | 5.12:1 | 4.59:1 | **PASS** all surfaces |
| `--fg-muted` / `--dim` | `#9898c0` | 7.14:1 | 6.88:1 | 6.16:1 | **PASS** all surfaces |
| `--ghost` / `--fg` | `#c8c8e0` | 12.03:1 | 11.59:1 | 10.39:1 | **PASS** all surfaces |
| `--white` | `#eeeef8` | 17.14:1 | 16.51:1 | 14.80:1 | **PASS** all surfaces |
| `--violet` | `#b829ff` | 4.51:1 | 4.35:1 | 3.90:1 | PASS on void only — see exception |
| `--cyan` | `#00e5ff` | 12.84:1 | 12.37:1 | 11.09:1 | **PASS** all surfaces |
| `--hot-pink` | `#ff2d78` | 5.55:1 | 5.35:1 | 4.79:1 | **PASS** all surfaces |
| `--electric` | `#ffe600` | 15.59:1 | 15.02:1 | 13.46:1 | **PASS** all surfaces |

### Audit results — non-text / border token pairs (WCAG 1.4.11)

| Token | Value | On void | On abyss | Non-text 3:1 |
|---|---|---|---|---|
| `--slate` | `#2a2a4a` | 1.44:1 | 1.39:1 | **FAIL** |
| `--shadow` | `#1a1a2e` | 1.16:1 | 1.12:1 | **FAIL** |
| `--muted` | `#6b6b9a` | 3.95:1 | 3.80:1 | PASS |

## Decision

### Fixed: `--fg-subtle` token value

`#7e7eaf` passed on `--void` and `--abyss` but failed by 0.04 on `--shadow` (4.46:1 vs 4.5:1
required). Bumped to `#8080b2` (+2 on each channel, same 240° hue, preserves the R=G relationship).
Now passes on all three surfaces with headroom.

The token comment in `index.css` was also corrected — the previous comment cited 4.7:1 on `--void`,
which was inaccurate; the correct value was 5.16:1 for the old value and 5.29:1 for the new value.

### Fixed: `text-muted` replaced with `text-fg-subtle` in UI text

`--muted` used as a text color fails AA-small everywhere (3.41–3.95:1). All five occurrences in UI
components were changed to `text-fg-subtle`:

| File | Location |
|---|---|
| `src/components/ui/modal.tsx` | Close button (✕) |
| `src/components/mobile-bottom-sheet.tsx` | Close button (✕) |
| `src/app.tsx` | Header "about" button resting text |
| `src/components/analysis-modal.tsx` | "interfacing with AI Provider" loading text |
| `src/components/api-key-modal.tsx` | API key helper text |

### Intentional exception: `THREAT_COLOR.UNKNOWN` in analysis-modal

`THREAT_COLOR.UNKNOWN` uses `var(--muted)` as a runtime inline style for the threat-level text and
border when the AI scan returns an UNKNOWN result. This is a cyberpunk register element — the
intentional visual de-emphasis signals that no threat has been determined. The UNKNOWN state is
styled to recede into the background on purpose.

Changing this to a higher-contrast token would make UNKNOWN visually indistinguishable from LOW
(cyan) or MODERATE (electric), undermining the threat-level communication hierarchy. Flagged as an
accepted exception.

### Intentional exception: `text-violet text-xs` in analysis-modal (AI Analysis surface)

Two text nodes in `analysis-modal.tsx` use `text-violet text-xs` on `bg-abyss`:

```
analysis-modal.tsx:42  <span className="text-violet font-bold tracking-wider text-xs">◈ NEURAL SCAN RESULTS</span>
analysis-modal.tsx:51  <span className="animate-pulse text-violet text-xs tracking-wider">▸ SCANNING VISUAL FEED...</span>
```

`--violet #b829ff` on `--abyss #0f0f1a` = 4.35:1, which fails AA-small (4.5:1 required). At `text-xs`
(11px), even `font-bold` does not qualify as AA-large (which requires ≥ 14pt bold ≈ 18.67px).

These two instances are accepted cyberpunk-register exceptions:
- The modal title and scan-in-progress animation are decorative / atmospheric labels, not body copy
  or interactive affordance text.
- The AI Analysis modal is the highest-density cyberpunk surface in the product; tightening its
  accent color to meet AA-small would visually weaken the neon glitch aesthetic that communicates
  the register.
- Both elements have a nearby readable description or status indicator at a passing contrast
  (`text-ghost` body text, loading animation text), so no critical information is lost.

This exception is limited to these two specific locations. Any future addition of `text-violet
text-xs` on `--abyss` or darker backgrounds should be evaluated individually before being granted
the same exception.

### Intentional exception: border tokens below WCAG 1.4.11

`--slate` (borders, `border-base`) and `--shadow` (subtle borders, `border-subtle`) both fail the
3:1 non-text contrast requirement against dark backgrounds. These borders are structural/decorative
separators in the cyberpunk design system — they demarcate regions rather than convey interactive
affordance or state. No interactive component relies solely on a `--slate` border to signal its
interactive nature; buttons and inputs also use text labels, icons, or focus outlines.

Raising these tokens to 3:1 would require `--slate` to lighten from `#2a2a4a` to approximately
`#4a4a6a`, which significantly alters the dark cyberpunk palette. The decision is to accept this
exception for purely decorative structural separators and document it here. If interactive borders
(e.g., form inputs) are ever styled with `--slate` alone, they should be revisited at that time.

## Superseded — `--accent` in `ice`, re-derived under the Theme Contract (#355)

**Date:** 2026-09-16 · **Related:** issue #355, [ADR 0024](0024-themes-named-and-guarded-visual-language.md)

The `--violet` row above and the `text-violet text-xs` exception under it no longer describe the
deck. Both are kept as written — this ADR is the record of what was measured in May — and both are
superseded by what follows.

### What the exception actually bought

The exception was granted to two labels and asked that "any future addition ... be evaluated
individually". By the time #329's guards landed there were **sixteen**, across four programs, and
none had been evaluated. That is not sixteen people ignoring a rule: `#b829ff` passing on one
surface out of three means every accent label drawn anywhere but the base surface is a defect, and
a palette with that property produces them faster than a review can catch them.

A survey resolved the accent against every ground in use, in all seven Themes. **All sixteen
failures were `ice`-only** — the other six Themes clear AA-small on every ground, the tightest being
`kuang` at 4.96:1. `ice`'s accent is the one that predates the Theme Contract and was never
re-derived under it. So the token was the fault, not the sixteen callsites.

### The new value

`--violet` becomes **`#c652ff`** — `hsl(280, 100%, 66%)`, the same hue and saturation as `#b829ff`
lifted eight points of lightness. Deliberately not the bare-minimum `#c44dff`: that one clears the
three surfaces and then measures **4.49:1** on the tightest ground the accent is actually drawn on,
which is a hairline rather than a pass.

| Ground | `#b829ff` | `#c652ff` |
|---|---|---|
| `--bg` (`#0a0a0f`) | 4.51:1 | **5.69:1** |
| `--bg-surface` (`#0f0f1a`) | 4.35:1 | **5.48:1** |
| `--bg-elevated` (`#1a1a2e`) | 3.90:1 | **4.92:1** |
| `--color-accent-bg` — accent at 10% over `--bg` | 4.23:1 | **5.21:1** |
| `--bg-accent-ghost` over `--bg` | 4.38:1 | **5.47:1** |
| `--bg-accent-ghost` over `--bg-elevated` | 3.74:1 | **4.64:1** |

The last row is the binding constraint, and note why the derived grounds move at all: both are
`color-mix()` of the accent itself, so lifting the accent lifts the ground under it and only the
*difference* is won.

`--fg-on-accent` was the pair that could have broken, since a brighter accent is a worse ground for
a light foreground. `ice` draws black there, so it improves too: **4.80:1 → 6.05:1**. `--void` on
the new accent measures 5.69:1 and would also clear the floor now; black keeps the wider margin and
the token is left alone.

`--soft-violet` follows to **`#df9eff`** — `hsl(280, 100%, 81%)`. It has no contrast pin (no
Contract pair names `--accent-soft`), but every Theme on the roster separates its accent from its
soft by 17–19 points of lightness, and leaving the soft where it was would have left `ice` with 10.
Its one consumer is the social cards' `accentSoft`.

### The Contract's accent tier collapses to one

ADR 0024 pinned the accent at AA-small on the base surface and at WCAG 1.4.11's 3:1 elsewhere, for
one reason it wrote down: demanding AA-small everywhere would have failed `ice` itself. The
incumbent it was sparing is the palette above, and the tier it bought is what let the sixteen
labels ship under a green guard. With `ice` re-derived, `--accent` is now held to AA-small on all
three surfaces, in every Theme — the roster's tightest is `ice` at 4.92:1. ADR 0024's rejected
alternative is thereby adopted.

### The two `analysis-modal.tsx` labels

The exception is retired rather than re-granted. Both labels sit on `--bg-surface`, where the accent
now measures 5.48:1 — there is no longer a threshold to be excused from, and the register argument
never needed one: the re-derived accent is the same hue at the same saturation.

## Considered Alternatives

- **Raise every failing token to pass its threshold.**
  - *Cons:* would flatten the threat-level hierarchy (UNKNOWN becomes indistinguishable from LOW /
    MODERATE) and weaken the neon glitch aesthetic on the highest-density cyberpunk surface.
  - *Rejected because:* several failures are intentional cyberpunk-register de-emphasis
    (`THREAT_COLOR.UNKNOWN`, the two `text-violet text-xs` labels) rather than accessibility gaps in
    functional text.
- **Lighten the border tokens (`--slate` toward `#4a4a6a`) to meet 3:1.**
  - *Cons:* significantly alters the dark cyberpunk palette.
  - *Rejected because:* `--slate` and `--shadow` are purely decorative structural separators; no
    interactive component relies on them alone to convey affordance or state.

## Consequences

**Positive:**
- `--fg-subtle` now passes AA-small on all three surfaces with headroom, and the five `text-muted`
  UI occurrences now pass by switching to `text-fg-subtle`.
- The `index.css` token comment now reflects accurate ratios.

**Negative:**
- Documented accepted exceptions remain below threshold (`THREAT_COLOR.UNKNOWN`, the two
  `text-violet text-xs` labels, and the `--slate` / `--shadow` border tokens). Each exception is
  scoped to specific locations, and any future similar use must be evaluated individually before
  reusing the exception.

## Related ADRs

- None.

## Implementation Notes

Regression guard (since generalised — see Status): `src/contrast.test.ts` pins the hex values of `--fg-subtle` and `--fg-muted`
against the 4.5:1 threshold on all three surface backgrounds. If either token is adjusted to a value
that fails, the test catches it at CI.
