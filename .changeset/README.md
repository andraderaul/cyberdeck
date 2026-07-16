# Changesets

Per-app versioning and changelogs for the CYBERDECK monorepo — see
[ADR 0012](../docs/adr/0012-changesets-per-app-versioning.md).

Apps version independently: a change to GLITCH//Studio must never bump ASCII//Convert.

## Adding a changeset

Any PR that changes app behavior adds one:

```bash
npm run changeset
```

Pick the affected app, pick a bump (patch / minor / major), and write a one-line summary —
it lands verbatim in that app's `CHANGELOG.md`, so write it for a reader of the changelog.
The command writes a Markdown file here; commit it with your PR.

PRs that touch only docs, CI, or tooling don't need one.

## Releasing

On merge to `main`, CI runs `changeset version` (consuming the files here into per-app
version bumps and changelog entries) and `changeset tag`. Apps are private and are never
published to npm — the tags mark the release and the deploy is Vercel's.
