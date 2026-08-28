// The one line that names the program sat at a body size in the body face, so it read like the copy
// underneath it (#370). The deck ships `--font-display` for exactly that role, and the uppercase
// readouts the rest of the deck draws — a Panel's heading, the hub's section rules — are what set
// the tracking these name.
//
// The steps live here rather than at each callsite for the reason `icon-glyph.ts` gives for
// ICON_GLYPH_SIZE: the kit's scale guard covers spacing and borderRadius but not `text-`, so a
// mistyped font step generates no class at all, the text renders at whatever it inherited, and
// nothing in the toolchain objects. The header now spells a font step in one file, and
// `header-type.test.ts` pins every step spelled here to the preset.
//
// Type only, never role: `text-accent` and `text-fg-muted` stay at the callsite. That split is also
// what lets the test read every `text-` in this file as a size.

// Below `sm` the header is one row holding the wordmark and both controls — tight enough that the
// subtitle and its dash are already hidden there. 0.18em across the wordmark and a control label is
// ~30px the row does not have: it pushes the Theme control off the edge at 320px. So the display
// tracking arrives at the breakpoint that has the room for it, and below it the header keeps the
// metrics it already shipped.
const DISPLAY_TRACKING = 'tracking-wide sm:tracking-widest'

/**
 * The wordmark. The display face throughout, and a step above the copy below it from `sm` up — the
 * size climbs at the same breakpoint the tracking does, and for the same reason.
 *
 * `font-bold` is part of the constant rather than left to the callsite: the accent on the base
 * surface clears the contrast check as *large* text, and at these sizes the weight is half of what
 * makes it large.
 */
export const HEADER_WORDMARK = `font-display text-base sm:text-md font-bold ${DISPLAY_TRACKING}`

/**
 * The `image → ascii art` subtitle and the dash that introduces it: the wordmark's face and
 * tracking, uppercased so the pair reads as one readout, at the size it already had. Both are drawn
 * only from `sm` up, which is also the only width where the case change costs anything.
 */
export const HEADER_SUBTITLE = `font-display text-xs uppercase ${DISPLAY_TRACKING}`

/**
 * The header's controls, over the size and the target the control primitive draws itself at: the
 * face and the tracking only.
 *
 * No case here. The labels are lowercase by decision — they name what pressing does, where the
 * wordmark and its subtitle name what the program *is* — and lowercase is also what keeps them
 * quieter than the line they sit beside.
 */
export const HEADER_CONTROL_TYPE = `font-display ${DISPLAY_TRACKING}`
