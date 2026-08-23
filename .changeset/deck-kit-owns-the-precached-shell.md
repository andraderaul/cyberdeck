---
'@cyberdeck/deck-kit': minor
---

The precached shell crosses into the kit. `useAppUpdate` and `UpdateBanner` are now
`@cyberdeck/deck-kit/pwa`, and the service worker and its fetch policy live beside them. It arrived
in ASCII//Convert (ADR 0027) and moved here when the other three programs asked for the same thing —
an empty diff apart from the cache prefix, which is the bar ADR 0014 sets.

The Vite plugin that compiles a program's worker moved too, to `scripts/precache-shell.ts`, but it
is deliberately **not** a subpath export: a `vite.config.ts` must reach it by relative path. Vite
bundles a relative config import, but leaves a bare specifier for Node to `import` at runtime, and
Node cannot load the `.ts` source this package ships. The package name would work only on a Node new
enough to strip types and fail on the rest, so the export is left off on purpose. See the kit's
README.

`HeaderButton` rises into `@cyberdeck/deck-kit/ui` on the same move. The offer bar's one control is
that shape, which makes the bar its second caller — the trigger ADR 0014 wrote for it.

A program now becomes installable with a hand-written `manifest.webmanifest`, one line of Vite
config naming its cache prefix, and the two lines that render the offer bar. The worker brings a
third TypeScript project with it (`tsconfig.worker.json`), because `WebWorker` and `DOM` cannot share
one — that is one such file for the deck instead of one per program.
