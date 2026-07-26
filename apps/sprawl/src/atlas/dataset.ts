// The dataset the app renders: the vendored PeeringDB snapshot (ADR 0022), reached through the
// generated `snapshot.ts` pointer so the dated filename lives in one regenerated place. The pure
// core only ever sees the `Dataset` shape — swapping in a newer month changes nothing downstream.

import { SNAPSHOT } from '../data/snapshot'
import type { DataPoint } from './types'

export const DATASET = SNAPSHOT

/** The highest connected capacity in a dataset — the top of its dynamic range. */
export function maxCapacity(points: readonly DataPoint[]): number {
  return points.reduce((max, p) => (p.capacity > max ? p.capacity : max), 0)
}
