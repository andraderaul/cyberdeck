// Loads the committed snapshot and types it against the pure core. `#225` reads a hand-picked
// sample; `#227` swaps in the vendored `dataset-YYYY-MM.json` behind this same module so nothing
// downstream of `Dataset` changes shape.

import sample from '../data/dataset-sample.json'
import type { DataPoint, Scale } from './types'

/** A dated snapshot: the points plus the provenance the UI credits on screen (ADR 0022). */
export interface Dataset {
  /** `YYYY-MM` for a vendored snapshot, or `sample` for the skeleton's stand-in. */
  asOf: string
  measure: string
  source: string
  points: DataPoint[]
}

export const DATASET: Dataset = sample as Dataset

/** The highest connected capacity in a dataset — the top of its dynamic range. */
export function maxCapacity(points: readonly DataPoint[]): number {
  return points.reduce((max, p) => (p.capacity > max ? p.capacity : max), 0)
}

/**
 * The fixed scale the skeleton opens at (`#225` has no gesture yet). Anchored at the dataset's top
 * capacity so the brightest facility is white and the tail ramps down over the window — a visible
 * spread, not five saturated dots. `#226` replaces this with the OVERFLOW-to-emergence gesture.
 */
export function skeletonScale(points: readonly DataPoint[]): Scale {
  return { topCapacity: maxCapacity(points) }
}
