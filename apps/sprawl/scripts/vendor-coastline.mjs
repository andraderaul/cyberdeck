// One-off vendor of the earned basemap's coastline (#229, ADR 0022's client-side-data stance). The
// outline is a *gabarito* — a coarse continental guide you toggle on to confirm a guess — so it is
// rounded hard and committed as a static asset. Coastlines don't drift, so unlike the dataset there
// is no scheduled re-vendor: run this by hand if the source ever needs refreshing.
//
//   node scripts/vendor-coastline.mjs   → writes src/data/coastline.json
//
// Source: Natural Earth 1:110m coastline (public domain), via the natural-earth-vector mirror.

import { writeFileSync } from 'node:fs'
import { dirname, join } from 'node:path'
import { fileURLToPath } from 'node:url'

const SOURCE =
  'https://raw.githubusercontent.com/nvkelso/natural-earth-vector/master/geojson/ne_110m_coastline.geojson'
const OUT = join(dirname(fileURLToPath(import.meta.url)), '..', 'src', 'data', 'coastline.json')

/** ~11 km — coarse enough to halve the file, fine enough that "that smear is Europe" still confirms. */
const COORD_DECIMALS = 1

function roundTo(value, decimals) {
  const f = 10 ** decimals
  return Math.round(value * f) / f
}

const res = await fetch(SOURCE, { headers: { Accept: 'application/json' } })
if (!res.ok) {
  throw new Error(`coastline source → HTTP ${res.status}`)
}
const geojson = await res.json()

// Each feature is a LineString of [lng, lat]; round and drop consecutive duplicates, keeping only
// lines that survive with at least a segment. The committed shape is a bare array of lines.
const lines = []
for (const feature of geojson.features) {
  const line = []
  let last = null
  for (const [lng, lat] of feature.geometry.coordinates) {
    const point = [roundTo(lng, COORD_DECIMALS), roundTo(lat, COORD_DECIMALS)]
    if (!last || point[0] !== last[0] || point[1] !== last[1]) {
      line.push(point)
      last = point
    }
  }
  if (line.length >= 2) {
    lines.push(line)
  }
}

writeFileSync(OUT, `${JSON.stringify(lines)}\n`)
const points = lines.reduce((n, l) => n + l.length, 0)
// biome-ignore lint/suspicious/noConsole: build-time CLI script — stdout is the deliberate output.
console.log(`wrote ${lines.length} coastlines (${points} points) → coastline.json`)
