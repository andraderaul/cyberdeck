# ADR 0015 — Cross-program UX parity — ASCII adopts GLITCH's Source model, two surfaces cross into the kit

## Status

Accepted (the *shell form* here — desktop aside + mobile bottom sheet — is superseded by ADR 0020's
Control Strip; the "Mirror stays ASCII-only" point is superseded by ADR 0016; the parity discipline,
the Source model, and the remaining non-convergences stand)

## Context

ADR 0011/0012 keep the programs independent — each ships, versions, and deploys on its own. That
independence is about *release*, not *interaction*: someone who learns one program should not have to
relearn the deck for the next. GLITCH//Studio, built second, landed a cleaner Source model than
ASCII//Convert's, so the opportunity is to make GLITCH's model canonical and converge ASCII onto it —
and to let the surfaces that convergence makes empty-diff (`EmptyStateHero`, `Tooltip`) cross into the
kit, continuing the discipline ADR 0014 set.

## Decision

Make GLITCH's Source model canonical and converge ASCII onto it, extracting the two surfaces that
convergence renders empty-diff into `@cyberdeck/deck-kit`. Concretely:

**Single Source entry.** ASCII drops its always-present sidebar `UploadZone`; `EmptyStateHero` becomes
the one place a Source is chosen, in both programs. The dual entry (sidebar + hero) was redundant *as
an entry point* — a Source is picked once and cleared back to the hero, so the sidebar upload only
duplicated the hero. On mobile the bottom sheet loses its `source`/`settings` tabs and becomes the
control stack alone, matching GLITCH's already-tabless sheet.

**Live controls move to the canvas overlay.** `UploadZone` was also the *only* desktop home for
ASCII's live webcam controls — **mirror** and **switch-camera**. They move into the top-right
canvas-overlay cluster beside `✕ clear` (ADR 0013), gated on `isLive`: same family as `clear` (both act
on the Source, not the export). Icon-only on mobile (`⇋` / `⇄`) to hold the row.

**Standardised empty state.** The two heroes were near-clones; GLITCH's version becomes canonical — a
privacy tagline (`… nothing leaves your browser`) over a `max-w-[720px]` centered column —
parameterised by a per-app `tagline` string (ASCII: "it gets converted right here — …"). This collapses
the diff to that one string.

**Two surfaces cross the seam.**

- **`EmptyStateHero` → `@cyberdeck/deck-kit/ui`.** Unlike ADR 0014's extractions, this one was *not*
  already empty-diff — the two heroes were deliberately converged first, then extracted. The
  convergence is the decision; the extraction is its bookkeeping.
- **`Tooltip` → `@cyberdeck/deck-kit/ui`.** ADR 0014 parked `tooltip` explicitly: "one caller (ASCII);
  rises into the kit when a second caller appears." GLITCH is that second caller — this is the predicted
  trigger firing, nothing new. `Slider` already carried the `tooltip`/`tooltipId` slot; only the
  component needed a shared home.

**GLITCH gains tooltips — at Effect level, not everywhere.** GLITCH's params are more esoteric than
ASCII's (pixel sort, block displacement, seed), so tooltips matter *more* there. Coverage is narrower
than ASCII's, though: one tooltip per **Effect** section label plus **Seed** — the five controllable
Effects and the Seed, six in all — inside the `advanced` panel. The front door (Presets, Randomize)
stays tooltip-free: GLITCH is preset-first for a casual creator, and the point of the front door is a
good result in one click, not an education. Chromatic Aberration has no control (presets only), so no
tooltip. The Seed tooltip carries the most weight — it draws the look-vs-arrangement line that Re-roll
and Randomize otherwise blur.

**What deliberately does NOT converge** — recorded so a future parity review does not "fix" these:

- **Mirror stays ASCII-only.** GLITCH cannot mirror — its canvas *is* the output, so a mirrored preview
  would disagree with Capture (ADR 0014, already load-bearing). Parity is of *shell and pattern*, not of
  feature set. (This point is later reversed by ADR 0016, which brings mirror to GLITCH by flipping the
  pixels rather than the preview.)
- **Feature sets stay distinct.** ASCII keeps Analyze/AI and its charset/color model; GLITCH keeps
  Presets/Seed/Randomize. Convergence is the interaction shell, not the programs.
- **Release independence is untouched.** deck-kit is still consumed as source; each app still versions
  via its own changeset (ADR 0012). Parity does not couple deployments.

## Considered Alternatives

- **Keep ASCII's dual Source entry (sidebar `UploadZone` + hero) and let each program diverge.**
  - *Cons:* The sidebar upload only duplicated the hero as an entry point; two programs would present
    two different Source models, forcing a re-learn from one to the next.
  - *Rejected because:* The parity goal is precisely to make the interaction shell learnable once; the
    redundant entry point is deleted rather than preserved.
- **Extract the shared heroes as-is without converging them first.**
  - *Cons:* The two heroes were only near-clones, not empty-diff — extracting them raw would carry the
    divergence into the kit.
  - *Rejected because:* The extraction bar is empty-diff; convergence is the decision, and extraction is
    just its bookkeeping.

## Consequences

**Positive:**
- A single Source model spans both programs, so learning one program carries to the next.
- `EmptyStateHero` and `Tooltip` become shared kit surfaces, continuing ADR 0014's extraction
  discipline; the empty-state diff collapses to one per-app `tagline` string.
- GLITCH gains targeted, Effect-level tooltips where its esoteric params need them, without cluttering
  the preset-first front door.

**Negative:**
- ASCII's `UploadZone` is deleted and `MobileControls` loses its tab machinery. Mirror/switch-camera now
  depend on the canvas overlay being present — i.e. they exist only while `isLive`.
- Future reviews must scope parity as "same interaction pattern + shared empty-diff surface," not
  "identical screens." The explicit non-convergences above are the boundary, and a review must respect
  them rather than "fix" them.

## Related ADRs

- ADR 0011 — Monorepo under the CYBERDECK umbrella.
- ADR 0012 — Changesets for per-app versioning.
- ADR 0013 — Canvas overlays own their background.
- ADR 0014 — The Deck Kit — first extracted shared package.
- ADR 0016 — GLITCH gains mirror — in the pixel pipeline, not in CSS.
- ADR 0020 — Control Strip — a bottom tabbed surface becomes the single control grammar.
- ADR 0028 — GLITCH's Preset thumbnails are pre-rendered on a fixed plate, where ASCII draws on the
  user's Source — a later non-convergence, recorded under this ADR's discipline rather than against
  it.

## Supersedes / Superseded by

- **Superseded (in part) by** ADR 0020 — its shell form (desktop aside + mobile bottom sheet), replaced
  by the Control Strip; the parity discipline stands.
- **Superseded (in part) by** ADR 0016 — the "Mirror stays ASCII-only" point; mirror comes to GLITCH via
  a real pixel flip.
