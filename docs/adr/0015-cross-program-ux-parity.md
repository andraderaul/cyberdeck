# Cross-program UX parity — ASCII adopts GLITCH's Source model, two surfaces cross into the kit

Status: the *shell form* here (desktop aside + mobile bottom sheet) is superseded by ADR 0020's
Control Strip; the parity discipline, the Source model, and the non-convergences stand.

ADR 0011/0012 keep the programs independent — each ships, versions, and deploys on its own. That
independence is about *release*, not *interaction*: someone who learns one program should not have to
relearn the deck for the next. GLITCH//Studio, built second, landed a cleaner Source model than
ASCII//Convert's, so we make GLITCH's model canonical and converge ASCII onto it — and the surfaces
that convergence makes empty-diff (`EmptyStateHero`, `Tooltip`) cross into the kit, continuing the
discipline ADR 0014 set.

## What converges

- **Single Source entry.** ASCII drops its always-present sidebar `UploadZone`; `EmptyStateHero`
  becomes the one place a Source is chosen, in both programs. The dual entry (sidebar + hero) was
  redundant *as an entry point* — a Source is picked once and cleared back to the hero, so the
  sidebar upload only duplicated the hero. On mobile the bottom sheet loses its `source`/`settings`
  tabs and becomes the control stack alone, matching GLITCH's already-tabless sheet.
- **Live controls move to the canvas overlay.** `UploadZone` was also the *only* desktop home for
  ASCII's live webcam controls — **mirror** and **switch-camera**. They move into the top-right
  canvas-overlay cluster beside `✕ clear` (ADR 0013), gated on `isLive`: same family as `clear`
  (both act on the Source, not the export). Icon-only on mobile (`⇋` / `⇄`) to hold the row.
- **Standardised empty state.** The two heroes were near-clones; GLITCH's version becomes canonical —
  a privacy tagline (`… nothing leaves your browser`) over a `max-w-[720px]` centered column —
  parameterised by a per-app `tagline` string (ASCII: "it gets converted right here — …"). This
  collapses the diff to that one string.

## What crosses the seam

- **`EmptyStateHero` → `@cyberdeck/deck-kit/ui`.** Unlike ADR 0014's extractions, this one was *not*
  already empty-diff — we deliberately converged the two heroes first, then extracted. The
  convergence is the decision; the extraction is its bookkeeping.
- **`Tooltip` → `@cyberdeck/deck-kit/ui`.** ADR 0014 parked `tooltip` explicitly: "one caller
  (ASCII); rises into the kit when a second caller appears." GLITCH is that second caller — this is
  the predicted trigger firing, nothing new. `Slider` already carried the `tooltip`/`tooltipId` slot;
  only the component needed a shared home.

## GLITCH gains tooltips — at Effect level, not everywhere

GLITCH's params are more esoteric than ASCII's (pixel sort, block displacement, seed), so tooltips
matter *more* there. Coverage is narrower than ASCII's, though: one tooltip per **Effect** section
label plus **Seed** — the five controllable Effects and the Seed, six in all — inside the `advanced`
panel. The front door (Presets, Randomize) stays tooltip-free: GLITCH is preset-first for a casual
creator, and the point of the front door is a good result in one click, not an education. Chromatic
Aberration has no control (presets only), so no tooltip. The Seed tooltip carries the most weight — it
draws the look-vs-arrangement line that Re-roll and Randomize otherwise blur.

## What deliberately does NOT converge

Recorded so a future parity review does not "fix" these:

- **Mirror stays ASCII-only.** GLITCH cannot mirror — its canvas *is* the output, so a mirrored
  preview would disagree with Capture (ADR 0014, already load-bearing). Parity is of *shell and
  pattern*, not of feature set.
- **Feature sets stay distinct.** ASCII keeps Analyze/AI and its charset/color model; GLITCH keeps
  Presets/Seed/Randomize. Convergence is the interaction shell, not the programs.
- **Release independence is untouched.** deck-kit is still consumed as source; each app still versions
  via its own changeset (ADR 0012). Parity does not couple deployments.

## Consequences

- ASCII's `UploadZone` is deleted and `MobileControls` loses its tab machinery. Mirror/switch-camera
  now depend on the canvas overlay being present — i.e. they exist only while `isLive`.
- Future reviews scope parity as "same interaction pattern + shared empty-diff surface," not
  "identical screens." The explicit non-convergences above are the boundary.
