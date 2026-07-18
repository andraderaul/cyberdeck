# CYBERDECK

A deck of client-side cyberpunk creative tools. Each app is a "program" that runs on the deck:
it shares the visual language and code patterns, but ships, versions, and deploys on its own.

No backend server — everything runs in the browser.

## Programs

| Program | Path | What it does |
|---------|------|--------------|
| **[ASCII//Convert](./apps/ascii)** | `apps/ascii` | Turns an image or your webcam into interactive ASCII art. **[Live demo →](https://ascii-art-converter-tawny.vercel.app/)** |
| **GLITCH//Studio** | `apps/glitch` | Runs a fixed pipeline of glitch effects over an image or webcam — real-time preview, curated presets, and PNG / video export. See [`apps/glitch/CONTEXT.md`](./apps/glitch/CONTEXT.md). |

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

Apps deploy independently. `vercel.json` at the root builds ASCII//Convert
(`outputDirectory: apps/ascii/dist`), so the existing Vercel project needs no dashboard
change after the monorepo move. A second app gets its own Vercel project with **Root
Directory** set to its folder — not another entry here.

## Contributing

Commits follow [conventional commits](https://www.conventionalcommits.org/) (enforced by
commitlint). Releases run on [Changesets](./.changeset/README.md), per app — a PR that changes
app behavior adds one with `npm run changeset`
([ADR 0012](./docs/adr/0012-changesets-per-app-versioning.md)).

## License

[MIT](./LICENSE)
