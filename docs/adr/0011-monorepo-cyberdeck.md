---
status: accepted (its "no shared `packages/`" point superseded by ADR 0014)
---

# Monorepo under the CYBERDECK umbrella

ASCII//Convert is the first of several planned client-side creative tools that share a
cyberpunk design system (GLITCH//Studio is next). We restructure the repository into a
`cyberdeck` monorepo with an `apps/*` layout — `apps/ascii`, then `apps/glitch` — under
the umbrella brand **CYBERDECK** (canonical name; "deck" is the in-product nickname, and
each app is framed as a "program" that runs on the deck).

Tooling stays light — npm/pnpm workspaces only, no Nx/Turborepo — and the apps are kept
**independent**: there is deliberately **no shared `packages/`** yet. Whatever the second
app needs is copied by hand from ASCII//Convert; the resulting duplication is tolerated as
a *signal* of what actually repeats. The shared core is extracted only once a second app
makes the real seams obvious.

> **Superseded on this point.** GLITCH//Studio made the seams obvious and the condition above
> fired: `packages/deck-kit` exists — see ADR 0014, which also records what was deliberately left
> duplicated. The rest of this ADR (monorepo over separate repos, `apps/*`, light tooling) stands.

## Considered options

- **Separate repositories per app** — rejected: the two products share a design system and
  patterns; co-locating them makes the eventual, evidence-based extraction cheap, without
  forcing it now.
- **Monorepo with a shared core extracted up front** — rejected: designing an abstraction
  against imagined requirements guesses the seams wrong. An Audio Visualizer, for example,
  would share almost nothing with the canvas pipeline. Premature extraction forces very
  different tools through one abstraction.
- **A "glitch mode" inside ASCII//Convert** — rejected: mixes two distinct domains (ASCII
  conversion vs. pixel-level glitch) into one `CONTEXT.md` and one design, becoming debt
  the moment they need to separate.

## Consequences

- One-time, mechanical migration of ASCII//Convert into `apps/ascii/` (paths and configs
  only, no behavior change), verified green against the existing test suite before any new
  work begins.
- The release pipeline is reworked — see ADR 0012.
- Discipline is required to resist premature DRY: co-located apps invite "extract this now"
  urges that this decision explicitly defers.
