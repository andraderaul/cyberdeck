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

import { ICON_GLYPH_SIZE } from '@cyberdeck/deck-kit/ui'

// Below `sm` the header is one row holding the wordmark and three controls — tight enough that the
// subtitle and its dash are already hidden there. 0.18em across the wordmark and a control label is
// ~30px the row does not have: it pushes the last control off the edge at 320px. So the display
// tracking arrives at the breakpoint that has the room for it, and below it the header keeps the
// metrics it already shipped.
//
// **The row still does not fit below `sm`, and the tracking is not why.** Three controls sit there
// — the AI key, the Theme, and the mute (ADR 0029) — and the mute is the one that tipped it. Only
// it sheds its word: glyph-only under `sm`, its label back from `sm` up, which is the same
// breakpoint and the same `hidden sm:block` the subtitle beside it already uses.
//
// Measured in Chromium over the built output — the header's content width against the viewport:
//
// | width | before the mute | mute with its word | mute glyph-only (shipped) |
// |-------|-----------------|--------------------|---------------------------|
// | 320   | 324 (spills 4)  | 389 (spills 69)    | 372 (spills 52)           |
// | 360   | 360 (fits)      | 389 (spills 29)    | 372 (spills 12)           |
// | 375   | 375 (fits)      | 389 (spills 14)    | 375 (fits)                |
//
// So 375 is bought back and **320 and 360 still overflow**. Both are recorded as accepted rather
// than fixed: 320 already spilled before the mute landed, and 360 is a regression this mute
// introduces. The one measured way back under 360 is the AI control dropping its word too, and ADR
// 0029 chose a readable mute over a discoverable one — a second label is not spent to save 12px.
//
// The glyph growing to `ICON_GLYPH_SIZE` costs nothing in that column: glyph-only, the pill lands on
// `HeaderButton`'s own `min-w-[44px]` floor, so it measures 44x44 exactly and the 18px mark is
// absorbed. That floor is also why the target stays real here rather than needing `touch-target.ts`
// — nothing on this row draws under 44 in either axis.
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

/**
 * The word on a header control that keeps one only from `sm` up — hidden below, like the subtitle
 * and its dash two slots over.
 *
 * Only the mute takes this. Dropping a second label is what would buy back 360, and the table above
 * says why that is not spent.
 */
export const HEADER_CONTROL_LABEL = 'hidden sm:block'

/**
 * The mark on a control that is glyph-only below `sm` and labelled from `sm` up: `ICON_GLYPH_SIZE`
 * where the glyph is the whole visible content, and the size it inherits where the word carries it.
 *
 * The constant is a class *string*, so it cannot be variant-prefixed — and the direction is wrong
 * anyway: Tailwind is mobile-first, so icon-only is the base and `sm` is what undoes it. Undoing it
 * means naming the step the control inherits (`HeaderButton`'s `text-xs`), which is the callsite
 * font step `header-type.ts` exists to keep out of callsites — hence this constant, and hence
 * `header-type.test.ts` pinning `xs` with every other step the header spells.
 *
 * Only the size half is undone. `leading-none` rides on at every width and is inert here: the glyph
 * is a flex item in a row already held open to 44px and centred, so its line box never sets the
 * height. The control is in the header, not over the canvas, so ADR 0013's carve-out does not apply.
 */
export const HEADER_CONTROL_GLYPH = `${ICON_GLYPH_SIZE} sm:text-xs`
