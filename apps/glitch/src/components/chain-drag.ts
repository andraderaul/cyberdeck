// The pointer half of Chain reordering (ADR 0020, #187). HTML5 drag-and-drop never fires on touch,
// so a phone had no way to move a Link at all; Pointer Events cover mouse, pen and finger through
// one path. The geometry decision lives here, pure, so it can be tested without a layout engine.

/** Where a chip sits on the row's axis. `index` is its position in the Chain. */
export interface ChipBounds {
  index: number
  left: number
  right: number
}

/**
 * How far a pointer must travel before a press becomes a drag rather than a tap.
 *
 * A chip is both the selection control and the drag handle, so every reorder starts as a press that
 * could still be a tap — without a threshold, the jitter in a fingertip's contact patch would turn
 * selections into reorders.
 */
export const DRAG_THRESHOLD_PX = 8

/**
 * The Chain position a drag at `x` would drop onto, or `null` on an empty row.
 *
 * Containment first, then the nearest edge: a Link dragged into the gap between two chips, or off
 * the end of the row, still has to land somewhere, and refusing those positions would make the gaps
 * dead zones on a row the user is dragging across.
 */
export function dropTargetAt(x: number, chips: readonly ChipBounds[]): number | null {
  if (chips.length === 0) {
    return null
  }
  let nearest = chips[0]
  let nearestDistance = Number.POSITIVE_INFINITY
  for (const chip of chips) {
    if (x >= chip.left && x <= chip.right) {
      return chip.index
    }
    const distance = x < chip.left ? chip.left - x : x - chip.right
    if (distance < nearestDistance) {
      nearestDistance = distance
      nearest = chip
    }
  }
  return nearest.index
}

/**
 * Whether a press has travelled far enough to be a drag.
 *
 * Both axes count, not just the row's: a finger dragging a chip rarely tracks the horizontal, and
 * measuring x alone would keep a clearly-dragging gesture classified as a tap.
 */
export function isDragGesture(dx: number, dy: number): boolean {
  return Math.hypot(dx, dy) >= DRAG_THRESHOLD_PX
}
