// The bundle budget's ceilings — gzipped kB, per app. **This header is the canonical statement of
// the design; `scripts/bundle-budget.mjs` and the README point here rather than restate it.**
//
// Data only: the script holds every bit of logic, and this file exists apart from it so that
// **raising a ceiling is its own diff hunk**. That is the whole design. A number that can drift
// silently is not a budget; a number a reviewer has to approve by hand is.
//
// A JS module rather than JSON because the reasoning below is the load-bearing half of the file and
// JSON takes no comments — the same reason README.md carries the prose for `vercel.json`.
//
// **Two ceilings per app, never one.** `entry` is what first paint costs: the module entry plus
// everything Vite modulepreloads. `lazy` is the total of everything else Vite emits under
// `assets/` — a chunk reached through a dynamic `import()`, or a worker entry, which is fetched
// when its `new Worker` runs and never before. Either way it is not on the first-load path, and it
// is never folded into `entry`: ASCII//Convert's three AI adapters are code-split on purpose, and a
// summed ceiling would charge the visitor who never opens AI Analysis for all three SDKs, which
// reads as pressure to undo the split. Every lazy chunk is still reported by name, because which
// one moved is what says whether a split still holds.
//
// The `lazy: 0` rows are honest, not placeholders: those three programs emit nothing off the
// first-load path today. Splitting one out — or giving one a worker — will fail this check on its
// first run, and that failure is the feature: it puts the split in front of a reviewer as a line in
// this file instead of letting it happen unremarked. The failure message says so, so it does not
// read as broken tooling.
//
// GLITCH//Studio is the first program to have gone through that, and it is why the definition above
// says "or a worker entry": its `lazy` row is reached through no `import()` at all. It is the
// Chain's **Worker** (ADR 0002), which Vite emits as its own chunk because a worker is a second
// top-level module graph. It costs the pipeline twice over — once in the entry chunk, where the
// synchronous fallback still needs it, and once in the worker chunk — and that duplication is the
// price of the port rather than an oversight. The chunk is fetched when a Source is opened, never
// at first paint, which is why it belongs here and not in `entry`.
//
// Ceilings were set from a measured `npm run build` plus roughly 5% of headroom: enough that
// ordinary work does not trip the guard, tight enough that a dependency arriving whole does. Measure
// on the Node in `.nvmrc` — zlib's deflate differs between majors, and the script warns if it does
// not match.
//
// **SPRAWL//Atlas is the row to watch.** Its vendored snapshot is `import`ed straight into the
// bundle through `src/data/snapshot.ts` (ADR 0022), so the dataset *is* the entry chunk — which is
// why it carries the largest number here while being the smallest program. A scheduled job
// re-vendors that file on drift, and today it is one dated snapshot; ADR 0021's deferred time axis
// makes it N of them, at which point "the snapshot ships inline" stops being a detail and becomes a
// decision about lazy-loading the data. This ceiling is what forces that conversation at the moment
// it is due, rather than after the number has quietly doubled.

/** Gzipped kB (1 kB = 1000 B), matching what Vite prints at the end of a build. */
export const BUNDLE_BUDGET = {
  ascii: { entry: 76, lazy: 63 },
  deck: { entry: 60, lazy: 0 },
  glitch: { entry: 75, lazy: 2.6 },
  golem: { entry: 79, lazy: 0 },
  sprawl: { entry: 115, lazy: 0 },
}
