# ADR 0012 — Changesets for per-app versioning

## Status

Accepted

## Context

ASCII//Convert used `semantic-release` (single-package, conventional-commits auto-release,
`chore(release): X.Y.Z [skip ci]`). In the CYBERDECK monorepo (ADR 0011) the apps have independent
lifecycles, so a single version number no longer fits.

## Decision

Adopt `@changesets/cli` for **per-package** versioning and changelogs, replacing `semantic-release`.
A bugfix in GLITCH//Studio must never bump ASCII//Convert.

The changelog is kept deliberately: it is valued as a record of progress and a discipline, not
treated as inherited ceremony — so dropping versioning entirely (continuous deploy with no releases)
was declined even though these are consumer-less client-side SPAs.

## Considered Alternatives

- **Single unified version for the whole deck.**
  - *Rejected because:* it forces lockstep releases and couples deploys, violating the
    app-independence principle of ADR 0011.
- **`semantic-release-monorepo` plugin.**
  - *Rejected because:* monorepo support is fragile (scoping commits per package, multiple release
    configs) for more maintenance and less guarantee.
- **No versioning / continuous deploy only.**
  - *Rejected because:* it loses the changelog the author values.

## Consequences

**Positive:**
- Each app gets its own version and changelog; a bugfix in one app never bumps another.

**Negative:**
- A small per-PR ritual: contributors add a changeset file describing the change.
- The `semantic-release` configuration is removed as part of the migration.

## Related ADRs

- ADR 0011 — Monorepo under the CYBERDECK umbrella.
