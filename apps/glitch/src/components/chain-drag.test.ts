import { describe, expect, it } from 'vitest'
import { type ChipBounds, DRAG_THRESHOLD_PX, dropTargetAt, isDragGesture } from './chain-drag'

// Three 100px chips with 10px gaps between them.
const CHIPS: ChipBounds[] = [
  { index: 0, left: 0, right: 100 },
  { index: 1, left: 110, right: 210 },
  { index: 2, left: 220, right: 320 },
]

describe('dropTargetAt', () => {
  it('finds the chip under the pointer', () => {
    expect(dropTargetAt(60, CHIPS)).toBe(0)
    expect(dropTargetAt(150, CHIPS)).toBe(1)
    expect(dropTargetAt(300, CHIPS)).toBe(2)
  })

  it('hands a gap to the nearer neighbour rather than refusing the drop', () => {
    expect(dropTargetAt(103, CHIPS)).toBe(0)
    expect(dropTargetAt(107, CHIPS)).toBe(1)
    expect(dropTargetAt(218, CHIPS)).toBe(2)
  })

  it('clamps past the ends, so a drag off the row still lands', () => {
    expect(dropTargetAt(-40, CHIPS)).toBe(0)
    expect(dropTargetAt(9999, CHIPS)).toBe(2)
  })

  it('has nothing to report on an empty row', () => {
    expect(dropTargetAt(50, [])).toBeNull()
  })

  // The row scrolls, so its chips carry Chain positions that need not start at 0 or run in
  // screen order once one has been dragged past another.
  it('answers with the Chain position, not the array offset', () => {
    const moved: ChipBounds[] = [
      { index: 2, left: 0, right: 100 },
      { index: 0, left: 110, right: 210 },
    ]

    expect(dropTargetAt(60, moved)).toBe(2)
    expect(dropTargetAt(150, moved)).toBe(0)
  })
})

describe('isDragGesture', () => {
  it('keeps a press within the threshold a tap', () => {
    expect(isDragGesture(0, 0)).toBe(false)
    expect(isDragGesture(DRAG_THRESHOLD_PX - 1, 0)).toBe(false)
  })

  it('calls it a drag once the pointer has travelled', () => {
    expect(isDragGesture(DRAG_THRESHOLD_PX, 0)).toBe(true)
    expect(isDragGesture(20, 0)).toBe(true)
  })

  // A finger dragging a chip rarely tracks the horizontal; measuring x alone would keep a clearly
  // dragging gesture classified as a tap.
  it('counts vertical travel too', () => {
    expect(isDragGesture(0, 20)).toBe(true)
    expect(isDragGesture(6, 6)).toBe(true)
  })
})
