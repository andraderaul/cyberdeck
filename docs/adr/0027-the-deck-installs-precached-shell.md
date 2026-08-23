# ADR 0027 — The deck installs: a precached shell, promoted between sessions

## Status

Accepted

**Date:** 2026-08-23

## Context

Every program on this deck is fully client-side. There is no backend, no runtime fetch, and even
SPRAWL//Atlas's dataset is a snapshot committed into the repository and compiled into the bundle.
The one network call anywhere on the deck is ASCII//Convert's optional AI Analysis, which goes from
the user's browser straight to the provider with the user's own key and never touches a server of
ours.

Which means the thing a progressive web app is normally sold for — working when the network is
gone — is not a feature to be built here. It is a property the deck already has and does not
advertise. A program that only ever loads its own bundle and then computes is offline the moment
its bytes are on the machine; all that is missing is a browser being told to keep them.

Installing is also the product's own fiction rather than a bolt-on. A "deck" of "programs" that
lives only behind a URL is a metaphor stopping halfway. One that shows up on a home screen with its
own mark and opens without browser chrome has finished the sentence.

Two things make the *how* non-obvious, and both are about not breaking a running session:

- **The programs hold live, unsaved state.** A Recording is mid-take. A Live Source is streaming. A
  GOLEM Machine is halfway through a program. None of it is persisted anywhere. A service worker
  that swaps the shell out from under a running tab — the default that `skipWaiting` buys — can
  destroy work the user cannot get back.
- **A precache is a trap with no exit.** A cached shell that is broken, or merely old, is served
  forever by a worker that is doing exactly what it was told. "Clear site data" is not a way out
  that can be asked of anyone.

## Decision

A program on the deck **precaches its whole shell at install and serves only from that cache**.
There are no runtime caching strategies, no network-first or stale-while-revalidate routes, and no
runtime cache at all. The shell is every file the build emitted; anything else the worker declines
to answer, which leaves the browser doing exactly what it would with no worker installed.

A **new build never activates mid-session**. The worker does not call `skipWaiting` on install. It
parks behind the running one and takes over when the last tab controlled by the old one closes — the
next session, not this one.

The user's way out of a stale version is **a visible offer, taken by hand**: while a build is parked,
the program says so in a bar under its header, with one control that promotes it and reloads. That
bar is the exit; nothing else in the design requires anyone to clear site data.

The **AI Provider is out of scope by origin, not by exception.** The worker's fetch rule answers
only same-origin requests for files this build emitted. Every provider endpoint fails that test on
the origin alone, before the method is considered — so no rule needs to name Anthropic, OpenAI or
Google, and none can be forgotten when a fourth provider is added.

ASCII//Convert is where this lands first. It is the most-visited program and the only one with a
network call to keep out of the cache, so it is the case that proves the rule rather than the case
the rule is easiest on. The remaining three follow.

**Every program on the deck now carries this, and it is one implementation rather than four**
(#325). The policy, the worker, the build plugin and the offer bar live in `deck-kit`; a program
supplies a `manifest.webmanifest`, one line of Vite config naming its cache prefix, and the two
lines that render the bar. Nothing else about a program's offline story is the program's. The hub
is deliberately outside this: it is the deck's chrome rather than a program (ADR 0025), and a page
whose whole job is to send you somewhere else has nothing to run when the network is gone.

The **AI Provider exclusion stays in the shared rule even though only one program has a provider**.
It is not a branch anyone pays for — it is the first line of `planShellFetch`, the same comparison
that answers "is this file mine?", and deleting it would not remove code so much as replace one
question with two. A program that grows its first network call inherits the exclusion instead of
having to remember it.

## Considered Alternatives

- **`vite-plugin-pwa` / Workbox.**
  - *Pros:* the standard tool; precache revisioning, the manifest, the registration and the update
    prompt all come for free and are far better tested than a hand-rolled equivalent.
  - *Cons:* ~550 packages in the app's tree for a directory walk and a `define`. Its value is
    runtime caching strategies and route composition, and this decision uses neither.
  - *Rejected because:* the deck has a standing habit of not buying a tool it can spell itself —
    `scripts/social-assets.mjs` renders its cards in the Chromium that `test:e2e` already installs
    rather than adding a rasteriser. The whole build side here is one directory walk and one nested
    Vite build, and the worker is sixty lines whose fetch rule is the load-bearing part and wants to
    be read.

- **Network-first, falling back to the cache.**
  - *Pros:* a deploy is picked up as soon as it exists; no staleness to escape.
  - *Cons:* every asset waits on a network round trip before painting, and offline every one of them
    waits for a timeout first. Machinery for a case that cannot arise.
  - *Rejected because:* there is no origin to be first to. The programs fetch nothing at runtime,
    so "the network" here is only the deploy that is already in the cache.

- **`skipWaiting` on install — the new build takes over immediately.**
  - *Pros:* nobody ever runs a stale version; no update UI at all.
  - *Cons:* the activating worker evicts the previous build's cache, so a tab that has been open
    since before the deploy loses the chunks it has not loaded yet. The lazily-imported AI adapters
    are exactly that. A Recording in flight dies with it.
  - *Rejected because:* the programs hold unsaved state and no deploy is worth it.

- **A "clear cache" control in the About modal.**
  - *Pros:* an explicit escape hatch, always available rather than only while an update is parked.
  - *Cons:* it asks the user to understand that a cache exists and that theirs might be bad. The
    honest version of that control is a bug report.
  - *Rejected because:* the parked-build bar covers the case that actually happens, and it says what
    it does in the user's terms rather than the browser's.

## Consequences

**Positive:**

- Offline is not a mode. A second visit with the network gone is the program, Exports and all.
- Installed, a program opens standalone on the same near-black the page paints, because the manifest
  and the pre-paint script are pinned to the same token.
- The provider exclusion is structural. It is one comparison in one pure function, tested against
  all three endpoints, and no future provider can slip past it.
- No new tooling at the root. The whole build side is one app-local Vite plugin, which keeps
  ADR 0011's line: repo-wide tooling at the root, per-app build dependencies in the app.

**Negative:**

- A deploy reaches an open tab one session late, by construction. A user who never closes the tab
  runs the old build until they take the offer in the bar — so the program has to go and *find* the
  new build for them, because the browser's own update check runs on navigation, which is the one
  thing that session never does. It checks hourly and whenever the tab returns to the front. The
  price is a conditional `GET` of a ~2 kB file per hour per open tab, answering `304` every time but
  the one that matters; the price of not paying it is an escape hatch nobody is ever shown.
- The escape hatch is inside the app, so a shell broken badly enough not to render is beyond it. The
  precache is all-or-nothing at install, which makes that unlikely rather than impossible.
- Every program now has a fifth hand-written copy of the default Theme's background — the
  manifest's `theme_color` — with the same silent-drift failure the `theme-color` meta has. The
  kit's roster guard pins it, the same way it pins the meta.
- The kit now owns a service worker, which is a *third* compilation target inside it: `WebWorker`
  and `DOM` cannot share a TypeScript project, so `deck-kit` carries a `tsconfig.worker.json` beside
  its app and node projects. That is one such file for the deck rather than one per program, which
  is the trade this extraction bought.
- The lazily-split AI adapters are precached along with everything else, so a user who has no key
  still downloads them on install. The alternative is a runtime strategy, which this ADR declines.

  This is not a quiet reversal of the bundle budget's two-ceiling design (#318), and the two are
  worth reading together rather than as a contradiction. That budget keeps `entry` and `lazy`
  separate so that **first paint** is never charged for the three AI SDK chunks — a summed ceiling
  would have read as pressure to undo a deliberate code split. The split still holds and still does
  its job: those chunks are not in the entry graph, nothing about first paint changed, and the
  budget check still reports them apart. What an install adds is a *different* cost at a *different*
  moment — one deliberate, one-off download of the whole shell, which is the price of the program
  working with the network gone. Install is not first paint. The number to watch is therefore the
  budget's, not the precache's, and the day it says otherwise the answer is a named exclusion in the
  plugin, not a runtime strategy.

## Related ADRs

- ADR 0011 — the monorepo: no backend, repo-wide tooling at the root and per-app build dependencies
  in the app.
- ADR 0003 — the AI Analysis call carries the user's own key and goes straight to the provider.
- ADR 0024 — the Themes, and the pre-paint script whose colour the manifest has to match.
- ADR 0022 — SPRAWL//Atlas's vendored snapshot, the largest thing a precache on this deck will hold.

## Implementation Notes

Everything below is in `deck-kit`. It landed in `apps/ascii` first (#324) and crossed the seam whole
when the second, third and fourth callers arrived (#325) — an empty diff apart from the cache
prefix, which is the bar ADR 0014 sets.

- `packages/deck-kit/src/pwa/policy.ts` — pure. `planShellFetch()` is the whole fetch rule;
  `shellCacheName()` names a build's cache after its own contents *and* the calling program's
  prefix, which is what makes "delete every other cache of mine" safe to write in `activate`.
- `packages/deck-kit/src/pwa/service-worker.ts` — the worker, one for the deck. Compiled on its own
  into each program's `dist/sw.js`, not part of any app's module graph.
- `packages/deck-kit/scripts/precache-shell.ts` — the Vite plugin: walk `dist` after it is written
  (in `closeBundle`, because `public/` is copied late), hash each file, and run a nested Vite build
  of the worker with that manifest and the program's cache prefix defined in. `og-card.png` and
  `sw.js` are excluded — the first is for a link-preview crawler, the second must never be answered
  from a cache it controls. Every emitted file must be *classified*, precached or excluded by name,
  and an unrecognised one fails the build: dropping it silently would leave `addAll` succeeding, the
  build green, and the file missing only for a user who is already offline. A build with no
  `manifest.webmanifest` fails the same way — a worker without one installs a program no browser
  ever offers to install. `precacheShell({ exclude })` is this ADR's reserved escape hatch, kept as
  a per-program option so that a shell grown too large is answered where the problem is rather than
  by widening the deck-wide set. Empty in all four today.
- `packages/deck-kit/src/pwa/cache-prefixes.test.ts` — the one property no single program's build can
  check: `activate` evicts by `startsWith`, so a prefix that is a prefix of a neighbour's would
  delete that neighbour's shell on an origin the two shared. The plugin refuses a malformed prefix at
  build time; this guard reads all four Vite configs and holds them apart.
- `packages/deck-kit/src/pwa/use-app-update.ts` — registration, the hourly and on-visible update
  checks, and the one branch worth its test: an `installed` worker with no controller is a *first
  install*, not an update, and announcing it would offer to reload the page onto itself.
- `packages/deck-kit/src/pwa/update-banner.tsx` — the offer. Its control is a `HeaderButton`, and
  this bar being that primitive's second caller is what brought it into the kit on ADR 0014's terms.
  Transcribing its classes here instead would have put a seam in the worst possible place: a copy
  that a later edit to the original silently stops reaching.
- `apps/<program>/public/manifest.webmanifest` — hand-written beside the hand-drawn `favicon.svg`,
  for the same reason. The kit's roster guard pins the themed programs' `theme_color` to the default
  Theme's `--bg` and checks every icon each manifest names exists; SPRAWL//Atlas's is pinned to
  `paint.ts`'s `FIELD` in `apps/sprawl/scripts/social-card.test.mjs` instead, because it takes no
  Theme (ADR 0021, ADR 0024).
- `e2e/ascii/offline.spec.ts` — the claim, made where it can be made: install, go offline, reload,
  convert an image. The harness is wired to ASCII//Convert's built output alone; #327 rolls the rest
  in, and until then the other three are proved by driving a real browser by hand.

## Questions / Future Work

- **SPRAWL//Atlas's precache is 621 kB, and "the whole shell" is still the right unit.** It is the
  largest on the deck by roughly a factor of two — the vendored snapshot is compiled into the entry
  chunk (ADR 0022), so installing the piece downloads the dataset — and it made no observable
  difference: a first visit went from cold to a controlling worker in about a quarter of a second on
  a local server, the same as the programs half its size, because the shell is ten files and the
  install is one parallel batch. The named exclusion this ADR held in reserve is not needed. The
  number to watch is still the bundle budget's, and ADR 0021's deferred time axis is what would move
  it.
- **iOS remains untested.** The metas and the 180px `apple-touch-icon` are in place in all four
  programs, but no Apple device was available.
