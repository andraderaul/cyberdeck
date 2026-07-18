# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## What this repo is

**CYBERDECK** — a monorepo of client-side cyberpunk creative tools (ADR 0011). Each app is a
"program" that runs on the deck: it shares the visual language and code patterns, but is
versioned and deployed independently.

| App | Path | What it is |
|-----|------|------------|
| **ASCII//Convert** | `apps/ascii` | Image / webcam → interactive ASCII art |
| **GLITCH//Studio** | `apps/glitch` | Glitch effect pipeline over image / webcam (tracer bullet — image → Channel Shift → PNG Export) |
| **GOLEM** | `apps/golem` | Third program — **design phase only**: `CONTEXT.md` and `docs/` exist, no code yet (ADRs 0018, 0019) |

Each app owns its `CLAUDE.md` and `CONTEXT.md` — read the one for the app you're working in.
`CONTEXT-MAP.md` maps the deck; `docs/adr/` holds all architectural decisions, deck-wide.

## Structure

Light npm workspaces — **no Nx/Turborepo** by design. Repo-wide tooling (Biome, lefthook,
commitlint, Changesets) lives at the root; each app owns its own build, test, and framework
dependencies.

ADR 0011 deferred every extraction until a second app made the real seams obvious. GLITCH//Studio
was that app, and the condition fired: **`packages/deck-kit`** now holds the proven-shared surface
(ADR 0014).

| Package | What crosses the seam |
|---------|----------------------|
| **`@cyberdeck/deck-kit`** | Visual language (`tokens.css` + Tailwind preset), `ui/` primitives, framework-neutral `hooks/` and `utils/`, the operational-error *mechanism*, the Recording core |

Consumed **as source** — `exports` point at `src/*` and each app's Vite transpiles it. No build
step, no `dist/`, no build ordering, which keeps the light-tooling stance intact. One non-obvious
constraint: every app must add `../../packages/deck-kit/src/**/*.{ts,tsx}` to its Tailwind
`content`, or the primitives' classes get purged at build.

The bar for extraction stays high: **an empty diff plus two real callers**, not "any duplication."
Duplication is still the *signal* of what repeats — `use-webcam-state` and `output.ts` were
deliberately left copied, and ADR 0014 records why so a future review doesn't re-suggest them. A
domain core never crosses the seam; each app's pipeline (ASCII conversion, glitch Effects) stays in
the app.

## Commands

Root scripts fan out across workspaces (`apps/*` and `packages/*`); `--workspace` targets one.

```bash
npm run dev          # start ASCII//Convert's dev server
npm run dev:glitch   # start GLITCH//Studio's dev server
npm run build        # build every app
npm run test         # ASCII//Convert's tests, in watch mode
npm run test:run     # run every workspace's tests once, deck-kit included (what CI runs)
npm run typecheck    # tsc -b across workspaces

npm run check        # biome check . (lint + format) — whole repo
npm run check:fix    # biome check . --write
npm run lint         # biome lint .
npm run format       # biome format . --write

npm run changeset    # add a changeset (see Releases)

# scoping to one app
npm run test --workspace @cyberdeck/ascii
npx vitest run src/ascii/renderer.test.ts   # from within apps/ascii
```

## Releases

`@changesets/cli` gives each app its own version and changelog — a bugfix in one app must never
bump another (ADR 0012). `semantic-release` is gone; conventional commits still drive commitlint,
but no longer drive versioning.

Any PR that changes app behavior runs `npm run changeset` and commits the generated file. PRs
touching only docs, CI, or tooling don't need one. On merge to `main`, CI opens a "Version
Packages" PR; merging that one applies the bumps and tags the release. See `.changeset/README.md`.

## Comment convention

Deck-wide — applies to every app.

**1. Only the non-obvious "why".** Never restate what the code or a name already says. Keep a
comment only when it carries rationale a reader couldn't infer from the code itself:

- a deliberate design choice (`Sequential by design — a stop must settle before the following start`)
- a behavior-preserving constraint or "do not simplify this" guard
- a reference to an ADR or a domain term from the app's `CONTEXT.md`

If a comment would only paraphrase the declaration below it, delete it and let the name carry the
meaning.

```ts
// Bad — restates the name
// Body scroll lock
useEffect(() => { ... })

// Good — explains a constraint the code can't show
// Safari private mode / sandboxed iframe — silently ignore
```

**2. JSDoc (`/** */`) on module-level declarations.** Document exported functions, types, and other
top-level declarations with JSDoc blocks rather than `//`.

Use plain `//` for everything that can't attach to a module-level declaration:

- notes inside a function or component body (a guard, a local const, an anonymous `useEffect`)
- `biome-ignore` directives
- **file headers** — a `/** */` block at the top of a file is not detached by a blank line;
  TypeScript binds it to the next declaration, so a module banner would surface as that
  declaration's hover text. Keep file headers as `//`.

```ts
/**
 * Pure: derives render instructions and ascii text from a cell grid — no DOM, fully testable.
 * See ADR 0005 for the pure/impure boundary rationale.
 */
export function computeFrame(...) { ... }
```

Both rules compose: JSDoc is the *format* for declaration-level comments, the "why" rule decides
*whether* the comment earns its place at all. A declaration with nothing non-obvious to say gets
no JSDoc.
