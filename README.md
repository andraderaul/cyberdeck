# CYBERDECK

A deck of client-side cyberpunk creative tools. Each app is a "program" that runs on the deck:
it shares the visual language and code patterns, but ships, versions, and deploys on its own.

No backend server — everything runs in the browser.

## Programs

| Program | Path | What it does |
|---------|------|--------------|
| **[ASCII//Convert](./apps/ascii)** | `apps/ascii` | Turns an image or your webcam into interactive ASCII art. **[Live demo →](https://ascii-art-converter-tawny.vercel.app/)** |
| **GLITCH//Studio** | `apps/glitch` | Runs a fixed pipeline of glitch effects over an image or webcam — real-time preview, curated presets, and PNG / video export. **[Live demo →](https://cyberdeck-glitch-studio.vercel.app/)** |
| **GOLEM//Console** | `apps/golem` | A 32-bit fantasy computer: write assembly, assemble it, and drive execution from a command line while registers, memory and the machine's Terminal update live. *In progress — scaffold only.* |

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
apps/golem         GOLEM//Console
packages/deck-kit  the shared shell every program builds on
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

## Credits

GOLEM//Console's instruction set is inherited from **Poxim**, the didactic 32-bit architecture
used in the Arquitetura de Computadores course at **UFS (Universidade Federal de Sergipe)**, 2017.
The encoding, register file, and 42 mnemonics are Poxim's; the reference programs under
`apps/golem/src/golem/__fixtures__/` are the course's example project, kept verbatim as test
oracles. Credit to the course and its instructor —
[ADR 0019](./docs/adr/0019-golem-isa-inherited-from-poxim.md) explains why the ISA was inherited
rather than designed.

## Deploys

Each app is its own Vercel project, both pointing at this repo:

- **ASCII//Convert** — the root `vercel.json` builds it (`outputDirectory: apps/ascii/dist`), so
  the existing project needed no dashboard change after the monorepo move.
- **GLITCH//Studio** — a separate project with **Root Directory** set to `apps/glitch`, driven by
  [`apps/glitch/vercel.json`](./apps/glitch/vercel.json). Install and build `cd` to the repo root
  so the `@cyberdeck/deck-kit` workspace dependency resolves.

GOLEM//Console follows the GLITCH pattern — its own Vercel project with **Root Directory** set to
`apps/golem`, driven by [`apps/golem/vercel.json`](./apps/golem/vercel.json). Not yet deployed.

### Skipping preview deploys

Each project's `ignoreCommand` skips its build (exit `0`) when the diff touches nothing that
project ships. Four details are load-bearing:

- **`packages/deck-kit` is in every project's list** — all three apps consume it as source
  ([ADR 0014](./docs/adr/0014-deck-kit-shared-package.md)). Watching only an app's own directory
  would silently stop deploying Deck Kit changes.
- **The range is `$VERCEL_GIT_PREVIOUS_SHA..HEAD`** — the last successful deploy of *that project
  on that branch*. `HEAD^` would see only the newest commit, so a code commit pushed ahead of a
  docs commit would skip.
- **`':(exclude)**/*.md'`** — markdown inside an app (`apps/glitch/CLAUDE.md`) ships nothing.
- **It fails toward deploying.** Production, a branch's first deploy (empty previous SHA), and any
  git error all build. A false skip hides; a false build costs a minute.

Paths are relative to where the command runs, hence the `cd ../..` in the nested configs. Vercel
does not read `.github/workflows/ci.yml` — that has its own `paths-ignore`.

## Contributing

Commits follow [conventional commits](https://www.conventionalcommits.org/) (enforced by
commitlint). Releases run on [Changesets](./.changeset/README.md), per app — a PR that changes
app behavior adds one with `npm run changeset`
([ADR 0012](./docs/adr/0012-changesets-per-app-versioning.md)).

## License

[MIT](./LICENSE)
