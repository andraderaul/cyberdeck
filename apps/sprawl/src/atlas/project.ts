// The functional core (ADR 0005, ADR 0021): `project(dataset, scale, viewport) → RenderInstruction[]`.
// Pure — no DOM, no canvas — so the projection and the log window are unit-testable in isolation.

import type { DataPoint, RenderInstruction, Scale, Viewport } from './types'

/**
 * How many orders of magnitude the brightness ramp spans below the top of the window. Connected
 * capacity spreads ~4 decades across facilities (ADR 0022); a 3-decade window is what makes the
 * overflow *bite* — wide enough to render the long tail as structure, narrow enough that the top
 * still blows white until you slide the scale coarser (ADR 0021's supernova → emergence loop).
 */
export const WINDOW_DECADES = 3

/**
 * Equirectangular projection (ADR 0022 — chosen so the earned basemap overlay can register on it).
 * lng -180..180 → x 0..width, lat 90..-90 → y 0..height. North is up, the antimeridian is the edge.
 */
export function projectLatLng(
  lat: number,
  lng: number,
  viewport: Viewport,
): { x: number; y: number } {
  const x = ((lng + 180) / 360) * viewport.width
  const y = ((90 - lat) / 180) * viewport.height
  return { x, y }
}

/**
 * Brightness of one point through the logarithmic scale window. The ramp runs one full
 * `WINDOW_DECADES` below `scale.topCapacity`: a facility at the top maps to 1 (white), one
 * `10^WINDOW_DECADES` below maps to 0 (dark), and anything above the top clamps to 1 — the honest
 * overflow that pins the map white at a fine scale (ADR 0021). Log, not linear, so the 4-decade
 * spread reads as gradient rather than five bright dots.
 */
export function brightnessFor(capacity: number, scale: Scale): number {
  if (capacity <= 0 || scale.topCapacity <= 0) {
    return 0
  }
  const belowTopDecades = Math.log10(scale.topCapacity / capacity)
  const brightness = 1 - belowTopDecades / WINDOW_DECADES
  return Math.max(0, Math.min(1, brightness))
}

/**
 * The pure core. Projects every point to pixel space and lights it through the current scale window.
 * Points that land fully dark are dropped — the paint step never has to walk them (ADR 0005 keeps
 * the impure `paintFrame` as thin as possible).
 */
export function project(
  dataset: readonly DataPoint[],
  scale: Scale,
  viewport: Viewport,
): RenderInstruction[] {
  const instructions: RenderInstruction[] = []
  for (const point of dataset) {
    const brightness = brightnessFor(point.capacity, scale)
    if (brightness <= 0) {
      continue
    }
    const { x, y } = projectLatLng(point.lat, point.lng, viewport)
    instructions.push({
      x,
      y,
      brightness,
      capacity: point.capacity,
      label: point.label,
      country: point.country,
    })
  }
  return instructions
}
