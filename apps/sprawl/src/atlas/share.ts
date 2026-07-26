// The shareable link (#230, ADR 0021 following GOLEM//Console): the export is *state*, not a file.
// A URL encodes where you are in the vertigo — the scale you slid to — so the link opens the other
// person at the same point and they keep sliding from there. Deterministic because the dataset
// underneath is a fixed vendored snapshot (ADR 0022): the same link resolves to the same map for
// everyone. Pure encode/decode; the impure `window.location` plumbing lives in the shell.

/**
 * The shareable view. `position` is the scale (0 OVERFLOW … 1 coarsest) — the only viewport the map
 * has today, since the whole world is always framed (there is no pan/zoom yet). `basemap` rides along
 * so a shared link opens with the outline exactly as the sender left it. The query is key-based, so a
 * future pan/zoom viewport is additive — more keys, no reshape.
 */
export interface AtlasView {
  position: number
  basemap: boolean
}

const SCALE_KEY = 's'
const BASEMAP_KEY = 'b'

/** Encodes a view to a URL query string (`s=0.420&b=1`). Basemap is omitted when off — off is the
 *  default, so the common link stays clean. */
export function encodeView(view: AtlasView): string {
  const params = new URLSearchParams()
  params.set(SCALE_KEY, clamp01(view.position).toFixed(3))
  if (view.basemap) {
    params.set(BASEMAP_KEY, '1')
  }
  return params.toString()
}

/** Decodes a query string into whatever view keys it carries. Unknown/garbage keys are ignored and
 *  the scale is clamped, so a hand-mangled link can never boot the map into an impossible state. */
export function decodeView(query: string): Partial<AtlasView> {
  const params = new URLSearchParams(query)
  const view: Partial<AtlasView> = {}
  const scale = params.get(SCALE_KEY)
  if (scale !== null) {
    const n = Number(scale)
    if (Number.isFinite(n)) {
      view.position = clamp01(n)
    }
  }
  if (params.get(BASEMAP_KEY) === '1') {
    view.basemap = true
  }
  return view
}

function clamp01(n: number): number {
  return Math.max(0, Math.min(1, n))
}
