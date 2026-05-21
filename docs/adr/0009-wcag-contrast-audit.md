# ADR 0009 — WCAG AA Contrast Audit and Remediation

**Date:** 2026-05-20  
**Status:** Accepted  
**Related:** issue #38, issue #16

---

## Context

Issue #16 listed a contrast audit as a deliverable but it was never completed. Issue #38 reopened the requirement. This ADR documents the systematic audit, the pairs that fail, what was fixed, and what was intentionally left as-is.

All ratios are computed using the WCAG 2.1 relative luminance formula (IEC 61966-2-1 sRGB). Thresholds:
- **AA-small**: ≥ 4.5:1 (text under 18pt / 14pt bold)
- **AA-large**: ≥ 3:1 (text 18pt+ or 14pt+ bold)
- **Non-text**: ≥ 3:1 (WCAG 1.4.11, UI components and graphical objects)

Surface backgrounds in use: `--void #0a0a0f`, `--abyss #0f0f1a`, `--shadow #1a1a2e`.

---

## Audit results — text token pairs

| Token | Value | On void | On abyss | On shadow | AA-small |
|---|---|---|---|---|---|
| `--muted` | `#6b6b9a` | 3.95:1 | 3.80:1 | 3.41:1 | **FAIL** |
| `--fg-subtle` (old) | `#7e7eaf` | 5.16:1 | 4.98:1 | 4.46:1 | **FAIL** on shadow |
| `--fg-subtle` (new) | `#8080b2` | 5.29:1 | 5.10:1 | 4.59:1 | **PASS** |
| `--fg-muted` / `--dim` | `#9898c0` | 7.14:1 | 6.88:1 | 6.16:1 | **PASS** |

## Audit results — non-text / border token pairs (WCAG 1.4.11)

| Token | Value | On void | On abyss | Non-text 3:1 |
|---|---|---|---|---|
| `--slate` | `#2a2a4a` | 1.44:1 | 1.39:1 | **FAIL** |
| `--shadow` | `#1a1a2e` | 1.16:1 | 1.12:1 | **FAIL** |
| `--muted` | `#6b6b9a` | 3.95:1 | 3.80:1 | PASS |

---

## Decisions

### Fixed: `--fg-subtle` token value

`#7e7eaf` passed on `--void` and `--abyss` but failed by 0.04 on `--shadow` (4.46:1 vs 4.5:1 required). Bumped to `#8080b2` (+2 on each channel, same 240° hue, preserves R=G relationship). Now passes on all three surfaces with headroom.

The token comment in `index.css` was also corrected — the previous comment cited 4.7:1 on `--void`, which was inaccurate; the correct value was 5.16:1 for the old value and 5.29:1 for the new value.

### Fixed: `text-muted` replaced with `text-fg-subtle` in UI text

`--muted` used as a text color fails AA-small everywhere (3.41–3.95:1). All five occurrences in UI components were changed to `text-fg-subtle`:

| File | Location |
|---|---|
| `src/components/ui/modal.tsx` | Close button (✕) |
| `src/components/mobile-bottom-sheet.tsx` | Close button (✕) |
| `src/app.tsx` | Header "about" button resting text |
| `src/components/analysis-modal.tsx` | "interfacing with AI Provider" loading text |
| `src/components/api-key-modal.tsx` | API key helper text |

### Intentional exception: `THREAT_COLOR.UNKNOWN` in analysis-modal

`THREAT_COLOR.UNKNOWN` uses `var(--muted)` as a runtime inline style for the threat-level text and border when the AI scan returns an UNKNOWN result. This is a cyberpunk register element — the intentional visual de-emphasis signals that no threat has been determined. The UNKNOWN state is styled to recede into the background on purpose.

Changing this to a higher-contrast token would make UNKNOWN visually indistinguishable from LOW (cyan) or MODERATE (electric), undermining the threat-level communication hierarchy. Flagged as an accepted exception.

### Intentional exception: border tokens below WCAG 1.4.11

`--slate` (borders, `border-base`) and `--shadow` (subtle borders, `border-subtle`) both fail the 3:1 non-text contrast requirement against dark backgrounds. These borders are structural/decorative separators in the cyberpunk design system — they demarcate regions rather than convey interactive affordance or state. No interactive component relies solely on a `--slate` border to signal its interactive nature; buttons and inputs also use text labels, icons, or focus outlines.

Raising these tokens to 3:1 would require `--slate` to lighten from `#2a2a4a` to approximately `#4a4a6a`, which significantly alters the dark cyberpunk palette. The decision is to accept this exception for purely decorative structural separators and document it here. If interactive borders (e.g., form inputs) are ever styled with `--slate` alone, they should be revisited at that time.

---

## Regression guard

`src/contrast.test.ts` pins the hex values of `--fg-subtle` and `--fg-muted` against the 4.5:1 threshold on all three surface backgrounds. If either token is adjusted to a value that fails, the test catches it at CI.
