// The scale instrument, pure (ADR 0021's ruler). The map opens in OVERFLOW and you repair it by
// rewriting coarser — Case's "increase the scale." Everything here is a pure function of the
// dataset + a normalised slider position, so the gesture shell (`use-scale.ts`) stays thin.

import { maxCapacity } from './dataset'
import { brightnessFor } from './project'
import type { DataPoint, Scale } from './types'

/**
 * The OVERFLOW opening, expressed in the data's unit: `1 px = 1 Gbps` = 1000 Mbps. At this scale the
 * top of the brightness ramp sits at 1 Gbps, so effectively every facility (connected capacity runs
 * tens to thousands of Gbps) clips to white — the honest supernova the map opens on (ADR 0021).
 */
export const OVERFLOW_TOP_CAPACITY_MBPS = 1000

/** Share of lit points that must clip to white for the reader to say OVERFLOW — "most of the map is
 *  blown out." A live, honest test, not a flag pinned to the opening frame. */
export const OVERFLOW_CLIP_THRESHOLD = 0.5

/** The finest (0, OVERFLOW) and coarsest (1) ends the gesture slides between. */
export const POSITION_MIN = 0
export const POSITION_MAX = 1

/** The log-space window the scale gesture travels: from the OVERFLOW default up past the top of the
 *  dataset's range, so at the coarse end even the brightest facility lands mid-ramp and full
 *  structure resolves. */
export interface ScaleRange {
  minTop: number
  maxTop: number
}

function clamp01(t: number): number {
  return Math.max(POSITION_MIN, Math.min(POSITION_MAX, t))
}

/** Derives the travel range from a dataset: fine end pinned at OVERFLOW, coarse end just past the
 *  top so the brightest node stops clipping and reads as structure. */
export function scaleRange(points: readonly DataPoint[]): ScaleRange {
  const top = maxCapacity(points)
  // A hair over the top capacity: at position 1 the brightest facility is ~0.9, not blown white.
  const maxTop = Math.max(top * 2, OVERFLOW_TOP_CAPACITY_MBPS * 10)
  return { minTop: OVERFLOW_TOP_CAPACITY_MBPS, maxTop }
}

/**
 * Maps a normalised position (0 finest/OVERFLOW → 1 coarsest) to a Scale. The interpolation is in
 * log space, so a constant drag speed slides the window at a constant *decades-per-pixel* — the
 * emergence is smooth, with no order-of-magnitude jump that would skip the reveal (ADR 0021).
 */
export function scaleAt(position: number, range: ScaleRange): Scale {
  const t = clamp01(position)
  const logMin = Math.log10(range.minTop)
  const logMax = Math.log10(range.maxTop)
  return { topCapacity: 10 ** (logMin + (logMax - logMin) * t) }
}

/** Inverse of `scaleAt` — the position a given scale sits at, for booting from a shared link (#230). */
export function positionOf(scale: Scale, range: ScaleRange): number {
  const logMin = Math.log10(range.minTop)
  const logMax = Math.log10(range.maxTop)
  if (logMax === logMin) {
    return POSITION_MIN
  }
  return clamp01((Math.log10(scale.topCapacity) - logMin) / (logMax - logMin))
}

/** Fraction of points clipped to full white at this scale — how "blown out" the map currently is. */
export function clippedFraction(points: readonly DataPoint[], scale: Scale): number {
  if (points.length === 0) {
    return 0
  }
  let clipped = 0
  for (const point of points) {
    if (brightnessFor(point.capacity, scale) >= 1) {
      clipped += 1
    }
  }
  return clipped / points.length
}

/** Whether the reader should say OVERFLOW: most of the map is blown out at the current scale. */
export function isOverflow(points: readonly DataPoint[], scale: Scale): boolean {
  return clippedFraction(points, scale) >= OVERFLOW_CLIP_THRESHOLD
}

/** A connected-capacity magnitude formatted for screen: value + unit. Honest unit — the measure is
 *  connected capacity, so it is per-second (Gbps / Tbps), never a storage GB. Shared by the scale
 *  reader (#226) and hover inspection (#228) so `1 px ≈ N` and a point's value speak one language. */
export interface CapacityUnit {
  value: number
  unit: string
}

export function formatCapacity(mbps: number): CapacityUnit {
  const gbps = mbps / 1000
  const [value, unit] = gbps >= 1000 ? [gbps / 1000, 'Tbps'] : [gbps, 'Gbps']
  const rounded =
    value >= 100
      ? Math.round(value)
      : value >= 10
        ? Math.round(value * 10) / 10
        : Number(value.toPrecision(2))
  return { value: rounded, unit }
}

/** The live scale unit: the capacity magnitude plus a `1 px ≈ …` string. The number *is* the
 *  vertigo — the reader is what turns the gesture into scale rather than a dimmer (ADR 0021). */
export interface ScaleUnit extends CapacityUnit {
  text: string
}

export function formatScaleUnit(scale: Scale): ScaleUnit {
  const { value, unit } = formatCapacity(scale.topCapacity)
  return { value, unit, text: `1 px ≈ ${value} ${unit}` }
}
