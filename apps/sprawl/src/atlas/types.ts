// The DOM-free currency of SPRAWL//Atlas' pure core (ADR 0005, ADR 0021). No canvas, no React —
// `project()` turns these into render instructions and `paintFrame()` is the only thing that paints.

/**
 * One facility in the dataset. `capacity` is **connected capacity** in Mbps — the sum of PeeringDB
 * `netixlan.speed` at that facility (ADR 0022). It is never "traffic"; the honesty rule of ADR 0021
 * forbids that word anywhere it surfaces. `#227` populates this shape for real; `#225` ships a hand-
 * picked sample of the same shape.
 */
export interface DataPoint {
  /** Degrees latitude, -90..90. */
  lat: number
  /** Degrees longitude, -180..180. */
  lng: number
  /** Connected capacity in Mbps (sum of netixlan.speed). Drives brightness through the log window. */
  capacity: number
  /** The city — what the map labels (#228). */
  label?: string
  /** ISO 2-letter country code, for hover inspection (#228). */
  country?: string
}

/** A dated snapshot: the points plus the provenance the UI credits on screen (ADR 0022). */
export interface Dataset {
  /** `YYYY-MM` for a vendored snapshot. */
  asOf: string
  measure: string
  source: string
  points: DataPoint[]
}

/**
 * The scale instrument's state, in the data's own unit. `topCapacity` is the connected capacity
 * (Mbps) that maps to the **top** of the brightness ramp — i.e. `1 px` at the current scale. Sliding
 * it up (coarser, Case's "increase the scale") lifts the ceiling so the white recedes and structure
 * emerges from the overflow. `#225` holds it fixed; `#226` makes it a live gesture.
 */
export interface Scale {
  /** Connected capacity (Mbps) at the top of the brightness ramp. Larger ⇒ coarser ⇒ less white. */
  topCapacity: number
}

/** The canvas frame the projection paints into. `#226`/`#230` extend this with pan/zoom. */
export interface Viewport {
  width: number
  height: number
}

/** A point ready to paint: pixel position + brightness 0..1 from the log window. Pure output.
 *  `label`/`country` ride along for the labels and hover inspection overlays (#228). */
export interface RenderInstruction {
  x: number
  y: number
  /** 0 (below the window, dark) .. 1 (at/above the top, blown white). */
  brightness: number
  capacity: number
  label?: string
  country?: string
}
