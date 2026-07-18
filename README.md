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

Each project carries an `ignoreCommand` so a PR only redeploys the projects it can actually
affect — a docs-only PR builds nothing. Vercel skips the build when the command exits `0` and
builds when it exits non-zero, and `git diff --quiet` matches that polarity exactly.

**The diff range is `$VERCEL_GIT_PREVIOUS_SHA..HEAD`, not `HEAD^..HEAD`.** That variable is the
SHA of the last *successful deploy of this project on this branch*, and Vercel exposes it only
when an Ignored Build Step is configured. `HEAD^` would compare against the previous *commit*,
which silently breaks the multi-commit case: push `feat: rewrite the pipeline` followed by
`docs: typo`, and every project skips, because the one commit it looked at touched only markdown.
Diffing from the last successful deploy means nothing can slip through a later commit's shadow,
and it's per-project — a project that skipped keeps its old SHA, so the next push still sees
everything that accumulated since it last actually built.

Two things about the path set are deliberate and must not be trimmed:

- **`packages/deck-kit` is in every project's list.** All three apps consume Deck Kit as source
  ([ADR 0014](./docs/adr/0014-deck-kit-shared-package.md)), so a Deck Kit change has to redeploy
  all of them. Watching only the project's own `apps/` directory would silently stop shipping
  Deck Kit changes — and a stale deploy looks like nothing is wrong.
- **`package.json` / `package-lock.json` are in every list**, so a dependency bump redeploys.

The trailing `':(exclude)**/*.md'` pathspec is what makes a genuinely docs-only PR skip even when
the markdown lives *inside* an app — `apps/glitch/CLAUDE.md` ships nothing. A commit touching both
markdown and source still builds, since the source path still matches.

Two safety properties, both verified before these commands landed:

- **Production always builds.** The `VERCEL_ENV != production` guard exits non-zero on production
  deploys, so `main` never skips regardless of the diff.
- **The first deploy on a branch always builds.** `VERCEL_GIT_PREVIOUS_SHA` is empty when the
  project has never deployed this branch, and the `-n` guard turns that into a build. There is no
  baseline to diff against, so the only safe answer is to build.
- **It fails toward deploying.** If the git command errors — a shallow clone that lacks the
  previous SHA, say — it exits non-zero and the build proceeds. The dangerous direction is a
  false skip, not a false build.

Paths are relative to where the command runs: the repo root for ASCII//Convert, and `apps/glitch`
/ `apps/golem` for the other two, which is why those `cd ../..` first (the same idiom their
install and build commands already use).

This is a different mechanism from `.github/workflows/ci.yml`, which has its own `paths-ignore` —
Vercel does not read the workflow file.

## Contributing

Commits follow [conventional commits](https://www.conventionalcommits.org/) (enforced by
commitlint). Releases run on [Changesets](./.changeset/README.md), per app — a PR that changes
app behavior adds one with `npm run changeset`
([ADR 0012](./docs/adr/0012-changesets-per-app-versioning.md)).

## License

[MIT](./LICENSE)
