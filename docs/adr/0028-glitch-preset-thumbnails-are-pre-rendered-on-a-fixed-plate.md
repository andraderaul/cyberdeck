# ADR 0028 — GLITCH — Preset thumbnails are pre-rendered on a fixed plate, where ASCII draws on the user's Source

## Status

Accepted

**Date:** 2026-08-29 · **Deciders:** andraderaul · **Related:** issue #384

## Context

ASCII//Convert's Preset chips carry a live thumbnail of **the user's own Source**, converted through
each Preset (#367, #377). It is the better teaching surface by some distance: the row answers "what
would this do to *my* picture" rather than "what does this look like in general", and it costs
almost nothing, because ASCII//Convert's conversion is cheap and — this is the part that matters —
**scale-free**. Its params are a column count and a charset. Halve the frame and you get the same
picture with fewer cells; the look survives the shrink intact.

ADR 0015 set the discipline that someone who learns one program should not have to relearn the deck
for the next, so the obvious next move is to port that row into GLITCH//Studio. It does not survive
contact, and the reason is measurable rather than aesthetic.

**Five of GLITCH's eight Effects measure in absolute pixels**: `channelShift.amount`,
`wave.wavelength`, `halftone.cellSize`, the period Scanlines derives from its density, and
`pixelSort.runLength`. The Chain runs over a Source sampled to `MAX_SAMPLE_DIM` = 800px on its long
side, so a 96px chip is **8.3× down** and every one of those five params is exaggerated by that
factor:

| Preset | on the canvas (800px) | on a 96px chip |
|---|---|---|
| DEGAUSS, `wavelength 140` | 5.7 cycles — the slow bend the look is named for | **0.7** — a shear, not a wave |
| BILLBOARD, `cellSize 12` | 66 cells — a screen you look *at* | **8** — a mosaic |
| VAPORWAVE, `amount 14` | 1.75% of the frame — fringing | **15%** — a blatant RGB split |
| NEON RAIN, `runLength 160` | drips | **longer than the chip is tall** |

The gentle looks come back violent. `presets.ts` orders the roster deliberately gentlest-first so
the list reads as a dial, and the shrink collapses exactly the row meant to teach that. VAPORWAVE —
the look that opens the app *because* it leaves the Source plainly readable — would be the one that
lies most.

Rendering honestly therefore means rendering at full scale. Measured, `applyChain` over 800×500 for
all ten Presets costs **237 ms**; at 96×60 it is 2.9 ms but 8.3× dishonest. GLITCH also has **240 B
of `entry` budget left (74.76 / 75.00)** and **120 B of `lazy` (2.48 / 2.60)**, and the equivalent
ASCII feature cost 450 B — so a runtime port needs both ceilings raised as well as the 237 ms found
somewhere.

## Decision

**GLITCH//Studio's Preset thumbnails are pre-rendered at build time, over one fixed reference plate
the deck draws itself. ASCII//Convert deliberately keeps drawing on the user's own Source.**

This is a **recorded non-convergence** under ADR 0015, in the same register as that ADR's own
"mirror stays ASCII-only" — the parity being kept is of interaction *shell and pattern* (a row of
named Preset chips, each showing what its look does, in the same slot in both programs), not of
where the pixels come from. A future parity review must not "fix" it.

Rendering at build time dissolves both problems at once: the render happens at 800px, so every
absolute param lands exactly where it was curated, and the runtime cost is zero.

**The plate is a scene, not a calibration chart.** A test card would make the roster read as an
instrument readout rather than as ten looks, so the plate is a picture — and every element in it
still earns its place by provoking a specific Effect. A continuous sky gradient for Halftone and
Scanlines, which re-state tone and need some. Flat tower silhouettes at two depths for Block
Displacement, which has nothing to tear without a hard edge. A saturated off-centre disc for Channel
Shift and Chromatic Aberration, which are invisible until the channels are separable. A receding
ground grid for Wave, whose bend is only legible against something known to be straight. A scatter
of lit windows for Pixel Sort, which needs luminance variation along a run.

**The plate is drawn by us in code, and it is a build-time input rather than a shipped asset.** It
lives beside its generator under `scripts/`, which is outside every app's Vite root, so it cannot
reach the deployed site by accident. A ~130 KB PNG in `apps/glitch/public/` would be downloaded by
every visitor to render nothing: what ships is the thumbnails made *from* it.

**It is lossless, and its output is not.** The plate is the file ten Chains run over — Pixel Sort
reorders by luminance, Halftone averages a cell, Channel Shift displaces one channel — so a lossy
codec's ringing would be read as picture, amplified, and baked into all ten committed thumbnails.
The thumbnails are output and may be lossy; the plate is input and may not.

**It is deterministic.** The one scattered element, the lit windows, draws off a seeded mulberry32
stream rather than `Math.random`, so the generator run twice writes byte-identical bytes and the
diff on a committed binary keeps meaning something. Its colours are fixed literals, not Theme
tokens, and it sets no theme attribute — the same claim `CANVAS_BACKGROUND = '#0a0a0f'` makes in
ASCII//Convert's renderer (ADR 0013): a picture owns its own colours, and ten thumbnails rendered
against a plate that moved with the Theme would disagree with each other.

## Considered Alternatives

- **Scale each Preset's params down to fit the chip.**
  - *Pros:* Keeps the user's own Source in the thumbnail, which is the better teaching surface.
  - *Rejected because:* It is a second conversion path, and `apps/ascii/src/ascii/thumbnail.ts`'s
    header already forbids exactly it — *"a thumbnail cannot advertise something the chip does not
    apply."* A chip rendered at `wavelength 17` would be advertising a Preset that does not exist.
- **Render on the user's Source at full 800px, then downscale the result to the chip.**
  - *Pros:* Honest at the param level, and it is the user's own picture.
  - *Rejected because:* 237 ms for ten Presets, re-paid on every Source change and every Randomize,
    against ADR 0002's frame budget and a Worker (#316) that already has the live render to do. The
    bundle headroom above does not cover the feature either. Faithful and unaffordable.
- **Ship a photograph as the plate.**
  - *Pros:* No drawing to design or maintain.
  - *Rejected because:* A photograph is a licence, a provenance note and a JPEG's ringing, and it is
    also unadjustable — the plate has to be *tuned* to the Chains, and the first draft here had to
    be re-lit twice before CORRUPTED's threshold-0.7 sort found anything to reorder. A picture
    nobody can regenerate cannot be tuned, which is `social-assets.mjs`' doctrine applied to an
    input rather than to a card.
- **No thumbnails — keep GLITCH's Preset row as names alone.**
  - *Pros:* Zero cost, zero divergence to record.
  - *Rejected because:* GLITCH's Presets are the front door for a casual creator (`CONTEXT.md`), and
    a name is a poor description of a look. This is the surface most in need of a picture.

## Consequences

**Positive:**
- Every Preset thumbnail renders at the exact scale its params were curated at, so the roster's
  gentlest-first ordering survives into the row that is supposed to teach it.
- The runtime cost is zero: no Worker time, no `applyChain` on the front door, no bundle spent on a
  second render path.
- Ten thumbnails on one plate are comparable *to each other*, which a per-user Source can never be —
  the row reads as a dial rather than as ten unrelated pictures.
- The plate is regenerable, so it can be re-tuned the day a ninth Effect lands that it does not
  exercise.

**Negative:**
- **The chip no longer previews the user's own picture.** That is the real cost and it is not
  recoverable within this decision: a GLITCH thumbnail says "this is what the look is", where an
  ASCII chip says "this is what it would do to yours".
- **The deck now has two Preset-thumbnail models**, and the reason lives here rather than being
  legible from either program's code. A reader who sees only ASCII's model will find GLITCH's
  surprising.
- **A committed binary joins the repo's review surface.** A plate change is a diff nobody can read,
  which is why the generator, its seed and its dimensions are pinned by tests instead.
- **The plate must be re-tuned when a Preset is re-curated far enough.** A Preset is taste
  (`apps/glitch/CLAUDE.md`) and may move; a plate that stops exercising one is a silent failure with
  nothing in the toolchain to catch it.

## Related ADRs

- ADR 0013 — Canvas overlays own their background; a drawn surface owns its own fixed colours.
- ADR 0015 — Cross-program UX parity, and the discipline of recording deliberate non-convergences.
- ADR 0017 — GLITCH: the composable Effect Chain, and `applyChain` as a pure fold over Chain + Seed.
- ADR 0024 — Themes: a named, guarded visual language, from which a rasterised picture is exempt.

## Implementation Notes

The generator follows the split `social-assets.mjs` established: pure drawing in
`scripts/glitch/reference-plate.mjs` (no arguments in, one SVG string out), everything impure — the
filesystem, Chromium — in `scripts/glitch-reference-plate.mjs`. `npm run glitch:plate` regenerates
it; the committed file is `scripts/glitch/reference-plate.png`, 800×500. Playwright is already a
root devDependency for `test:e2e`, so the plate costs the repo no new tool; it needs Node 22+ and
`npx playwright install chromium`. The shell reads the written PNG's own IHDR back and refuses a
plate that did not rasterise at exactly 800×500, since that is the one failure mode that would
silently defeat the entire decision.

`apps/glitch/scripts/reference-plate.test.mjs` pins the width to `MAX_SAMPLE_DIM`, pins the
determinism (twice from one module instance, and once more from a fresh one), and pins the presence
of each element the table above names.

**Measured over the committed plate**, applying each Preset's Links one at a time: every Link of
every Preset moves at least 2% of the frame, except one. **PHOSPHOR's Scanlines move 0.35%**, and
that is a property of the Preset rather than of the plate — it was reproduced on flat grey control
sources, where it moves 0.00% at mid grey and 5.6% at near-white. PHOSPHOR's `cellSize` is 6 and its
density notch lands on a scanline period of exactly 6, so every dimmed row falls on the *top* row of
a Halftone cell, where the dot only reaches when the cell's own luminance clears ~0.62. The
thumbnail will therefore show a dot screen with almost no visible raster, which is honestly what the
Preset does at 800px. Nudging either number is a re-curation of a look, not a fix to a plate, and is
left to whoever wants to make that call.

## Questions / Future Work

- **Issue #385** renders the ten thumbnails from this plate. They are output and should be lossy
  WebP; the input rule above does not apply to them.
- **Whether the plate ever gains a second variant** — a portrait cut, a brighter cut — is open, and
  the answer should stay no while one plate exercises every Effect. Ten thumbnails comparable to
  each other is the property a second plate would spend.
