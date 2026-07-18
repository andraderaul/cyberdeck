---
status: accepted (supersedes the "no shared `packages/`" point of ADR 0011)
---

# The Deck Kit — first extracted shared package

ADR 0011 deferred every extraction until "a second app makes the real seams obvious," and kept
duplication as the *signal* of what actually repeats. GLITCH//Studio is that second app, and the
signal is now readable: a file-by-file diff of the two apps shows **17 modules identical to the
byte** — including `index.css` and `tailwind.config.js`. This is the trigger ADR 0011 named, so we
extract a single shared package, **`@cyberdeck/deck-kit`**, containing *only* the proven-shared
surface. ADR 0011 stays as the historical record of why we waited; this ADR records that the
condition fired and scopes what crosses the seam.

**Deck Kit** — the shared shell every program on the deck builds on: the visual language (design
tokens + Tailwind preset), the `ui/` primitives, the framework-neutral hooks and utils, and the
generic browser-plumbing (operational-error mechanism, canvas Recording). It is deliberately *not*
a domain core — each app's pipeline (ASCII conversion, glitch Effects) stays in the app.

## What the package is

- A real npm workspace at `packages/deck-kit`, `"private": true`, consumed **as source**: its
  `exports` point at `src/*` and each app's Vite transpiles it. No build step, no `dist/`, no
  build-ordering — this keeps the "light tooling, no Nx/Turborepo" stance of ADR 0011. The trade:
  the package is not consumable outside this monorepo, which is fine — nothing else consumes it.
- A single package, not three (`tokens` / `ui` / `hooks`). Today both apps consume every naipe
  together, so splitting now would create three hypothetical seams for a variation nobody exercises.
  If a third program wants one naipe without the others, that seam becomes real and we split then.
- Subpath exports by naipe — `@cyberdeck/deck-kit/{ui,hooks,utils,errors,recording}`, plus
  `/tokens.css` and `/tailwind-preset`. The subpaths mirror the folders both apps already use, so
  migration is largely a relative-path → package-path rewrite, and they become the natural fracture
  lines if the package is ever split.
- The package owns the visual language. `index.css` and `tailwind.config.js` have an empty diff:
  they *are* the deck's shared language (CONTEXT-MAP). The kit exports `tokens.css` (the CSS custom
  properties) and a Tailwind preset (the `theme`); each app imports the tokens, spreads the preset,
  and — the one non-obvious constraint — **adds `../../packages/deck-kit/src/**/*.{ts,tsx}` to its
  Tailwind `content`**, or the primitives' classes are purged at build.
- The package owns its own tests. The migrated modules bring their colocated tests; the kit gets its
  own `vitest` + `test-setup`. CI's `npm run test:run` already fans out across workspaces.

## What crosses the seam

Only the modules with two real callers and an empty diff. Three extractions:

- **Deck Kit primitives** — `tokens.css` + `tailwind-preset`; `ui/` (`button`, `chip`, `label`,
  `slider`, `toast`, `toggle-group`, `source-image-drop-zone`, `error-boundary`, `toast-provider`,
  `mobile-bottom-sheet`); `hooks/` (`use-dialog`, `use-toast`); `utils/` (`cn`, `share`, `device`,
  `load-image-file`).
- **Operational-error mechanism** (`/errors`) — `AppError`, `createError`, `isAppError`,
  `normalizeError`. The *mechanism* is shared; each app keeps its own `Errors` catalog and imports
  `createError`. The vocabulary never crosses the seam.
- **Recording core** (`/recording`) — `useRecording`, `detectMimeType`, `isRecordingSupported`,
  `formatElapsedTime`, `mimeToExtension`. Vocabulary-neutral: failures surface via an
  `onError?(reason: 'start' | 'export')` code the app words itself, and the filename is an injected
  `filename(ext)` — so `ext` resolution and the MediaRecorder plumbing are shared while every string
  stays app-side.

## What we deliberately did NOT extract

Recorded so a future review re-running the diff does not re-suggest these:

- **`use-webcam-state`** — the shared body (~40 lines of `getUserMedia` + track lifecycle) is
  wrapped in an interface saturated with domain vocabulary: `mode` is the *argument the caller
  passes* (`switchMode('live' | 'webcam')`), and `Effect` is a reserved domain word in GLITCH (a
  pure `PixelBuffer` transform), so a neutral core could name its actions neither app's way.
  Extracting only the imperative controller would split `startWebcam`'s getUserMedia → dispatch →
  callback story across a package seam — a *locality loss* for a thin DRY win. The mirror / no-mirror
  divergence is load-bearing (ASCII mirrors the selfie view; GLITCH cannot, because its canvas *is*
  the output). Left copied — this is ADR 0011 being right.
- **`output.ts`** (beyond `mimeToExtension`) — `outputFilename` and `OutputKind` are almost entirely
  app-specific strings (`ascii-art.png` vs `glitch.png`); the shared shape is too thin to extract
  without dragging vocabulary across the seam. `planPngExport` / `MAX_EXPORT_DIM` are ASCII-only
  (one caller). Left in each app.
- **App-specific `ui/` primitives** — `badge`, `modal`, `tooltip`, `header-button`, `error-text`
  have a single caller (ASCII). One caller is a hypothetical seam; they rise into the kit when a
  second caller appears.

## Considered options

- **Extract three packages up front (`tokens` / `ui` / `hooks`)** — rejected: no app exercises the
  seams between them yet; premature per-naipe versioning and build config for a hypothetical split.
- **Pre-build the package to `dist` with its own bundler** — rejected: forces build ordering, watch
  mode, and artifact caching — the tooling weight ADR 0011 declined. Ship-source produces an
  identical app bundle.
- **Extract the whole webcam and output modules too** — rejected: drags app vocabulary through one
  interface, the exact "force different tools through one abstraction" failure ADR 0011 warns of.

## Consequences

- Each behaviour-changing PR still adds a changeset (ADR 0012); extraction PRs that change an app's
  imports touch that app's version. The package is private, so it is not itself released.
- Each app's `index.css` and `tailwind.config.js` shrink to an import + a preset spread + the
  package `content` glob. That glob is a standing requirement for any app on the deck.
- The kit's interface carries one non-obvious constraint (the Tailwind `content` glob); it lives in
  the package README and above.
- Future reviews scope against "empty diff + two callers," not against "any duplication."
