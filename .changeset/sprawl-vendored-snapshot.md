---
"@cyberdeck/sprawl": minor
---

SPRAWL//Atlas vendored PeeringDB snapshot (#227) — the real data behind the piece (ADR 0022). A
build-time pipeline under `apps/sprawl` fetches PeeringDB (unauthenticated), sums `netixlan.speed`
per exchange and attributes it to each facility it sits in (`ixfac`), and writes a normalised,
dated `dataset-YYYY-MM.json` (~1,958 facilities, ~6.6 decades of connected capacity, ~150 KB) behind
a generated `snapshot.ts` pointer. The aggregation is a pure, unit-tested module; the fetch is the
impure shell. A scheduled CI job re-runs it and opens a PR on drift, so the committed dataset stays
a versioned artifact with its provenance in git history. The app now opens on the real world — at
OVERFLOW the continents draw themselves in light, Western Europe a single incandescent smear — and
credits the measure as "as of YYYY-MM · PeeringDB connected capacity", never traffic. No backend, no
proxy, no runtime secret.
