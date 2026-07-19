# Control Strip — a bottom tabbed surface becomes the single control grammar

Status: accepted — supersedes the *shell form* of ADR 0015 (aside + mobile bottom sheet); the
parity discipline itself stands.

On mobile, the control surface ADR 0015 converged on — a floating trigger opening a
`MobileBottomSheet` that carries the desktop aside's stack — occludes the canvas while it is open.
Editing is blind: adjust a slider, close the sheet, look, reopen. For programs whose whole point is
live visual feedback, that is a structural defect of the sheet, not a density or ergonomics problem
inside it. We replace the shell with the **Control Strip**: a horizontal, bottom-anchored surface
with three tabs — **PRESETS | EDIT | OUT** — that keeps the canvas visible at all times and puts
one control in focus at a time, the grammar mobile photo editors (Instagram, VSCO) proved.

The Strip is the single grammar at **both breakpoints**, not a mobile accommodation. The desktop
aside worked, but a mobile-only strip would leave two control grammars in one program; and the
horizontal form is not neutral here — GLITCH's Chain processes in order, so a left→right row of
Links makes the layout *express* ADR 0017 instead of stacking it. Desktop keeps the same anatomy
with adaptive density: where width allows, the active control's panel shows its whole group (all
params of the active Link; sibling sliders side by side) instead of mobile's one-at-a-time.

## The tabs

- **PRESETS** — the opening tab: Preset chips in a horizontal row (plus Randomize in GLITCH).
  ADR 0015's hierarchy survives the new shell: Presets stay the front door, fine editing stays one
  step behind. `advanced` stops being a vertical Disclosure and becomes the EDIT tab.
- **EDIT** — in ASCII, tool chips (charset, color mode, resolution, brightness, contrast); tap one
  to focus its control above the strip. In GLITCH, the Chain itself as a row of Link chips in
  processing order: tap a Link for its params, drag to reorder, a `+` chip for the add palette,
  duplicate/remove as actions on the active Link's panel. Structural editing (ADR 0017) keeps full
  parity across breakpoints — a mobile user can build a look from scratch.
- **OUT** — the output actions (PNG Export, Capture, Copy, Record). The always-visible ExportBar
  dies; export is the session's terminal action and affords a tab switch. The one stateful output,
  Recording, must remain stoppable from any tab: the existing REC badge on the canvas (ADR 0013)
  becomes the tappable stop control, carrying the timer — no new chrome.

## Considered and rejected

- **Fixing the sheet** (reorganising, shortening, better sliders) — rejected: occlusion is the
  diagnosed defect and no sheet layout removes it.
- **Mobile-only strip, desktop aside stays** — rejected for the single grammar, accepting the cost
  that desktop one-tap-per-tool is slower than an always-visible panel; adaptive density is the
  mitigation.
- **Flattening Presets and tools into one row** — rejected: it would revoke ADR 0015's progressive
  disclosure and mix "a good look in one tap" with fine editing.

## Rollout

GLITCH first — the Chain is the stress case; if the anatomy survives it, ASCII is the easy port.
ASCII then copies the proven anatomy. Only what lands empty-diff with two callers (likely the
tab/strip shell) crosses into deck-kit afterwards — ADR 0014's bar is unchanged; the shell is
**not** extracted up front.

## What crossed the seam, and what did not

Recorded from the extraction slice, so a future review re-running the diff does not re-suggest
either half — the same treatment `use-webcam-state` got in ADR 0014.

- **Extracted: the shell** (`TabStrip` in `@cyberdeck/deck-kit/ui`). The tablist markup, the
  selected-tab state and the single mounted panel were byte-identical between the two programs —
  ADR 0014's bar met exactly. Panels arrive through a render-prop child rather than a
  `Record<id, node>`, so "only the active panel is mounted" stays structural rather than a
  convention each caller has to keep.
- **Left copied: the tab set.** `TABS` is identical in both apps today and stays in both. It is a
  program's vocabulary, and vocabulary never crosses the seam (ADR 0014) — a kit that named the
  tabs would decide what a program on the deck is allowed to be. The identity is this ADR being
  applied twice, not a shared module.
- **Left copied: the panels.** The Chain row, the tool chips and the output actions are domain
  surface. Their *anatomy* is shared; their contents are each app's.
- **Divergent on purpose: the REC badge's background.** GLITCH's carries `bg-bg` because its canvas
  *is* the output and any pixel can sit under the chip; ASCII's `paintFrame()` fills the canvas
  first, so the overlay already stands on the audited pair (ADR 0013). Identical-looking, different
  for a reason.

## Consequences

- The desktop `aside`, the floating `⚙ controls` trigger, `MobileControls`, and `ExportBar` are
  replaced by the Strip in both programs.
- `MobileBottomSheet` loses its only two callers and is removed from `@cyberdeck/deck-kit/ui`.
- The `advanced` Disclosure disappears from both programs' control surfaces; the local `Disclosure`
  primitive likely dies with it.
- ADR 0015's non-convergences (feature sets, release independence) and its parity scope — "same
  interaction pattern, not identical screens" — are untouched. GOLEM is untouched by construction:
  it has no control panel to migrate (ADR 0018).
