import { type RefObject, useEffect, useState } from 'react'
import { nearestPoint } from '../atlas/inspect'
import type { RenderInstruction } from '../atlas/types'

/** Pointer must land within this many CSS px of a node to inspect it. */
const HIT_RADIUS = 14

export interface Hover {
  point: RenderInstruction
  /** Pointer position in CSS px relative to the frame, for placing the tooltip. */
  x: number
  y: number
}

/**
 * Tracks the point under the pointer for hover inspection (#228). Hit-tests the pointer against the
 * projected frame on every move and clears on leave. Runs alongside the scale gesture on the same
 * element — a drag slides the scale *and* re-inspects under the finger, which is fine: both read the
 * same frame. Coarse (touch) pointers are ignored; there is no hover to inspect there.
 */
export function useHover(
  ref: RefObject<HTMLElement>,
  instructions: readonly RenderInstruction[],
): Hover | null {
  const [hover, setHover] = useState<Hover | null>(null)

  useEffect(() => {
    const el = ref.current
    if (!el) {
      return
    }
    const onMove = (e: PointerEvent) => {
      if (e.pointerType === 'touch') {
        return
      }
      const rect = el.getBoundingClientRect()
      const x = e.clientX - rect.left
      const y = e.clientY - rect.top
      const point = nearestPoint(instructions, x, y, HIT_RADIUS)
      setHover(point ? { point, x, y } : null)
    }
    const onLeave = () => setHover(null)
    el.addEventListener('pointermove', onMove)
    el.addEventListener('pointerleave', onLeave)
    return () => {
      el.removeEventListener('pointermove', onMove)
      el.removeEventListener('pointerleave', onLeave)
    }
  }, [ref, instructions])

  return hover
}
