import { type RefObject, useCallback, useEffect, useMemo, useState } from 'react'
import {
  formatScaleUnit,
  isOverflow,
  POSITION_MAX,
  POSITION_MIN,
  type ScaleUnit,
  scaleAt,
  scaleRange,
} from '../atlas/scale'
import type { DataPoint, Scale } from '../atlas/types'

/** Wheel notch → position delta. One notch (~deltaY 100) slides ~0.12 of the full range, so the
 *  overflow → emergence traverse is a handful of notches — smooth, never a jump (ADR 0021). */
const WHEEL_SENSITIVITY = 0.0012
/** Drag px → position delta. Tuned so a comfortable swipe crosses the whole range on touch. */
const DRAG_SENSITIVITY = 0.0022
/** Arrow-key step — the keyboard path to the same instrument. */
const KEY_STEP = 0.05

function clampPosition(p: number): number {
  return Math.max(POSITION_MIN, Math.min(POSITION_MAX, p))
}

export interface ScaleGesture {
  scale: Scale
  /** 0 (finest / OVERFLOW) … 1 (coarsest). */
  position: number
  reader: ScaleUnit
  overflow: boolean
  setPosition: (position: number) => void
}

/**
 * The scale instrument's gesture shell: binds wheel, drag and arrow keys on `targetRef` to a single
 * normalised position, and derives the live `Scale`, reader and OVERFLOW state from it. The control
 * *is* the canvas (ADR 0020) — there is no widget — so every listener hangs off the map element.
 *
 * The map opens at `POSITION_MIN`, which is the OVERFLOW default (`1 px = 1 Gbps`): the failure is
 * the tutorial (ADR 0021), so the first frame is honestly blown out and the first gesture repairs it.
 */
export function useScale(
  targetRef: RefObject<HTMLElement>,
  points: readonly DataPoint[],
  initialPosition = POSITION_MIN,
): ScaleGesture {
  const range = useMemo(() => scaleRange(points), [points])
  const [position, setPositionState] = useState(() => clampPosition(initialPosition))
  const setPosition = useCallback((p: number) => setPositionState(clampPosition(p)), [])

  useEffect(() => {
    const el = targetRef.current
    if (!el) {
      return
    }
    const nudge = (delta: number) => setPositionState((prev) => clampPosition(prev + delta))

    const onWheel = (e: WheelEvent) => {
      // preventDefault needs a non-passive listener — the wheel is the instrument here, not scroll.
      e.preventDefault()
      nudge(e.deltaY * WHEEL_SENSITIVITY)
    }

    let dragging = false
    let lastX = 0
    const onPointerDown = (e: PointerEvent) => {
      dragging = true
      lastX = e.clientX
      el.setPointerCapture?.(e.pointerId)
    }
    const onPointerMove = (e: PointerEvent) => {
      if (!dragging) {
        return
      }
      nudge((e.clientX - lastX) * DRAG_SENSITIVITY)
      lastX = e.clientX
    }
    const onPointerUp = (e: PointerEvent) => {
      dragging = false
      el.releasePointerCapture?.(e.pointerId)
    }

    const onKeyDown = (e: KeyboardEvent) => {
      // Right/Up = coarser (Case's "increase the scale"); Left/Down = finer, back toward overflow.
      if (e.key === 'ArrowRight' || e.key === 'ArrowUp') {
        e.preventDefault()
        nudge(KEY_STEP)
      } else if (e.key === 'ArrowLeft' || e.key === 'ArrowDown') {
        e.preventDefault()
        nudge(-KEY_STEP)
      }
    }

    el.addEventListener('wheel', onWheel, { passive: false })
    el.addEventListener('pointerdown', onPointerDown)
    el.addEventListener('pointermove', onPointerMove)
    el.addEventListener('pointerup', onPointerUp)
    el.addEventListener('pointercancel', onPointerUp)
    el.addEventListener('keydown', onKeyDown)
    return () => {
      el.removeEventListener('wheel', onWheel)
      el.removeEventListener('pointerdown', onPointerDown)
      el.removeEventListener('pointermove', onPointerMove)
      el.removeEventListener('pointerup', onPointerUp)
      el.removeEventListener('pointercancel', onPointerUp)
      el.removeEventListener('keydown', onKeyDown)
    }
  }, [targetRef])

  const scale = useMemo(() => scaleAt(position, range), [position, range])
  const reader = useMemo(() => formatScaleUnit(scale), [scale])
  const overflow = useMemo(() => isOverflow(points, scale), [points, scale])

  return { scale, position, reader, overflow, setPosition }
}
