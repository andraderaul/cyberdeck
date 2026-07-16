# Changesets for per-app versioning

ASCII//Convert used `semantic-release` (single-package, conventional-commits auto-release,
`chore(release): X.Y.Z [skip ci]`). In the CYBERDECK monorepo (ADR 0011) the apps have
independent lifecycles, so a single version number no longer fits. We adopt
`@changesets/cli` for **per-package** versioning and changelogs, replacing
`semantic-release`. A bugfix in GLITCH//Studio must never bump ASCII//Convert.

The changelog is kept deliberately: it is valued as a record of progress and a discipline,
not treated as inherited ceremony — so dropping versioning entirely (continuous deploy with
no releases) was declined even though these are consumer-less client-side SPAs.

## Considered options

- **Single unified version for the whole deck** — rejected: forces lockstep releases and
  couples deploys, violating the app-independence principle of ADR 0011.
- **`semantic-release-monorepo` plugin** — rejected: monorepo support is fragile (scoping
  commits per package, multiple release configs) for more maintenance and less guarantee.
- **No versioning / continuous deploy only** — rejected: loses the changelog the author
  values.

## Consequences

- A small per-PR ritual: contributors add a changeset file describing the change.
- The `semantic-release` configuration is removed as part of the migration.
