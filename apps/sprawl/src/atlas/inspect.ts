// Hover inspection (ADR 0021, P5): hovering a point reveals its identity and value —
// `Ashburn, US · 340 Gbps`. Pure hit-testing + formatting over the projected frame; the shell just
// feeds it the pointer position and renders the result.

import { formatCapacity } from './scale'
import type { RenderInstruction } from './types'

/**
 * The lit point nearest to (x, y) within `maxDistance` px, or null if none is close enough. Ties go
 * to the last-seen (topmost in paint order). Linear over the frame — a few thousand points is well
 * under a millisecond, so no spatial index is warranted.
 */
export function nearestPoint(
  instructions: readonly RenderInstruction[],
  x: number,
  y: number,
  maxDistance: number,
): RenderInstruction | null {
  let best: RenderInstruction | null = null
  let bestDistanceSq = maxDistance * maxDistance
  for (const ins of instructions) {
    const dx = ins.x - x
    const dy = ins.y - y
    const distanceSq = dx * dx + dy * dy
    if (distanceSq <= bestDistanceSq) {
      bestDistanceSq = distanceSq
      best = ins
    }
  }
  return best
}

/** A point's identity and value for the tooltip: `Ashburn, US · 340 Gbps`. Value speaks the same
 *  Gbps/Tbps language as the scale reader (#226); the measure is connected capacity, never traffic. */
export function formatInspection(point: RenderInstruction): string {
  const { value, unit } = formatCapacity(point.capacity)
  const place = point.label ?? 'unknown'
  const location = point.country ? `${place}, ${point.country}` : place
  return `${location} · ${value} ${unit}`
}
