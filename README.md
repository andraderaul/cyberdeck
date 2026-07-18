# CYBERDECK

A deck of client-side cyberpunk creative tools. Each app is a "program" that runs on the deck:
it shares the visual language and code patterns, but ships, versions, and deploys on its own.

No backend server — everything runs in the browser.

## Programs

| Program | Path | What it does |
|---------|------|--------------|
| **[ASCII//Convert](./apps/ascii)** | `apps/ascii` | Turns an image or your webcam into interactive ASCII art. **[Live demo →](https://ascii-art-converter-tawny.vercel.app/)** |
| **GLITCH//Studio** | `apps/glitch` | Runs a fixed pipeline of glitch effects over an image or webcam — real-time preview, curated presets, and PNG / video export. **[Live demo →](https://cyberdeck-glitch-studio.vercel.app/)** |

## Running locally

**Requirements:** Node.js 22+ (see `.nvmrc`)

```bash
npm install                 # installs every app (npm workspaces)
npm run dev                 # start ASCII//Convert

npm run build               # build every app
npm run test:run            # run every app's tests once
npm run check               # Biome lint + format, repo-wide
```

Scope any app script with `--workspace @cyberdeck/ascii`.

## Structure

```
apps/ascii         ASCII//Convert
apps/glitch        GLITCH//Studio
packages/deck-kit  the shared shell both programs build on
docs/adr           architectural decisions, deck-wide
CONTEXT-MAP.md     how the programs relate
```

Tooling is deliberately light: npm workspaces, no Nx or Turborepo. Repo-wide tooling (Biome,
lefthook, commitlint, Changesets) sits at the root; each app owns its own build and test
dependencies.

For a long time there was **no shared `packages/`** — duplication was kept as a signal of what
actually repeats ([ADR 0011](./docs/adr/0011-monorepo-cyberdeck.md)). GLITCH//Studio made the
seams obvious, so the proven-shared surface was extracted into
**[`@cyberdeck/deck-kit`](./packages/deck-kit)** — the visual language, `ui/` primitives, and
generic browser plumbing. It's consumed as source (no build step) and is deliberately *not* a
domain core: each app's pipeline stays in the app ([ADR 0014](./docs/adr/0014-deck-kit-shared-package.md)).

## Deploys

Each app is its own Vercel project, both pointing at this repo:

- **ASCII//Convert** — the root `vercel.json` builds it (`outputDirectory: apps/ascii/dist`), so
  the existing project needed no dashboard change after the monorepo move.
- **GLITCH//Studio** — a separate project with **Root Directory** set to `apps/glitch`, driven by
  [`apps/glitch/vercel.json`](./apps/glitch/vercel.json). Install and build `cd` to the repo root
  so the `@cyberdeck/deck-kit` workspace dependency resolves.

A third app follows the GLITCH pattern — its own project and `vercel.json`, not another entry here.

## Contributing

Commits follow [conventional commits](https://www.conventionalcommits.org/) (enforced by
commitlint). Releases run on [Changesets](./.changeset/README.md), per app — a PR that changes
app behavior adds one with `npm run changeset`
([ADR 0012](./docs/adr/0012-changesets-per-app-versioning.md)).

## License

[MIT](./LICENSE)
