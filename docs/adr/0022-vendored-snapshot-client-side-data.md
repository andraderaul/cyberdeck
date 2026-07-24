# Vendored snapshot — real external data on a backend-less deck

SPRAWL//Atlas (ADR 0021) needs *real* data: the scale vertigo only lands if the map is the actual
world, not an invented one. But the deck is **100% client-side, with no backend** (ADR 0011), and the
obvious ways to get external data into a browser both fail here:

- **Live fetch from PeeringDB** — the source responds `200` but sends no `access-control-allow-origin`
  (`vary: origin` with no allow header), so a browser fetch is blocked by CORS. Dead on arrival.
- **Live fetch from Cloudflare Radar** — requires a token, which in a client-side bundle ships to every
  visitor. Exposed by construction.

Either one is only rescued by a proxy — i.e. a backend — which ADR 0011 declined for the whole deck. So
we take a third path: a **vendored snapshot**. A build script pulls the sources, normalises them, and
commits a static `dataset.json` into the repo. CI re-runs it on a schedule and opens a PR when the data
moves. The app loads a static file and stays fully client-side.

## Why this is the right shape, not a compromise

- **The passage is not about time.** Case does not say "show me traffic *now*"; he says "rewrite the map,
  increase the scale." The dramatic variable is **scale**, not freshness. A Tuesday snapshot serves the
  first screen (ADR 0021's ruler) exactly as well as a live feed would.
- **Determinism is a feature the deck already values.** GOLEM//Console exports a shareable link so the
  other person sees *the same machine*. SPRAWL//Atlas's export is a link encoding scale + viewport (ADR
  0021); it only means something if the dataset underneath is fixed. A map that shifts under your feet
  can't be shared to a point in the vertigo. The snapshot makes the link honest.
- **It preserves "no backend" without a gambiarra.** The one static asset is the whole data dependency;
  there is no server, no proxy, no runtime secret.

## The data

- **Source: PeeringDB, unauthenticated.** `netixlan.speed` is capacity in Mbps per connection; summed by
  facility it yields **connected capacity** per point — uniform, worldwide, no key. ~5,255 facilities
  carry lat/long. The grandeza is **connected capacity, named as such on screen** — never "traffic". The
  ~4-orders-of-magnitude spread across facilities is what makes the log-window overflow bite (ADR 0021);
  a narrower measure would have no supernova.
- **Shape: a normalised `dataset.json`** — points reduced to `{ lat, lng, capacity, label? }`, aggregated
  at build time so the app ships ~100 KB, not the raw multi-megabyte API dump. The projection is
  equirectangular (lat/lng → x/y), chosen so the optional earned basemap overlay can register on top.
- **Named and dated.** The file is `dataset-YYYY-MM.json`. v1 loads exactly one, but the dated name is a
  standing invitation: a future time axis (ADR 0021's deferred door) is *additive*, needing no reshape of
  the format — only more files.

## Considered options

- **Live fetch (with a proxy)** — rejected: the proxy is a backend, the exact thing ADR 0011 declined
  deck-wide, bought to satisfy a freshness the passage never asks for.
- **Token in the bundle for Radar** — rejected: ships a secret to every visitor; a client-side bundle has
  no private place to keep one.
- **A hybrid live overlay** (snapshot base + user pastes their own Radar token) — deferred, probably
  forever: it is the feature that looks obvious and is never used. If someone genuinely needs it, the
  snapshot base already stands and the overlay is additive.

## Consequences

- A new **build-time data pipeline** enters the deck: a script under the app that fetches, normalises, and
  writes `dataset-YYYY-MM.json`, plus a scheduled CI job that re-runs it and opens a PR on drift. This is
  new machinery for the deck (the other programs have no external data); it lives in `apps/sprawl`, not in
  `deck-kit`, until a second consumer proves the seam (the ADR 0014 bar).
- **The committed dataset is a versioned artifact.** Re-vendoring is a normal PR with a visible diff; the
  data's provenance and its movement are in git history, not in a black-box runtime call.
- **The dataset is a snapshot, and the UI must say so** — a small "as of YYYY-MM · PeeringDB connected
  capacity" credit, so nobody reads it as live or as traffic. Same honesty rule as ADR 0021: name what it
  is.
