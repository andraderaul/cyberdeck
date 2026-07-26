// The earned basemap (ADR 0021, P6): a continental outline you toggle on to *confirm* a guess the
// dark already let you make. Pure projection of a vendored coastline (Natural Earth 110m) onto the
// same equirectangular frame the points use, so the outline registers on the light rather than
// sitting under it as "the ground". Off by default — recognition happens in the dark first.

import coastline from '../data/coastline.json'
import { projectLatLng } from './project'
import type { Viewport } from './types'

/** A coastline as [lng, lat] pairs (the committed shape). */
type RawLine = [number, number][]

/** A projected polyline in the frame's pixel space. */
export type ProjectedLine = { x: number; y: number }[]

const LINES = coastline as RawLine[]

/**
 * Projects every vendored coastline onto the viewport with the same `projectLatLng` the points use —
 * so the outline lines up with the light exactly. Equirectangular means the registration is a plain
 * linear map; no separate basemap projection to drift out of sync.
 */
export function projectCoastline(viewport: Viewport): ProjectedLine[] {
  return LINES.map((line) => line.map(([lng, lat]) => projectLatLng(lat, lng, viewport)))
}
