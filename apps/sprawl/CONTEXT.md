# CONTEXT — SPRAWL//Atlas

The deck's fourth program and its first **piece, not tool** (ADR 0021). It takes no user material:
it ships with a vendored snapshot of the world's **connected capacity** and shows it as light on a
dark field. You do not create anything; you *look*, and you *rewrite the scale* until structure
emerges from the overflow. The seed is the *Neuromancer* passage — a map where each gigabyte is a
pixel, whited out under its own load, repaired at a coarser scale.

## The ruler is the first screen

Every other program is judged by whether you come **back**. This one is judged by its **first
screen** (ADR 0021). It opens *white* — honestly blown out at a fine scale — and you learn it by
repairing it. Do not measure it by return visits, and do not "fix" it into a tool (no upload, no
import, no traceroute — that absence is the decision).

## Domain language

Use these terms precisely.

| Term | Meaning | Avoid |
|------|---------|-------|
| **DataPoint** | One facility: `{ lat, lng, capacity, label? }` — the pure core's currency, DOM-free | node, dot, city |
| **connected capacity** | The measure: PeeringDB `netixlan.speed` (Mbps) summed per facility | traffic, bandwidth-used, load |
| **Scale** | The log-window state: `topCapacity`, the capacity mapping to the top of the brightness ramp (`1 px`) | zoom, level |
| **OVERFLOW** | The honest white default — the scale so fine that capacity clips against the ceiling | error, saturation warning |
| **RenderInstruction** | A projected, lit point ready to paint: `{ x, y, brightness, capacity, label? }` | pixel, marker |
| **Viewport** | The canvas frame the projection paints into | screen, canvas |
| **snapshot** | The committed `dataset-YYYY-MM.json` — a dated, versioned artifact (ADR 0022) | feed, live data |

## The core pattern (ADR 0005 / ADR 0021)

- **Pure core**: `project(dataset, scale, viewport) → RenderInstruction[]` in `src/atlas/project.ts`.
  Equirectangular projection (`projectLatLng`) + a logarithmic scale window (`brightnessFor`,
  `WINDOW_DECADES`). No DOM — fully unit-tested.
- **Impure shell**: `paintFrame(ctx, instructions, viewport)` in `src/atlas/paint.ts` — the *only*
  function that touches a canvas context. Points are painted as light with additive compositing so
  dense regions bloom into a smear.
- **Data**: `src/atlas/dataset.ts` loads the committed snapshot; `#225` reads a hand-picked
  `dataset-sample.json`, `#227` swaps in the vendored `dataset-YYYY-MM.json` behind the same module.

## v1 scope (by issue)

- **#225 walking skeleton** ✅ — scaffold, pure `project`/`paintFrame`, sample dataset, fixed scale.
- **#226 scale instrument** ✅ — OVERFLOW on load, continuous wheel/drag/arrow-key gesture over the
  canvas (the map *is* the control), always-visible live scale reader that flips out of its OVERFLOW
  voice as structure emerges.
- **#227 vendored snapshot** ✅ — the PeeringDB fetch/aggregate script (`scripts/vendor-dataset.mjs`
  + pure `scripts/aggregate.mjs`), a scheduled CI drift job, and the real dated
  `dataset-YYYY-MM.json` (~1,958 facilities, ~6.6 decades of connected capacity) behind the
  generated `snapshot.ts`.
- **#228 labels + hover**, **#229 earned basemap**, **#230 shareable link (+ PNG)**.

A **time axis** (successive dated snapshots) is deliberately *out of v1* (ADR 0021); the dated
filename keeps that door open for free.
