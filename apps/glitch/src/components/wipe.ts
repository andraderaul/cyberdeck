// The Wipe's geometry, kept apart from the component the way `chain-drag.ts` is: it is arithmetic
// over boxes, and arithmetic is testable without a layout engine.
//
// Everything here is in the canvas container's own CSS pixels, which is a different space from the
// one the Chain works in — the visible canvas carries the *sampled* buffer at its own dimensions
// (`render-frame.ts`) and CSS contains it into the frame. The Wipe divides what the user sees, so
// CSS space is the one it has to be spoken in.

/** The picture inside the canvas element — ADR 0010's fit region, with the bands left out. */
export interface FitRegion {
  x: number
  y: number
  width: number
  height: number
}

/** Where the divider starts: the Source and the Chain's result each getting half the picture. */
export const WIPE_INITIAL = 0.5

/** One arrow press, as a fraction of the picture. A hundred presses cross it, like a percentage. */
export const WIPE_STEP = 0.01

/** One page press — ten arrow presses, so a keyboard can cross the picture without holding a key. */
export const WIPE_PAGE_STEP = 0.1

/**
 * Pure: where `object-contain` puts a Source of `sourceWidth × sourceHeight` inside the box, in the
 * box's own coordinates.
 *
 * This mirrors the CSS the visible canvas is drawn with rather than deriving anything new — the
 * canvas is `object-contain`, so the picture occupies this rectangle and the rest of the element is
 * ADR 0010's letterbox band. The Wipe divides the rectangle, never the element.
 *
 * A Source with no intrinsic size yet (a video before its metadata resolves) falls back to the whole
 * box, the same call ADR 0010 makes: NaN geometry would put the divider nowhere at all.
 */
export function computeFitRegion(
  boxWidth: number,
  boxHeight: number,
  sourceWidth: number,
  sourceHeight: number,
): FitRegion {
  if (sourceWidth <= 0 || sourceHeight <= 0) {
    return { x: 0, y: 0, width: boxWidth, height: boxHeight }
  }

  const scale = Math.min(boxWidth / sourceWidth, boxHeight / sourceHeight)
  const width = sourceWidth * scale
  const height = sourceHeight * scale
  return { x: (boxWidth - width) / 2, y: (boxHeight - height) / 2, width, height }
}

/**
 * Pure: a pointer's viewport x as a fraction of the fit region, clamped to the picture.
 *
 * The clamp is what keeps a drag out of the bands: past either edge the divider parks on the edge
 * rather than running on into void the picture does not occupy.
 */
export function fractionAt(pointerX: number, regionLeft: number, regionWidth: number): number {
  if (regionWidth <= 0) {
    return 0
  }
  return clampFraction((pointerX - regionLeft) / regionWidth)
}

/**
 * Pure: where a key press moves the divider to, or `null` for a key the Wipe does not own.
 *
 * Null rather than the unchanged fraction, because the caller uses the answer to decide whether to
 * call `preventDefault` — Tab has to stay distinguishable from a nudge that landed on the edge.
 *
 * Up and down move it too. The divider is a vertical thumb travelling a horizontal axis, and a
 * reader who presses the arrow the handle *looks* like it should take expects it to move.
 */
export function wipeKeyMove(key: string, fraction: number): number | null {
  switch (key) {
    case 'ArrowRight':
    case 'ArrowUp':
      return clampFraction(fraction + WIPE_STEP)
    case 'ArrowLeft':
    case 'ArrowDown':
      return clampFraction(fraction - WIPE_STEP)
    case 'PageUp':
      return clampFraction(fraction + WIPE_PAGE_STEP)
    case 'PageDown':
      return clampFraction(fraction - WIPE_PAGE_STEP)
    case 'Home':
      return 0
    case 'End':
      return 1
    default:
      return null
  }
}

function clampFraction(value: number): number {
  return Math.min(1, Math.max(0, value))
}
