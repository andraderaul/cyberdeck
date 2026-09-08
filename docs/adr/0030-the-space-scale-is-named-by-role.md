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

Six of the fourteen names have never been used. The macro ruler's only two live steps are
`p-sp-xs` at 16px and `py-sp-sm` at 32px — pixel-identical to `--gap-md` and `--gap-xl`, which the
other ruler already provides — and both live in one file, `apps/deck/src/app.tsx`. The second
ruler is not a second register. It is four dead names, two duplicates and one trap.

## Decision

**The deck's space ruler is named by role.** Six tokens replace both rulers:

| new token | px | replaces | classes moved |
|---|---|---|---|
| `--space-hairline` | 4 | the 16 `--gap-xs` classes that sit over the canvas | 16 |
| `--space-tight` | 6 | `--gap-2xs` (58) **and** the other 26 `--gap-xs` | 84 |
| `--space-item` | 8 | `--gap-sm` | 73 |
| `--space-group` | 16 | `--gap-md` + `--sp-xs` | 21 |
| `--space-stack` | 24 | `--gap-lg` | 12 |
| `--space-section` | 32 | `--gap-xl` + `--sp-sm` | 5 |

211 of the 212. The one left over is `group-hover:translate-x-xs`, and it is not a spacing
relationship at all — see *the vocabulary governs the between-element utilities* below.

They name relationships, not magnitudes: *hairline* is chrome measured against the user's picture,
*tight* is chrome measured against itself, *item* is between siblings in a cluster, *group* is
between clusters in a panel, *stack* is between blocks in a column, *section* is between regions of
a page. The Tailwind keys follow — `gap-tight`, `px-item`, `py-section`.

**The rename is clean. There is no alias window.** Both spellings living side by side is exactly
how the deck arrived here: ADR 0024 found that when the preset exposes two vocabularies at once,
the shorter one keeps winning and the promotion never finishes. A window would leave `gap-sm` and
`gap-item` both valid and the guard unable to object to either.

**4px survives as `--space-hairline`, and the rule that separates it from `tight` is one line:
hairline is chrome measured against the user's picture; tight is chrome measured against itself.**
That is the rule `xs` against `2xs` could never state, and stating it is the whole difference. The
wart was never *two values 2px apart* — it was two values 2px apart with **nothing** to send a
contributor to one rather than the other, so the only thing left to read was the size names, and
those read backwards. Six role names where there were two size names is therefore not the same
situation with more entries: every one of the six answers a question about the callsite, and the
one that used to have no answer now has the sharpest one on the list. Reach for `hairline` only
when the thing on the other side of the gap is the user's artwork.

**Collapsing 4px into 6px would have charged the picture for its own controls.** Sixteen of the 43
`--gap-xs` classes are canvas overlays — the LIVE/REC cluster in ASCII//Convert and
GLITCH//Studio, and SPRAWL//Atlas's export controls, scale reader, basemap toggle and provenance
credit. Root `CLAUDE.md` already fences this ground: over the canvas the backdrop is the user's
artwork (ADR 0013) or the piece itself (ADR 0021), so that chrome "stays at its drawn size …
precisely so the picture isn't charged for its own controls", and growing a glyph there is named as
"the same charge by another route". Growing an overlay's inset *and* its internal gap by 2px is that
charge by a third route, and it is the route where the framing inverts: everywhere else on the deck
4px → 6px is a control breathing, but on an overlay looser means **more of the picture covered**. A
rule the deck already enforces for glyph size decides this one; it does not need a new argument.

**The vocabulary governs the between-element utilities.** The six names describe a relationship
between two things, which is a reading `p*`, `m*`, `gap*` and `space-*` carry and the rest of the
guarded set does not. Two families need saying out loud, because a role name alone does not settle
them and the size names never had to:

- `inset`, `inset-x/y` and `top/right/bottom/left` measure an offset from a container edge rather
  than a gap between siblings. On this deck every live one of them is an overlay's inset from the
  canvas edge — which is exactly the hairline case, so the family is in the vocabulary but only
  `hairline` and `tight` have a reading there. `top-section` would be a class nobody can defend.
- `translate-x/y` and `indent` are not spacing. `group-hover:translate-x-xs` on
  `apps/deck/src/components/program-card.tsx:36` is a *hover travel distance*, and no reading of
  any of the six describes it — calling it `translate-x-tight` would be the same misuse of a role
  name the ADR is trying to stop, one namespace over, and quietly turning it into 6px is a 50%
  change to a motion. It becomes `translate-x-[4px]`: an arbitrary value, which is already the
  deck's idiom for a one-off measurement (`min-h-[44px]`).

The guard keeps banning retired steps across all of these utilities — that is what stops `gap-sm`
creeping back — but the ADR does not claim `section` means anything as a `translate-y`.

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
  - *Cons:* leaves two rulers, six dead names and the `p-sp-3xl` trap standing, and keeps two
    tokens 2px apart with no rule separating them — `hair` against `tight` is still two sizes.
  - *Rejected because:* it renames the symptom. What separates 4px from 6px is a rule about what
    sits on the other side of the gap, and no pair of size-ish names can carry it.

- **Collapsing 4px into 6px**, so the ruler has five roles and no hairline.
  - *Pros:* one fewer name; nobody has to decide between two tokens 2px apart.
  - *Cons:* 16 of the 43 classes are canvas overlays, where 2px looser means 2px more of the user's
    artwork covered — the charge ADR 0013 and ADR 0021 exist to refuse.
  - *Rejected because:* "the 43 that move get *looser*, never tighter" is benign for a panel and
    backwards for an overlay, and the deck already decided that case for glyph size.

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
    `left-to-right`, `top-level`, `top-to-bottom.` all match `utility-<word>` inside comments and
    strings.
  - *Rejected because:* a guard that cries wolf stops being read, which is the reason the deny
    list exists in the first place (`theme/audit.ts`).

## Consequences

**Positive:**
- The wart is closed by construction rather than patched: `--space-hairline` and `--space-tight`
  have no ordering to read backwards, and — unlike `xs` and `2xs` — a stated rule for which one a
  callsite wants.
- One ruler under the spacing utilities. `SECTION_ONLY_GAPS`, and the class of bug it guards,
  cease to exist.
- 14 names become 6, and 6 dead tokens leave the stylesheet.
- Adding macro spacing back becomes a design decision with a name attached, not an extrapolation.
- The overlay chrome gets a token that says why it is 4px, so the next contributor to touch it has
  ADR 0013 and ADR 0021 in the class name rather than in a comment they might not read.

**Negative:**
- A one-off promotion of 212 callsites across all five workspaces plus the kit — behaviour-zero
  except for one deliberate change, and wide. Like ADR 0024's promotion it must ship alone.
- 26 classes move from 4px to 6px. Individually invisible, collectively a real change to the
  tightest panel chrome on the deck, and the reason the promotion needs a visual pass rather than
  only a green build. The 16 that sit over a canvas do not move.
- Six roles is one more than the ruler strictly needs, and the sixth is the one a contributor is
  most likely to reach for by mistake, because `hairline` reads like "a bit tighter than tight". The
  name is only worth its place while the rule beside it is read.
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
- ADR 0013 — Canvas overlays own their background: establishes that the backdrop of overlay chrome
  is the user's artwork, which is the distinction `--space-hairline` names.
- ADR 0021 — SPRAWL//Atlas, a piece not a tool: the same ground where there is no user input, so
  the thing the chrome must not cover is the piece itself. Four of the six hairline lines are its.

## Implementation Notes

Executed by issue #399, not here. The order is: kit first, then the four programs.

1. `packages/deck-kit/src/tokens.css` — the `Spacing — Sections` and `Spacing — Internal gaps`
   blocks, lines **141** (`/* Spacing — Sections */`) through **157** (`--gap-3xl: 64px;`), become
   one `Spacing — by role` block of six tokens.
2. `packages/deck-kit/src/tokens.css` again, further down — **`tokens.css` is a consumer of its own
   spacing tokens, not only their declaration site**, and the three references live far enough from
   the block above to be missed by a reader editing it:
   - `:192 --card-padding: var(--gap-xl)` → `var(--space-section)`
   - `:193 --card-gap: var(--gap-lg)` → `var(--space-stack)`
   - `:248 --section-gap: var(--gap-2xl)` — deleted with `--gap-2xl`. 48px has no role and no
     consumer.

   Nothing renders wrong today if these are missed, because all three derived tokens are themselves
   unreferenced (verified: no `--card-padding`, `--card-gap` or `--section-gap` outside their own
   declarations). **No guard would catch it either** — `resolveTokens` in `audit.ts` returns an
   unresolved `var()` as written (`raw[name] ?? whole`), so a dangling reference resolves to the
   literal string and #399 ships green. That is why this is a step rather than a footnote.
3. `packages/deck-kit/src/ui/toast-provider.tsx:38` — the only raw token reference outside
   `tokens.css`: `var(--gap-md)` twice, both to `var(--space-group)`. (Only — literally true, and
   exactly the phrasing that hid step 2.)
4. The 212 class callsites, per the mapping table above. Three groups are not a mechanical
   step-for-step rename:
   - the 16 hairline classes, on six lines: `apps/ascii/src/components/ascii-canvas.tsx:173`,
     `apps/glitch/src/components/glitch-canvas.tsx:252`,
     `apps/sprawl/src/components/export-controls.tsx:48`,
     `apps/sprawl/src/components/scale-reader.tsx:20`,
     `apps/sprawl/src/components/basemap-toggle.tsx:30`, `apps/sprawl/src/app.tsx:110`. Every
     `top/right/bottom/left-xs` and `gap-xs` on those six lines becomes `-hairline`; every other
     *spacing-utility* `-xs` becomes `-tight`. `text-xs` and `rounded-xs` are other scales and do
     not move at all — this is a per-utility rewrite, never a search-and-replace on `-xs`.
   - `apps/deck/src/components/program-card.tsx:36` — `group-hover:translate-x-xs` →
     `group-hover:translate-x-[4px]`, not a role name.
   - `apps/deck/src/app.tsx` carries all four `sp-*` uses: `py-sp-xs`/`mt-sp-xs` →
     `py-group`/`mt-group`, `sm:py-sp-sm`/`sm:mt-sp-sm` → `sm:py-section`/`sm:mt-section`.
5. The documentation that describes the old ruler and goes stale the moment it ships:
   - `CLAUDE.md` — the scale table's `spacing` and `sp-*` rows become one role row, and the wart
     paragraph is deleted rather than rewritten. It is closed, not amended.
   - `CLAUDE.md:151-152` — "the two spacing rows do **not** share ends: `gap-3xl` is real and
     `p-sp-3xl` is not". There is one row after this, so the sentence describes nothing.
   - `packages/deck-kit/CONTEXT.md:62-64` — the *Guarda de escala* paragraph, on why `sp-*` is
     banned step by step rather than by prefix and on the `p-sp-2xl` / `p-sp-3xl` trap. Both the
     reason and the trap go with the scale.
   - `CONTEXT-MAP.md:62-67` — the space-ruler sentence still ends "até lá o código ainda fala as
     duas réguas antigas", which stops being true here.

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
- **`findUndefinedScales` changes signature, not only its data.** Today `audit.ts:307` exports one
  flat `UNDEFINED_SCALE_NAMES` and `:375` takes it as `names = UNDEFINED_SCALE_NAMES` — a default
  the 12 fixture assertions in `audit.test.ts` override and `vocabulary.test.ts:80` relies on. Once
  the bans split into two families keyed to two *different* utility sets, one `names` default
  cannot serve both. Replace it with one exported list of families —
  `SCALE_BANS: { utilities, steps }[]`, defaulted as `families = SCALE_BANS` — and let the function
  concatenate a `findBannedClasses` pass per family, re-sorted by line so a failure still reads
  like a gutter. The fixture tests pass a one-family list; the injection seam survives.
- **The completeness test in `vocabulary.test.ts:70-76` must be split, not preserved.** It pools
  four key sources — the preset's `spacing` and `borderRadius`, and Tailwind's own two — into one
  `defined` set, then asserts no banned name is in it. That works only while the two families ban
  the same names. `RETIRED_SPACING_STEPS` carries `xs sm md lg xl 2xl 3xl`; `xs`, `sm` and `md` are
  keys of the preset's `borderRadius` and `sm md lg xl 2xl 3xl` are keys of Tailwind's, so the
  pooled assertion goes non-empty on day one — and an implementer who read "keeps asserting" meets
  a red test and is likeliest to weaken it rather than split it. Check each family against its own
  pair: spacing bans against `preset.theme.extend.spacing` ∪ `defaultTheme.spacing`, radius bans
  against `preset.theme.extend.borderRadius` ∪ `defaultTheme.borderRadius`.
- That test also gains its mirror: `theme.extend.spacing` must contain the six role keys and *only*
  those six. That is what makes the ban un-undoable — re-adding `xs` to the preset fails the
  guard's own test instead of quietly un-banning the name.

**#399's acceptance criteria.** The issue asks for *"sem mudança visual: E2E passa e a ausência de
diff de pixel está demonstrada, não afirmada"*. `--space-hairline` buys most of that back — the
overlays, which are the only chrome sitting on a surface a pixel diff would flag, do not move — but
**26 classes still change by 2px**, so a literal zero-pixel-diff cannot be demonstrated. Amend the
criterion to **no *unintended* visual change**, against this enumerated intended diff: the 26
`--gap-xs` classes that are not on the six overlay lines above go 4px → 6px. Everything else,
including all 16 hairline classes, the `translate-x-[4px]` rewrite and all four `sp-*` uses, is
pixel-identical, and *that* is the part to demonstrate rather than assert.

## Questions / Future Work

- 48px, 64px and above have no role name and no callsite. The first design that needs one names it
  in the kit; the ruler is meant to grow that way and not by extrapolation.
- `fontSize` remains unguarded and unaddressed here — `text-` is three namespaces at once, so no
  deny list over it is decidable. The role-naming argument applies to it, the enforcement does not.
