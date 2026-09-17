# ADR 0013 — Canvas overlays own their background

## Status

Accepted

## Context

ADR 0009 audited this deck's contrast the only way an audit can work: token against token. Every
ratio in it pairs a foreground token with one of three known surfaces — `--void`, `--abyss`,
`--shadow` — and the guard it left behind (`contrast.test.ts`) pins those pairs by hex value.

GLITCH//Studio has a surface that audit cannot reach. Its canvas *is* the output (ADR 0001,
ADR 0010): the visible canvas holds the user's artwork at its own pixel dimensions, and the Pipeline
can paint any color anywhere in it. The LIVE / REC badges and the clear control sit on top of that
canvas, and they were transparent — `text-hot-pink border border-hot-pink` with no background — so
their real backdrop was whatever Noise, Block Displacement and Channel Shift had just produced. The
audited pair was never involved. Recording (#85) made it obvious: against a bright feed, `--hot-pink`
on the artwork measures **1.57:1**, and the REC badge announcing that the user is being recorded was
effectively invisible.

This is a different failure from the ones ADR 0009 catalogued. Those were tokens that needed
correcting. Here the token is fine — `--hot-pink` on `--void` is 5.55:1 and passes — and the defect
is that nothing guaranteed the token would ever meet the surface it was audited against.

## Decision

**Anything rendered on top of user-generated pixels carries its own opaque background token.** In
GLITCH//Studio this is `CANVAS_OVERLAY_CHROME` in `glitch-canvas.tsx`, which every canvas overlay
composes; the chips stand on `bg-bg` and so hold the ratio ADR 0009 signed off. The rule is deck-wide
and applies to any future program whose canvas shows content we did not choose the colors of.

Opaque, specifically — **not a translucent scrim**. This is the part worth writing down, because a
scrim is the instinctive answer and the arithmetic refuses it. A dark scrim's worst case is a white
backdrop (maximum luminance), and compositing `rgba(8, 8, 18, α)` over white gives:

| α | composite | `--hot-pink` on it | AA-small (4.5:1) |
|---|---|---|---|
| 0.72 (`--bg-modal-overlay`) | `rgb(77, 77, 84)` | 2.35:1 | fail |
| 0.85 | `rgb(45, 45, 54)` | 3.83:1 | fail |
| 0.90 | `rgb(33, 33, 42)` | 4.48:1 | fail, by 0.02 |
| 0.95 | `rgb(20, 20, 30)` | 5.14:1 | pass |

The alpha that clears the bar is around 0.91 — opaque in all but name, and for none of the honesty.
Alpha buys nothing here except the pretence that the backdrop was considered. No alpha survives an
arbitrary backdrop.

**ASCII//Convert's overlays are exempt where they stand on its fill, and nowhere else.** Its badges
look identical and need no scrim — but not for the reason first written here, which was that
`paintFrame()` fills the canvas with `--void` and so "its overlays already sit on the audited pair".
The fill is real; the conclusion was wrong in six Themes of seven, and #355 is where it was caught.

What is true is the *fixity*. `paintFrame()` fills the canvas edge to edge with `CANVAS_BACKGROUND`,
the literal `#0a0a0f`, before a single glyph lands, and the HTML Export spells the same literal —
deliberately, because the artwork is a thing the user takes away and it must not change colour
because of a chrome preference. So the ground under an ASCII//Convert overlay is **determinate**,
and that is the property this ADR actually needs. The arithmetic above is about an *arbitrary*
backdrop; a determinate one has a ratio, and a ratio can be pinned.

What it is **not** is the *audited* surface. `--bg` resolves to `#0a0a0f` in `ice` alone — every
other Theme draws its own base surface (ADR 0024) while the fill stays put — so in six Themes of
seven an overlay here draws a Theme's foreground token on a ground that Theme does not control, and
the Theme Contract, which pins token against token, cannot see the pair at all. The exemption
therefore **narrows**, in two ways:

- It exempts **an overlay standing on the fill**, not the program. A mark over this canvas with the
  fill not under it is covered by nothing and carries its own ground like any other overlay on the
  deck. That the fill really is under all of it is the edge-to-edge half of the guard below, which
  is why that half is an assertion rather than a sentence.
- It licenses the absence of a *background*, never the absence of a *measurement*. One side of the
  pair is a literal rather than a token, so the ratio has to be pinned explicitly, per Theme,
  against that literal — an inherited claim is exactly what failed here. Measured across the whole
  roster it holds comfortably: every Theme's base surface sits within 0.002 of the fill's relative
  luminance, so each overlay pair lands within half a point of its audited counterpart, and the
  tightest anywhere is `--color-danger` in `solitude` at 5.31:1 against a 4.5:1 floor. A result, not a
  premise, and `theme/contrast.test.ts` now holds it for every Theme the stylesheet declares.

One overlay pair is deliberately left unpinned: the mirror control's pressed state draws `--accent`
at `text-xs` over an accent-tinted fill, which is an instance of the `--accent`-as-small-text
question #355 §1 opens across four programs, not of this one. It is recorded there rather than
settled here.

The distinction from GLITCH//Studio survives all of it, and is still the one ADR 0001 and ADR 0010
draw between the two apps: ASCII//Convert renders *onto* a surface it owns and letterboxes the rest
as void, while GLITCH//Studio's canvas is the artwork with no fill and nowhere to hide. One ground
is fixed and knowable, the other is whatever the Pipeline just painted — two apps whose overlays
legitimately differ, for a reason in the domain rather than in the styling, which is the kind of
divergence ADR 0011 expects hand-copying to surface.

## Considered Alternatives

- **A translucent scrim behind each chip.**
  - *Rejected because:* on the arithmetic above, at usable alphas it fails against bright artwork, and
    the alpha that passes is opaque in all but name.
- **`text-shadow` / glow outline instead of a background.**
  - *Rejected because:* WCAG credits no contrast to a shadow, so the result is unauditable and
    `contrast.test.ts` could pin nothing. It would trade a measurable guarantee for a look.
- **Sample the canvas under each chip and flip its color per frame.**
  - *Rejected because:* it puts a `getImageData` read on the ~15fps rAF loop (ADR 0002) purely for
    styling, couples the overlay to the Pipeline's output, and pushes pixel reads outside the shell
    that ADR 0001 and ADR 0005 keep them in. A great deal of machinery to re-derive what an opaque
    rectangle already guarantees.
- **Move the overlays off the canvas into the app chrome.**
  - *Rejected because:* they annotate the canvas. LIVE and REC state *this feed, right here*, and
    clear acts on the Source it sits on. The ExportBar's timer already occupies the chrome and is the
    announced one (`role="status"`); the REC badge is its decorative, `aria-hidden` counterpart at the
    thing it describes.
- **Accept it as a cyberpunk-register exception, as ADR 0009 did for `--violet text-xs`.**
  - *Rejected because:* those exceptions are decorative labels sitting at a *known*, merely-imperfect
    ratio, each with a readable equivalent nearby. This is a recording indicator at 1.57:1, with no
    floor at all — the ratio is a function of user content, so it has no value to grant an exception
    to.

## Consequences

**Positive:**
- `apps/glitch/src/contrast.test.ts` is added, extending ADR 0009's regression guard to this app and
  pinning the pairs the chips now depend on. *(It moved into the deck kit in ADR 0024, which holds
  these same pairs for every Theme rather than for one palette.)*
- ADR 0009 is left as written. It records an audit that happened, and its methodology — pinning token
  pairs — is not wrong; this ADR names the surface that methodology cannot describe.
- Both halves of ASCII//Convert's narrowed exemption are asserted rather than believed.
  `theme/contrast.test.ts` pins the overlay foregrounds against the fill *as a literal*, for every
  Theme the stylesheet declares, which is the one pairing token-against-token structurally cannot
  reach. `e2e/support/a11y.ts`'s `expectTheCanvasIsItsOwnGround` reads the painted canvas in a real
  browser and holds it to two things — filled edge to edge, and filled with that fixed ground — and
  `e2e/ascii/a11y.spec.ts` runs it once per Theme, so "the artwork does not follow the chrome" is
  something the suite would notice losing.

**Negative:**
- Canvas overlays are visibly heavier: solid dark chips over the artwork rather than hairlines
  floating on it. Accepted — it is the camera-UI idiom, and the alternative is unreadable.
- The rule is a **standing constraint on new overlays**, not a one-off fix: a control added to the
  canvas without a background token is a defect even though nothing in the type system objects. It is
  recorded in `apps/glitch/CLAUDE.md` for that reason.
- Any future program on the deck that renders controls over user content inherits this decision.

## Related ADRs

- ADR 0001 — Hidden canvas for pixel sampling.
- ADR 0002 — Webcam live feed — rAF loop on the main thread.
- ADR 0005 — Pure/impure boundary with RenderInstruction.
- ADR 0009 — WCAG AA contrast audit and remediation.
- ADR 0010 — Aspect-ratio contain fit.
- ADR 0011 — Monorepo under the CYBERDECK umbrella.
