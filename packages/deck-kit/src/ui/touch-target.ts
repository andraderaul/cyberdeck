// The deck holds every control to a 44x44 pointer target. Most get there with `min-h-[44px]
// min-w-[44px]` and need nothing from this file — these two are for the controls that cannot pay for
// it in layout.
//
// Two places cannot. Over the canvas the backdrop is the user's artwork (ADR 0013), and in
// SPRAWL//Atlas it is the piece itself (ADR 0021), so chrome that grew 40% taller to be tappable
// would be charging the work for its own controls. In a dense label row — a Slider's name plus its
// info trigger — a 44px box would triple the row's height and push the params it labels off a phone.
//
// All three add the target as an overlay, so the visible chrome does not move. None is safe on a
// control whose overflow could reach another control's: two overlapping targets are a worse defect
// than one small target, because the press that lands stops being the one the user aimed at.
//
// Each opens with `relative`, so a control that positions *itself* must name its own `absolute`
// after the constant — `cn` merges on conflict, and the later position wins. Put it first and the
// control silently returns to the flow.

/**
 * A 44x44 target centred on a control that draws smaller than one in *both* axes.
 *
 * Only for a control standing alone — its neighbours inert text, or far enough that no two of these
 * can meet. For a control in a row of controls, reach for `TOUCH_TARGET_HEIGHT` instead.
 */
export const TOUCH_TARGET_OVERLAY = [
  'relative',
  "after:absolute after:content-['']",
  'after:left-1/2 after:top-1/2 after:-translate-x-1/2 after:-translate-y-1/2',
  'after:h-[44px] after:w-[44px]',
].join(' ')

/**
 * 44px of target height over a control that draws shorter, keeping the control's own width.
 *
 * The counterpart for a control sitting in a row of them: because the overlay never grows sideways,
 * two neighbours cannot overlap however tight the gap between them. It buys height alone, so pair it
 * with `min-w-[44px]` on anything narrower than that — an icon-only control needs the real width,
 * and widening one is far cheaper visually than making the whole row taller.
 */
export const TOUCH_TARGET_HEIGHT = [
  'relative',
  "after:absolute after:content-['']",
  'after:inset-x-0 after:top-1/2 after:-translate-y-1/2',
  'after:h-[44px]',
].join(' ')

/**
 * `TOUCH_TARGET_HEIGHT` plus the width it tells you to pair with: 44x44 for a control in a row that
 * also draws narrower than the target.
 *
 * The width is real rather than an overlay, and that asymmetry is the whole point — a centred
 * overlay wide enough for a ~27px icon would reach into its neighbour's, and widening one chip costs
 * far less visually than making the whole row 12px taller.
 *
 * `inline-flex` rides along because `min-width` alone leaves the glyph wherever the line box puts
 * it: the box reaches 44px and the mark inside it does not move to the middle.
 */
export const TOUCH_TARGET_ICON = [
  TOUCH_TARGET_HEIGHT,
  'min-w-[44px] inline-flex items-center justify-center',
].join(' ')
