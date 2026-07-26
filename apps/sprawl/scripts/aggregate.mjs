// Pure aggregation for the vendored snapshot (ADR 0022). No network, no filesystem — the fetching
// shell (vendor-dataset.mjs) hands these functions raw PeeringDB rows and they return the normalised
// points. Kept pure so the join is unit-testable (aggregate.test.mjs) without hitting the API.
//
// The measure is **connected capacity**: PeeringDB `netixlan.speed` (Mbps per connection) summed per
// exchange, then attributed to every facility that exchange sits in (`ixfac`). It is never "traffic"
// — the honesty rule of ADR 0021/0022.

/** Coordinate precision kept in the snapshot — ~1 km, plenty for a world map and it shrinks the file. */
const COORD_DECIMALS = 2

function roundTo(value, decimals) {
  const f = 10 ** decimals
  return Math.round(value * f) / f
}

/**
 * Total connected capacity (Mbps) per exchange: sum of every network's port speed on that IX.
 * `netixlan` rows carry `ix_id` directly, so no ixlan join is needed.
 */
export function ixSpeedById(netixlans) {
  const byIx = new Map()
  for (const row of netixlans) {
    if (!row.speed) {
      continue
    }
    byIx.set(row.ix_id, (byIx.get(row.ix_id) ?? 0) + row.speed)
  }
  return byIx
}

/**
 * Connected capacity (Mbps) per facility: for each (ix, facility) presence in `ixfac`, add that
 * exchange's total speed. A facility hosting a big exchange inherits its whole connected capacity —
 * "how much you can reach in this building" — which is what makes the metros bloom (ADR 0021).
 */
export function facilityCapacityById(ixfacs, ixSpeed) {
  const byFac = new Map()
  for (const link of ixfacs) {
    const speed = ixSpeed.get(link.ix_id)
    if (!speed) {
      continue
    }
    byFac.set(link.fac_id, (byFac.get(link.fac_id) ?? 0) + speed)
  }
  return byFac
}

/**
 * The full join: raw PeeringDB rows → normalised, sorted points in the `{ lat, lng, capacity, label,
 * country }` snapshot shape. Facilities with no connected capacity or no coordinates are dropped;
 * `label` is the city (what the map labels, #228), `country` its 2-letter code. Sorted by capacity
 * descending so the brightest nodes come first — the order #228's "strongest N" reads off.
 */
export function facilityPoints(facilities, ixfacs, netixlans) {
  const ixSpeed = ixSpeedById(netixlans)
  const facCapacity = facilityCapacityById(ixfacs, ixSpeed)
  const points = []
  for (const fac of facilities) {
    const capacity = facCapacity.get(fac.id)
    if (!capacity || fac.latitude == null || fac.longitude == null) {
      continue
    }
    points.push({
      lat: roundTo(fac.latitude, COORD_DECIMALS),
      lng: roundTo(fac.longitude, COORD_DECIMALS),
      capacity,
      label: fac.city,
      country: fac.country,
    })
  }
  points.sort((a, b) => b.capacity - a.capacity)
  return points
}
