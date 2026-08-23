# CYBERDECK

A deck of client-side cyberpunk creative tools. Each app is a "program" that runs on the deck:
it shares the visual language and code patterns, but ships, versions, and deploys on its own.

No backend server — everything runs in the browser.

## Programs

| Program | Path | What it does |
|---------|------|--------------|
| **[ASCII//Convert](./apps/ascii)** | `apps/ascii` | Image or webcam → interactive ASCII art. **[Live →](https://ascii-art-converter-tawny.vercel.app/)** |
| **[GLITCH//Studio](./apps/glitch)** | `apps/glitch` | A glitch-effect pipeline over image or webcam — live preview, presets, PNG / video export. **[Live →](https://cyberdeck-glitch-studio.vercel.app/)** |
| **[GOLEM//Console](./apps/golem)** | `apps/golem` | A 32-bit fantasy computer: write assembly, assemble it, run it from a command line as registers, memory and the Terminal update live. **[Live →](https://cyberdeck-golem.vercel.app/)** |
| **[SPRAWL//Atlas](./apps/sprawl)** | `apps/sprawl` | The deck's first *piece, not tool*: the world's connected capacity as light. Opens blown white; you repair it by sliding the scale coarser until structure emerges. **[Live →](https://atlas-sprawl.vercel.app/)** |

## Running locally

**Requirements:** Node.js 22+ (see `.nvmrc`)

```bash
npm install                 # installs every app (npm workspaces)
npm run dev                 # start ASCII//Convert

npm run build               # build every app
npm run test:run            # run every app's tests once
npm run test:e2e            # smoke E2E against ASCII//Convert's built output (Playwright)
npm run check               # Biome lint + format, repo-wide
```

`test:e2e` builds the app and serves `dist` itself; the browser is a one-off
`npx playwright install chromium`.

Scope any app script with `--workspace @cyberdeck/ascii`.

## Structure

```
apps/ascii         ASCII//Convert
apps/glitch        GLITCH//Studio
apps/golem         GOLEM//Console
apps/sprawl        SPRAWL//Atlas
packages/deck-kit  the shared shell every program builds on
scripts/           repo-wide build-time tooling (the social cards and icon sets)
docs/adr           architectural decisions, deck-wide
CONTEXT-MAP.md     how the programs relate
```

Tooling is deliberately light: npm workspaces, no Nx or Turborepo. Repo-wide tooling (Biome,
lefthook, commitlint, Changesets) sits at the root; each app owns its own build and test
dependencies. Playwright joins them there rather than living in an app, because what it checks —
the Tailwind purge, the pre-paint Theme — only exists once an app has been *built*.

For a long time there was **no shared `packages/`** — duplication was kept as a signal of what
actually repeats ([ADR 0011](./docs/adr/0011-monorepo-cyberdeck.md)). GLITCH//Studio made the
seams obvious, so the proven-shared surface was extracted into
**[`@cyberdeck/deck-kit`](./packages/deck-kit)** — the visual language, `ui/` primitives, and
generic browser plumbing. It's consumed as source (no build step) and is deliberately *not* a
domain core: each app's pipeline stays in the app ([ADR 0014](./docs/adr/0014-deck-kit-shared-package.md)).

## Deploys

Each app is its own Vercel project pointing at this repo. There is no root `vercel.json`: all four
set **Root Directory** to their `apps/<name>` and are driven by that app's own `vercel.json`, which
`cd`s to the repo root so the `@cyberdeck/deck-kit` workspace dependency resolves.

Each project's `ignoreCommand` skips its build when the diff touches nothing it ships. It watches
the app plus `packages/deck-kit` (consumed as source by all,
[ADR 0014](./docs/adr/0014-deck-kit-shared-package.md)), diffs over
`$VERCEL_GIT_PREVIOUS_SHA..HEAD` (that project's last *successful* deploy on the branch), excludes
`**/*.md`, and fails toward deploying — production, a branch's first deploy, and any git error all
build.

That last case is what the trailing `; [ $? -eq 0 ]` buys, and it is the reason not to tidy it
away. Vercel reads exit 0 as "skip" and exit 1 as "build"; **any other status is a failed
deployment**, not a build. `git diff` exits 128 when it cannot resolve `$VERCEL_GIT_PREVIOUS_SHA`
— which is what a force-push does, orphaning the commit that project last deployed from a shallow
clone — so without the clamp the ignore step errors every deployment on that branch instead of
building it, and it keeps erroring, because the pinned SHA only advances on a *successful* deploy.
The clamp maps every non-zero status onto 1, which builds. JSON takes no comments, so this
paragraph is where that reasoning lives.

CI's `paths-ignore` is separate; Vercel does not read it.

## Contributing

Commits follow [conventional commits](https://www.conventionalcommits.org/) (enforced by
commitlint). Releases run on [Changesets](./.changeset/README.md), per app — a PR that changes
app behavior adds one with `npm run changeset`
([ADR 0012](./docs/adr/0012-changesets-per-app-versioning.md)).

## Credits

GOLEM//Console's instruction set is inherited from **Poxim**, the didactic 32-bit architecture
used in the Computer Architecture course at **UFS (Universidade Federal de Sergipe)**, 2017.
The encoding, register file, and 42 mnemonics are Poxim's; the reference programs under
`apps/golem/src/golem/__fixtures__/` are the course's example project, kept verbatim as test
oracles. Credit to the course and its instructor —
[ADR 0019](./docs/adr/0019-golem-isa-inherited-from-poxim.md) explains why the ISA was inherited
rather than designed.

## License

[MIT](./LICENSE)
