# CLAUDE.md — CYBERDECK (the hub)

Guidance for Claude Code (claude.ai/code) when working in `apps/deck`.

This workspace is on the CYBERDECK deck but is **not a program** — see the root `CLAUDE.md` for the
monorepo layout, the deck-wide comment convention, and the release ritual. Paths below are relative
to `apps/deck`. Read `CONTEXT.md` before adding anything: what belongs here is decided by ADR 0025's
three clauses, not by taste.

## Status

**v1 complete** (#323). The door lists the four programs — ASCII//Convert, GLITCH//Studio,
GOLEM//Console, SPRAWL//Atlas — each with its category, a description and a link into its live
deploy. It carries the Theme picker and the pre-paint script like the three tools.

## The one rule that decides every future change

Before adding anything, answer three flat questions (ADR 0025): **does it take user material, does
it hand back an artifact, and is it about anything other than this deck?** Any one *yes* and this
stops being chrome and becomes a fifth program — at which point ADR 0021 applies at full strength
and the default answer is no.

So: no upload, no drop zone, no webcam, no search field whose contents become content; no export,
no download, no link encoding something assembled here; no pure pipeline or `RenderInstruction[]`
currency (a domain is a subject); no iframe or embedded demo; no favourites, history or accounts.
`src/app.test.tsx` has a test that fails on the first `<input>`, `<textarea>` or `<canvas>` — it is
there so a "quick" breach has to argue with something.

## Commands

Run from this directory (or `--workspace @cyberdeck/deck` from the root; `npm run dev:deck` from the
root boots the dev server).

```bash
npm run dev        # start Vite dev server
npm run build      # tsc -b && vite build
npm run test:run   # vitest run
npx vitest run src/roster.test.ts  # a single test file
```

Lint and format are repo-wide from the root: `npm run check`.

## Architecture

A single-page React/TS/Vite app, and about as thin as one gets.

- `src/roster.ts` — the four programs as content: id, name, `kind` (`tool` | `piece`, ADR 0021's
  vocabulary), tagline, description, live URL. **Not a core.** If it ever grows a function that
  transforms something, that is the third clause about to break.
- `src/app.tsx` — the page: header with the wordmark and `ThemeControl`, the statement, the grid,
  the footer.
- `src/components/program-card.tsx` — one entry. The whole card is the `<a>`, and it navigates in
  this tab: sending you into a program is what the door is *for*.

Everything visual comes from `@cyberdeck/deck-kit` — tokens, preset, `ThemeControl`. The kit is the
hub's only dependency of substance, and the hub is the kit's first caller with no domain at all: if
something here needs the kit and cannot get it, that is a signal about the kit (ADR 0014, ADR 0025).

## Tailwind

`tailwind.config.js` must keep `../../packages/deck-kit/src/**/*.{ts,tsx}` in `content`, or every
class the kit's primitives use — `ThemeControl`'s whole popover — is purged and the page renders
half-styled. The E2E harness exists partly to catch that.

## The social card is the door at preview size

`public/og-card.png` prints the same four names, categories and taglines the page does. The drawing
lives in `scripts/social/cards.mjs` at the repo root (`deckCard`, `DECK_ROSTER`) because that is
where every card lives, and a root `.mjs` cannot import this app's TypeScript — so the roster is
copied across that seam. `scripts/social-card.test.mjs` holds the copy to `src/roster.ts`, which is
this deck's answer to accepted duplication: a guard, not a comment.

Regenerate with `npm run social:assets -- deck` from the root. Every PNG is committed.

The `og:url` and `og:image` in `index.html` are absolute and assume the Vercel project is
`cyberdeck-hub`. If it is created under a different name, those two are what has to follow it — a
card served from the wrong origin does not render at all.

## Adding a program to the door

Edit `src/roster.ts`. `roster.test.ts` pins the ids, that every URL is absolute `https`, that no
description is a placeholder, and that the deck still has exactly **one** piece — that last one is
ADR 0021's fence, so a failure there is a decision to make, not a test to update. `DECK_ROSTER` in
`scripts/social/cards.mjs` follows, or the card guard fails; then `npm run social:assets -- deck`.

Then: `README.md`, `CONTEXT-MAP.md`, and a changeset for `@cyberdeck/deck`.
