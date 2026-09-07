# ADR 0030 — The space scale is named by role, not by size

## Status

Accepted

**Date:** 2026-09-07 · **Related:** issue #395 · **Executed by:** issue #399

## Context

The deck already knows this argument for colour. `text-accent`, never `text-violet`; a name that
says what a value *is for* survives a change of value, and a name that says how big or how purple
it is does not. Spacing never got the same treatment, and it shows in three ways.

**The ruler reads backwards at its tight end.** `--gap-xs` is 4px and `--gap-2xs` is 6px, so `xs`
is the *tighter* of the two — the opposite of how every other step reads and the opposite of what
`2xs` means everywhere else in the deck's vocabulary. The root `CLAUDE.md` records this as a wart
that "stands unresolved rather than decided", precisely because renaming one of two size names
into the other size name buys nothing: the pair would still be two sizes 2px apart with no rule
saying which one a contributor wants.

**There are two rulers under one set of utilities, and they do not share ends.** `--gap-*` runs
`2xs … 3xl`; `--sp-*`, the section macro scale, runs `xs … 2xl`. Both are keyed into Tailwind's
`spacing`, so both answer `p-`, `gap-` and `m-`. `gap-3xl` is real and `p-sp-3xl` renders nothing,
and only the step tells them apart. The scale guard carries a hand-written `SECTION_ONLY_GAPS`
list for exactly this, which is a guard paying rent for a distinction the design never needed.

**Most of the vocabulary is dead.** Counting every spacing utility across `apps/` and `packages/`,
excluding tests and the token/preset/guard files themselves, the two rulers spend **14 names on
212 callsites and 6 distinct live values**:

| token | px | callsites | token | px | callsites |
|---|---|---|---|---|---|
| `--gap-2xs` | 6 | **58** | `--gap-3xl` | 64 | **0** |
| `--gap-xs` | 4 | **43** | `--sp-xs` | 16 | **2** |
| `--gap-sm` | 8 | **73** | `--sp-sm` | 32 | **2** |
| `--gap-md` | 16 | **19** | `--sp-md` | 64 | **0** |
| `--gap-lg` | 24 | **12** | `--sp-lg` | 96 | **0** |
| `--gap-xl` | 32 | **3** | `--sp-xl` | 128 | **0** |
| `--gap-2xl` | 48 | **0** | `--sp-2xl` | 160 | **0** |

Eight of the fourteen names have never been used. The macro ruler's only two live steps are
`p-sp-xs` at 16px and `py-sp-sm` at 32px — pixel-identical to `--gap-md` and `--gap-xl`, which the
other ruler already provides — and both live in one file, `apps/deck/src/app.tsx`. The second
ruler is not a second register. It is four dead names, two duplicates and one trap.

## Decision

**The deck's space ruler is named by role.** Five tokens replace both rulers:

| new token | px | replaces | callsites moved |
|---|---|---|---|
| `--space-tight` | 6 | `--gap-2xs` (6px) **and** `--gap-xs` (4px) | 101 |
| `--space-item` | 8 | `--gap-sm` | 73 |
| `--space-group` | 16 | `--gap-md` + `--sp-xs` | 21 |
| `--space-stack` | 24 | `--gap-lg` | 12 |
| `--space-section` | 32 | `--gap-xl` + `--sp-sm` | 5 |

They name relationships, not magnitudes: *tight* is inside one control, *item* is between siblings
in a cluster, *group* is between clusters in a panel, *stack* is between blocks in a column,
*section* is between regions of a page. The Tailwind keys follow — `gap-tight`, `px-item`,
`py-section`.

**The rename is clean. There is no alias window.** Both spellings living side by side is exactly
how the deck arrived here: ADR 0024 found that when the preset exposes two vocabularies at once,
the shorter one keeps winning and the promotion never finishes. A window would leave `gap-sm` and
`gap-item` both valid and the guard unable to object to either.

**The 4px/6px pair collapses into one token, and this is what closes the wart.** Two steps 2px
apart cannot be told apart by role — nobody can state the rule that sends one gap to 4 and its
neighbour to 6, which is why the ordering confusion was possible in the first place. 6px survives
because it carries more callsites (58 against 43) and because the 43 that move get *looser*, never
tighter: no control anywhere on the deck ends up more cramped than it is today. `--space-tight`
against `--space-item` has no order to get backwards.

**`--sp-*` is deleted outright, not renamed.** Its two live steps merge into `--space-group` and
`--space-section` at their existing pixel values, so `apps/deck/src/app.tsx` changes spelling and
not layout. Its four unused steps — 64, 96, 128, 160px — go with it, as do `--gap-2xl` (48px) and
`--gap-3xl` (64px), on the same evidence: zero callsites.

**Deleting the big end is safe because a role scale cannot be extrapolated.** The failure the
current guard exists to catch is someone reaching past the end of a size scale — `gap-3xs`,
`p-4xl` — and getting a class Tailwind silently declines to generate. There is no step after
`section` to guess at. A design that genuinely needs 96px between two regions has to add a *named
role* to the kit, deliberately, which is the review this ruler should have been forcing all along.

**`borderRadius` stays out of scope.** It keeps `none · xs · sm · md · pill`.

## Considered Alternatives

- **Rename only the inverted pair** (`--gap-hair` 4px beside `--gap-tight` 6px).
  - *Pros:* the smallest possible diff; touches 101 callsites instead of 212.
  - *Cons:* leaves two rulers, eight dead names and the `p-sp-3xl` trap standing, and keeps two
    tokens 2px apart with no rule separating them.
  - *Rejected because:* it renames the symptom. The pair is confusable because it is redundant.

- **An alias window** — both spellings valid for a release, old ones then removed.
  - *Pros:* no big-bang diff; each program migrates on its own schedule.
  - *Cons:* the guard cannot object to either spelling while both are legal, so the window is
    exactly the period with no enforcement.
  - *Rejected because:* ADR 0024 measured what happens next — the shorter of two live spellings
    wins and the promotion stalls. Every consumer is in this repo; there is no external caller to
    be kind to.

- **Renaming `borderRadius` too** (`--radius-control / surface / panel`).
  - *Pros:* symmetry; the same doctrine applied to the third scale.
  - *Cons:* radius has no inversion to fix — `xs`(2) < `sm`(4) < `md`(6) < `pill` reads correctly —
    and it *already has* a role layer one level up: `--card-radius`, `--btn-radius` and
    `--input-radius` all resolve to `--radius-xs`, and components consume those. Of the five size
    steps, `rounded-xs` (26 uses), `rounded-sm` (4) and `rounded-pill` (5) are live; `none` and
    `md` are not.
  - *Rejected because:* the rename would collapse three role names that already exist into three
    role names that mean the same thing. Revisit when a component role stops resolving to
    `--radius-xs`, or when a step lands whose ordering is ambiguous — neither is true today.

- **Flipping the scale guard from a deny list to an allow list** over the spacing utilities.
  - *Pros:* strictly stronger; rejects the old names and future typos with one rule and no list to
    maintain.
  - *Cons:* measured against the real sources, it fires on prose — `bottom-anchored`,
    `left-to-right`, `top-level`, `right-hand`, `top-to-bottom.` all match `utility-<word>` inside
    comments and strings.
  - *Rejected because:* a guard that cries wolf stops being read, which is the reason the deny
    list exists in the first place (`theme/audit.ts`).

## Consequences

**Positive:**
- The wart is closed by construction rather than patched: `--space-tight` and `--space-item` have
  no ordering to read backwards.
- One ruler under the spacing utilities. `SECTION_ONLY_GAPS`, and the class of bug it guards,
  cease to exist.
- 14 names become 5, and 8 dead tokens leave the stylesheet.
- Adding macro spacing back becomes a design decision with a name attached, not an extrapolation.

**Negative:**
- A one-off promotion of 212 callsites across all five workspaces plus the kit — behaviour-zero
  except for one deliberate change, and wide. Like ADR 0024's promotion it must ship alone.
- 43 callsites move from 4px to 6px. Individually invisible, collectively a real change to the
  tightest chrome on the deck, and the reason the promotion needs a visual pass rather than only a
  green build.
- Every program takes a patch bump for a change none of them asked for, because the kit is
  versioned and internal dependents bump on change.
- Anyone arriving from another codebase now meets a spacing vocabulary that is not Tailwind's, in
  a repo whose other scales still are.

## Related ADRs

- ADR 0024 — Themes, named and guarded: supplies the doctrine this extends from colour to spacing,
  and the measured evidence against letting two vocabularies live side by side.
- ADR 0014 — Deck Kit: `tokens.css`, the Tailwind preset and the guards all live in the kit, which
  is why one rename reaches every program.
- ADR 0020 — Control Strip: the single control grammar these gaps are spent on.

## Implementation Notes

Executed by issue #399, not here. The order is: kit first, then the four programs.

1. `packages/deck-kit/src/tokens.css` — the `Spacing — Sections` and `Spacing — Internal gaps`
   blocks (around lines 142–156) become one `Spacing — by role` block of five tokens.
2. `packages/deck-kit/src/tailwind-preset.js` — `theme.extend.spacing` becomes exactly
   `{ tight, item, group, stack, section }`. Nothing else in the preset moves.
3. `packages/deck-kit/src/ui/toast-provider.tsx:38` — the only raw token reference outside
   `tokens.css`: `var(--gap-md)` twice, both to `var(--space-group)`.
4. The 212 class callsites, per the mapping table above. `apps/deck/src/app.tsx` carries all four
   `sp-*` uses: `py-sp-xs`/`mt-sp-xs` → `py-group`/`mt-group`, `sm:py-sp-sm`/`sm:mt-sp-sm` →
   `sm:py-section`/`sm:mt-section`.
5. `CLAUDE.md` — the scale table's `spacing` and `sp-*` rows become one role row, and the wart
   paragraph is deleted rather than rewritten. It is closed, not amended.

**The scale guard** (`packages/deck-kit/src/theme/audit.ts`) changes shape, and rejecting the old
names is the point of the change — a rename nothing objects to creeps back one callsite at a time.

- `SCALE_UTILITIES` splits into `SPACING_UTILITIES` (the padding, margin, gap, space, inset,
  position, translate and indent families) and `RADIUS_UTILITIES` (the four `rounded*`). The split
  is forced: `rounded-xs` stays real while `p-xs` becomes dead, so one shared step list can no
  longer serve both.
- A new `RETIRED_SPACING_STEPS` bans the entire old vocabulary under the spacing utilities:
  `2xs xs sm md lg xl 2xl 3xl`, every `sp-` spelling, and the extrapolations `3xs 4xs 5xs 4xl 5xl`.
  `gap-sm` must fail the build with the class, the file and the line, exactly as `text-violet`
  does.
- `SECTION_ONLY_GAPS` is deleted with the ruler it described.
- `EXTRAPOLATED_STEPS` survives, scoped to `RADIUS_UTILITIES` alone.
- Exact `utility-step` pair matching stays (`findBannedClasses`), for the prose reason recorded
  under Considered Alternatives.
- The completeness test in `vocabulary.test.ts` keeps asserting that no banned name is a preset
  key, per family, and gains its mirror: `theme.extend.spacing` must contain the five role keys and
  *only* those five. That is what makes the ban un-undoable — re-adding `xs` to the preset fails
  the guard's own test instead of quietly un-banning the name.

## Questions / Future Work

- 48px, 64px and above have no role name and no callsite. The first design that needs one names it
  in the kit; the ruler is meant to grow that way and not by extrapolation.
- `fontSize` remains unguarded and unaddressed here — `text-` is three namespaces at once, so no
  deny list over it is decidable. The role-naming argument applies to it, the enforcement does not.
