# CONTEXT — CYBERDECK (the hub)

The deck's **front door**, and the deck's fifth workspace — but deliberately *not* its fifth
program. It is **chrome, not a program** (ADR 0025): a third category beside ADR 0021's tool and
piece, sitting outside that fence rather than being carried through it.

## The three clauses

A hub is constituted by all three, and any one of them failing makes it a program:

1. **It consumes no user material.** No upload, no drop zone, no webcam, no text field whose
   contents become content.
2. **It produces no artifact.** No export, no download, no share link encoding something you
   configured here. A link *to a program* is navigation and is the point.
3. **It is about the deck itself.** Its whole content is the deck naming what it runs, describing
   it, and sending you into it. Delete the deck and there is nothing left to render.

The first two alone would not do the job — a **piece** needs neither an input nor an artifact, and
SPRAWL//Atlas as ADR 0021 admitted it cleared both absences. The third clause is what separates
them: **a piece is about its subject; chrome has no subject but the deck.**

## What this may never become

Listed in ADR 0025 and repeated here because this is the file someone reads before adding to it:
no input taking user material, no output you keep, **no domain core** (a domain is a subject), no
program running inside it (no iframe, no "mini mode"), no retention machinery (favourites, history,
accounts, a backend). A **gallery of user output** is the form the proposal will actually take, and
it fails all three clauses at once.

That is also why there is no `src/<domain>/` here. `src/roster.ts` is *content* — the copy on the
door, written down once — not a pure core, and it should stay that shape.

## Domain language

| Term | Meaning | Avoid |
|------|---------|-------|
| **hub** | This workspace, the deck's front door | landing page, home app |
| **chrome** | The category (ADR 0025) — *casca* in CONTEXT-MAP, sense 3 | shell, Console |
| **Program** | One roster entry: name, kind, tagline, description, live URL | app, card, tile |
| **kind** | `tool` or `piece` — ADR 0021's vocabulary, not a label invented here | type, category |

`shell` still means the impure half of the imperative-shell / functional-core split everywhere on
the deck, and `Console` is GOLEM//Console's command line. Neither is this.

## Theme

It **sets the theme attribute** and carries the hand-inlined pre-paint script, like the three tools
(ADR 0024, ADR 0025). This is the easiest call on ADR 0024's boundary rather than the hardest: the
boundary is "the deck may recolour what it drew, not what you brought", and the hub is *entirely*
what the deck drew. There is no user work underneath to recolour. SPRAWL//Atlas is excluded for the
opposite reason — its pixels are the piece.

The picker is not user material sneaking past clause 1: choosing how the deck's own chrome is
painted is the deck describing itself.

**A recorded consequence, not a bug:** Theme selection is per origin, and the hub is the first
surface that links to another one. Pick `chiba` at the door and ASCII//Convert opens in `ice`. The
fixes — a shared parent domain, or a handoff in the URL — are both larger than a front door
(ADR 0025).

## The links are unproven

The roster's URLs are the live deploys and nothing in CI checks that they resolve. A renamed Vercel
project breaks the door silently (ADR 0025). `roster.test.ts` pins what it can — every program
listed, an absolute `https` target, exactly one piece — which is shape, not liveness.
