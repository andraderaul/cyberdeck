# @cyberdeck/sprawl

## 0.1.3

### Patch Changes

- f79c3fe: The share link, PNG and outline controls now answer a 44x44 pointer target. They stood at ~32px tall.

  The target grows without the chrome growing with it: these sit on the piece, and the first screen is
  meant to be light on dark rather than a frame around its own controls.

- Updated dependencies [f79c3fe]
- Updated dependencies [f79c3fe]
- Updated dependencies [f79c3fe]
  - @cyberdeck/deck-kit@0.5.0

## 0.1.2

### Patch Changes

- f103199: Picks up the deck-kit release that grows the Theme roster to seven and turns the picker into a
  popover (ADR 0024). SPRAWL//Atlas gains nothing from it and shows no change on screen: it is excluded
  from Themes by explicit decision (ADR 0021, ADR 0024), never sets the theme attribute, and the kit's
  roster guard still asserts it has no pre-paint script so a future consistency pass cannot "fix" the
  omission.
- Updated dependencies [f103199]
  - @cyberdeck/deck-kit@0.3.0

## 0.1.1

### Patch Changes

- abed3c7: SPRAWL//Atlas's chrome names roles instead of hues, which is what keeps it rendering now that the
  literal hue vocabulary has left the Tailwind preset (ADR 0024). Nothing changes on screen.

  It is the one program deliberately excluded from Themes. Its pixels are neither chrome nor the
  user's — they are the piece, and the piece _is_ cyan light against the dark (ADR 0021). It never
  sets the theme attribute, so it stays `ice` forever, and the kit's roster guard asserts that it has
  no pre-paint script so a future consistency pass cannot "fix" the omission.

- Updated dependencies [abed3c7]
  - @cyberdeck/deck-kit@0.2.0

## 0.1.0

### Minor Changes

- 9d553a6: SPRAWL//Atlas walking skeleton (#225) — the deck's fourth program and its first _piece, not tool_
  (ADR 0021). Scaffolds `apps/sprawl` wired to the deck-kit visual language, and renders the world's
  connected capacity as light end-to-end: a committed sample dataset → the pure
  `project(dataset, scale, viewport)` (equirectangular projection + a logarithmic scale window that
  clamps to white above the top — the honest overflow) → `paintFrame`, the one canvas-touching step,
  painting points as additive light on a dark field. Fixed scale for now; the scale gesture, real
  PeeringDB snapshot, labels, basemap and shareable link follow.
- 9d553a6: SPRAWL//Atlas earned basemap overlay (#229, ADR 0021 P6) — a continental outline that is _conquered_,
  not given. Off by default, so the first screen is pure light on dark; press `B` (or the corner chip,
  for touch) and a faint continental gabarito — a vendored Natural Earth 110m coastline — registers on
  the _same_ equirectangular frame as the points and confirms the guess the dark already let you make.
  It strokes thin and dim over the light, so it reads as confirmation rather than the ground the points
  sit on, and toggling never disturbs the current scale or viewport. The coastline is a static vendored
  asset (`vendor-coastline.mjs`) — no scheduled re-vendor; coastlines don't drift.
- 9d553a6: SPRAWL//Atlas city labels + hover inspection (#228) — orientation without a basemap (ADR 0021, P5).
  City names ride on the strongest nodes (derived from the dataset, grouped per city and spatially
  thinned so the dense European core doesn't pile names into an unreadable smear), each fading with
  its node as the scale slides. Hovering a point reveals its identity and value —
  `Fort Worth, US · 14.1 Tbps` — with a ring on the inspected node, the value in the same Gbps/Tbps
  language as the scale reader, named as connected capacity, never traffic. The projection now runs
  once in CSS space and feeds both the canvas paint (scaled to devicePixelRatio) and the DOM overlays,
  so labels and hover land exactly on the light.
- 9d553a6: SPRAWL//Atlas scale instrument (#226) — the heart of the piece (ADR 0021). The map opens in
  OVERFLOW (`1 px = 1 Gbps`, honestly blown white — the failure is the tutorial) and you repair it by
  rewriting the scale coarser: a continuous wheel / drag / arrow-key gesture _over the canvas_ (the
  map is the control, ADR 0020) slides the logarithmic window in log space, so structure emerges
  smoothly from the smear with no order-of-magnitude jump. The always-visible reader tracks
  `1 px ≈ N Gbps/Tbps` live and flips out of its electric OVERFLOW voice into cyan once the map is no
  longer blown out. Points are painted as a soft additive glow that swells with brightness, so dense
  regions bloom into one incandescent smear.
- 9d553a6: SPRAWL//Atlas shareable link export (#230, ADR 0021 following GOLEM//Console) — the export is
  _state_, not a file. A URL encodes the scale you slid to (and the basemap toggle), so the link opens
  the recipient at the same point in the vertigo and they keep sliding from there. Deterministic,
  because the dataset underneath is a fixed vendored snapshot (ADR 0022): the same link resolves to the
  same map for everyone. The app boots from the URL and keeps the address bar synced live, so the link
  is always current. A PNG of the current frame is a deliberately quiet secondary — a still for a
  wallpaper — kept from becoming the reason nobody uses the link. This completes SPRAWL//Atlas v1.
- 9d553a6: SPRAWL//Atlas vendored PeeringDB snapshot (#227) — the real data behind the piece (ADR 0022). A
  build-time pipeline under `apps/sprawl` fetches PeeringDB (unauthenticated), sums `netixlan.speed`
  per exchange and attributes it to each facility it sits in (`ixfac`), and writes a normalised,
  dated `dataset-YYYY-MM.json` (~1,958 facilities, ~6.6 decades of connected capacity, ~150 KB) behind
  a generated `snapshot.ts` pointer. The aggregation is a pure, unit-tested module; the fetch is the
  impure shell. A scheduled CI job re-runs it and opens a PR on drift, so the committed dataset stays
  a versioned artifact with its provenance in git history. The app now opens on the real world — at
  OVERFLOW the continents draw themselves in light, Western Europe a single incandescent smear — and
  credits the measure as "as of YYYY-MM · PeeringDB connected capacity", never traffic. No backend, no
  proxy, no runtime secret.
