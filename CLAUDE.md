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
| **GOLEM//Console** | `apps/golem` | A 32-bit fantasy computer — write assembly, assemble it, drive execution from a command line while registers, memory and the Terminal update live (ADRs 0018, 0019) |
| **SPRAWL//Atlas** | `apps/sprawl` | The deck's first *piece, not tool* (ADR 0021) — the world's connected capacity as light, repaired at a coarser scale until structure emerges from the overflow. Ships a vendored PeeringDB snapshot (ADR 0022) |

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
| **`@cyberdeck/deck-kit`** | Visual language (`tokens.css` + Tailwind preset + the Themes and their guards), `ui/` primitives, framework-neutral `hooks/` and `utils/`, the operational-error *mechanism*, the Recording core |

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
npm run dev:golem    # start GOLEM//Console's dev server
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

## Name the role, not the hue

Deck-wide. The visual language is a set of named Themes — `ice`, `construct`, `chiba` — and only
the *semantic* layer varies between them (ADR 0024). Write `text-accent`, never `text-violet`;
`bg-bg-elevated`, never `bg-shadow`. The primitive hue names are `ice`'s vocabulary and are not in
the Tailwind preset at all, so naming one renders unstyled rather than erroring — which is why the
kit's vocabulary guard fails the build with the class, the file and the line.

SPRAWL//Atlas is excluded from Themes by explicit decision (ADR 0021, ADR 0024), but not from this
rule: it promotes like everything else and simply never sets the theme attribute.

## Name a scale step the preset defines

The same silent failure as a literal hue, one layer over: `gap-2xs` is a key, `gap-3xs` is not, and
Tailwind answers an undefined step by generating no class at all — no error from Tailwind, tsc or
Biome. Each scale is its own set and none of them extrapolates:

| Scale | Steps |
|-------|-------|
| `spacing` (`p-`, `m-`, `gap-`, `inset-`, …) | `2xs · xs · sm · md · lg · xl · 2xl · 3xl` |
| `sp-*`, section macro spacing, under those same utilities | `sp-xs · sp-sm · sp-md · sp-lg · sp-xl · sp-2xl` |
| `borderRadius` (`rounded-`) | `none · xs · sm · md · pill` |
| `fontSize` (`text-`) — **unguarded**, see below | `xs · sm · base · md · lg · xl · 2xl` |

So there is no `3xs`, no `4xl`, and no `rounded-lg` from this vocabulary. Note the two spacing rows
do **not** share ends: `gap-3xl` is real and `p-sp-3xl` is not, and sharing the utilities is exactly
what makes that one easy to reach for. Tailwind's own numeric
steps (`gap-4`, `p-0.5`) and arbitrary values (`min-h-[44px]`) stay valid — the preset extends rather
than replaces. The kit's scale guard fails the build the same way the hue guard does, with the class,
the file and the line.

The `fontSize` row is the exception, and it's the row to be careful in: the guard **cannot** cover
`text-`, because that one prefix is three namespaces at once — `fontSize` ∪ `colors` ∪
`text-center`/`text-wrap`/… — so no deny list over it is decidable (`theme/audit.ts`). A mistyped
font step is therefore the one scale typo nothing objects to. Two traps ride along: `md` is 18px and
sits *between* `base` and `lg`, which is not where Tailwind puts it; and because the preset extends,
the steps it doesn't name stay Tailwind's own, so `text-3xl` resolves to 30px and silently leaves the
deck scale. Where a size repeats, prefer a named constant over a step spelled at each callsite —
`ICON_GLYPH_SIZE` below is the worked example, and a test pins the step it names to the preset.

One wart to know about rather than work around: `--gap-xs` is **4px** and `--gap-2xs` is **6px**, so
`xs` is the *tighter* of the two — the opposite of how the rest of the scale reads. Nothing today is
wrong because of it, and renaming would touch every program, so it stands unresolved rather than
decided; check the token values before reaching for either.

## Size an icon-only glyph with `ICON_GLYPH_SIZE`

Deck-wide. A control whose whole visible content is a glyph takes `ICON_GLYPH_SIZE` from the kit
(`deck-kit/ui`) — 18px with the line box pinned. A 44x44 target holds the press, but an 11px mark
adrift in that box still doesn't *read* as pressable, and the two came apart the moment the targets
landed.

The condition is **icon-only**. A control with a visible label already has the word carrying it, so
`✕ clear` and `◈ analyze` keep the text size they inherit; growing the punctuation beside a word
only unbalances the line. Decorative glyphs aren't controls and don't take it either.

**Never on a control over the canvas.** There the backdrop is the user's artwork (ADR 0013) or the
piece itself (ADR 0021) — that chrome stays at its drawn size and buys its 44px as an overlay
(`ui/touch-target.ts`) precisely so the picture isn't charged for its own controls. A bigger glyph
grows the chrome, which is the same charge by another route.

Take the constant rather than spelling `text-md` at the callsite — the reason is the unguarded
`fontSize` row above.

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
