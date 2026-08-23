# ADR 0025 — The hub is chrome, not a program

## Status

Accepted

**Date:** 2026-08-23 · **Deciders:** Raul Andrade · **Related:** issue #315

## Context

The deck ships four programs to four Vercel origins and has no front door. Nothing links them to
each other; the only artefact that knows CYBERDECK exists as one thing is this repository's
`README`, which you must already be in the repository to read. A hub — a page listing the programs
and sending you into them — fits the fiction exactly, because a deck *runs* programs.

It needs a decision before it needs code, and the reason is ADR 0021. That ADR drew a hard fence
around what the deck admits: the deck is **tools** — each consuming *your* material, worth
`f(your_input)`, judged by whether you come back — with exactly one **piece**, SPRAWL//Atlas,
admitted as a recorded exception and judged by its first screen instead. Then it fenced itself. A
future proposal for a second non-tool program "must clear a higher bar than 'it would look cool'.
The default answer is no." A *second* exception, it says plainly, is the deck losing its identity.

A fifth workspace read against that fence looks like exactly the drift the fence exists to prevent.
So the question was never whether a hub is worth building. It is what a hub **is**.

## Decision

**A hub is neither a tool nor a piece. It is the deck's chrome — its *casca* — and chrome is a third
category that sits outside ADR 0021's fence rather than being carried through it.**

The category is constituted by three clauses, all of them required:

- **It consumes no user material.** Nothing you bring enters it — no file, no frame, no line of
  assembly.
- **It produces no artifact.** Nothing leaves it that you could keep: no export, no PNG, no
  shareable link encoding something you made.
- **It is about the deck itself.** Its whole content is the deck naming what it runs, describing it,
  and sending you into it. Delete the deck and there is nothing left to render.

**The first two clauses alone would not do the job, and the deck's own history is the proof.** A
piece needs neither an input nor an artifact: ADR 0021's ruler for a piece is the *first screen*,
which is a property of what it draws, not of what it takes. SPRAWL//Atlas as ADR 0021 originally
admitted it cleared both absences — the share link and the PNG came later, in #230. So a definition
resting on absences alone would have called the piece chrome on the day it was admitted, and would
call the next no-input generative page chrome too. That is precisely the fence this ADR exists to
keep intact, so the definition cannot rest there.

The third clause separates them, and separates them cleanly. **A piece is about its subject; chrome
has no subject but the deck.** SPRAWL//Atlas is about the world's connected capacity — the subject
is out there in the data, which is why the mapping you choose is real material and why the first
screen is a real ruler. A generative page cannot satisfy the third clause without first becoming a
piece about something, which is exactly the move ADR 0021 tells us to refuse.

Meet all three and no program is left to judge: no input to be worth `f(your_input)`, no artifact to
keep, no subject whose first screen could be the ruler. That is not an exception to the tool/piece
rule, it is a surface the rule never had jurisdiction over — ADR 0021's exception budget is
untouched, and SPRAWL//Atlas remains the one and only piece.

So the test a future proposal answers is not the aesthetic one but three flat ones: **does it take
user material, does it hand back an artifact, and is it about anything other than this deck?** Any
one of them makes it a program, ADR 0021 applies at full strength, and the default answer is still
no. Chrome is not a lighter door into the deck; it is a category constituted by having nothing of
its own to show you.

**Chrome already means something here, and this is that meaning one scale up.** ADR 0024 calls a
program's chrome the part of it the deck drew, as against the user's pixels; the hub is chrome with
no user pixels behind it at all. In English the three terms stay clean: chrome does not collide with
**shell**, which keeps meaning the impure half of the imperative-shell / functional-core split
everywhere on the deck, nor with GOLEM//Console's **Console**. The Portuguese *casca* is the word
that needs care, because it already names the Deck Kit as well — CONTEXT-MAP carries the
disambiguation.

**The hub is a fifth workspace, `apps/deck`, and it consumes `@cyberdeck/deck-kit`.** That makes it
the kit's first non-program caller, which tests ADR 0014's scope rather than straining it: the kit
is deliberately *not* a domain core, so a caller with no domain at all should need nothing the kit
refuses to give. It does not lower the extraction bar — "empty diff plus two real callers" stands,
and the hub arrives as a consumer, not as a reason to move anything. It adds the
`../../packages/deck-kit/src/**/*.{ts,tsx}` Tailwind `content` glob like every other workspace, or
the primitives purge at build. It is **versioned by Changesets** like every other workspace
(ADR 0012): a copy change at the front door must never bump ASCII//Convert, nor a GOLEM//Console
bugfix the door.

**It sets the theme attribute.** ADR 0024's boundary — the deck may recolour what it drew and may
not recolour what you brought — makes this the easiest call on the deck rather than the hardest,
because the hub is *entirely* what the deck drew. SPRAWL//Atlas is excluded because its pixels are
the piece, and recolouring a work by setting is a different act; the hub has no work to recolour. It
carries the hand-inlined pre-paint script like the three tools, reads the same storage key, and
offers the same picker — and that picker is not user material sneaking in, because choosing how the
deck's own chrome is painted is the deck describing itself, which is the third clause rather than a
breach of the first.

**What the hub may never become.** ADR 0021 fenced itself and this one must too, or "it is just
chrome" is the crack the next program walks through. The hub may never gain:

- **Any input that takes user material** — an upload, a drop zone, a webcam, a file picker, a text
  field whose contents become content. The first byte you hand it makes it a program.
- **Any output you keep** — an export, a download, a generated image, a share link encoding
  something configured *on the hub*. A link *to a program* is navigation and is the point; a link
  that carries state you authored at the door is an artifact.
- **A domain core** — a pure pipeline, a `RenderInstruction[]` currency, a canvas of its own. A hub
  with a functional core has a domain, a domain is a subject, and a subject fails the third clause
  before the code is even written.
- **A program running inside it** — no iframe, no "mini mode", no embedded demo. Each program keeps
  its own origin, build and version (ADR 0011, ADR 0012); a hub that runs a program *is* one.
- **Retention machinery** — favourites, history, "recently used", accounts, a backend. These are a
  tool's ruler smuggled onto a surface that has no tool in it, and the deck has no server (ADR 0022
  exists because it does not).

*No gallery of user output, no feed, no blog* is deliberately not a sixth entry: it is the third
clause biting, and listing it as a rule would imply the definition permitted it. It still earns a
sentence, because the gallery is the form the proposal will actually take — it looks like chrome, it
is about the deck's programs the way a poster is about a film, and it fails all three clauses at
once: it consumes user material by proxy, makes that material the thing you came to see, and needs a
server to hold it.

## Considered Alternatives

- **A static page owned by the root — no workspace, no kit.**
  - *Pros:* zero tooling, no fifth workspace, no version, no changeset ritual.
  - *Cons:* it would hand-copy the visual language, which is the exact duplication ADR 0014 just
    retired; and the kit's guards walk `apps/*` and the kit itself, so a root page would be the one
    surface on the deck where naming a literal hue or an undefined scale step is unguarded — the two
    failures that produce no error from Tailwind, tsc or Biome.
  - *Rejected because:* the front door is the most-seen surface on the deck and would be the least
    defended one. Drift there is drift in the first thing anybody sees.

- **Treating the hub as a second explicit exception to ADR 0021.**
  - *Pros:* honest about the fifth workspace; needs no new vocabulary.
  - *Cons:* it spends the exception that ADR 0021 exists to protect, and two exceptions is a
    pattern, not an exception. Worse, it is wrong on the facts: an "exception to the tool/piece
    rule" says the hub was measured against that rule and let through, which hands the next proposer
    exactly the precedent ADR 0021 refused to create.
  - *Rejected because:* the fence has to stay at one, and it stays at one by being the right
    fence — not by being generously applied.

- **Folding the hub into an existing program** (ASCII//Convert as the front door).
  - *Pros:* no fifth workspace, no fifth deploy, no new origin.
  - *Cons:* couples the deck's index to one program's version and deploy, so a link change bumps a
    converter; and the host program stops being independent in exactly the way ADR 0012 was adopted
    to guarantee.
  - *Rejected because:* the door belongs to the deck, not to whichever program is asked to hold it.

## Consequences

**Positive:**
- The deck gets a front door, and the four programs stop being four unrelated URLs.
- The kit gains its first caller with no domain, which is a real check on ADR 0014's boundary:
  anything the hub needs and cannot get from the kit is a signal about the kit, not about the hub.
- The guards that *discover* cover the hub for free: the kit resolves programs by reading `apps/*`
  rather than from a list, so the vocabulary and scale guards read `apps/deck` the day it exists.
  (The contrast guard is not among them and need not be — it proves the Theme Contract from
  `tokens.css` and never reads a program.) The one guard that *asserts* a literal roster, the
  pre-paint list in `roster.test.ts`, needs an edit instead. That is the whole trade: discovery is
  free, assertion is a line of maintenance.

**Negative:**
- A fifth Vercel project and a fifth `ignoreCommand` to keep in step, and the pre-paint script is
  now hand-inlined in four HTML files rather than three — ADR 0024 already logged that duplication
  as a cost; this adds one to it.
- **The per-origin Theme split becomes visible.** ADR 0024 made Theme selection per origin and
  justified it with "no program links to another, so the split never surfaces in a session." The hub
  is precisely the thing that links to another: choose `chiba` at the door and ASCII//Convert opens
  in `ice`. Recorded, not solved — the fixes are a shared parent domain or a handoff in the URL, and
  both are larger than a front door.
- **`apps/*` stops meaning "programs".** The kit's helper is named `programs()` and the roster
  guard's wording assumes it; both now cover a surface that is deliberately not a program. The
  directory is the deck's *workspaces*, and the tests should say so or the vocabulary drifts back.
- The hub's links are live deploy URLs and nothing in CI proves them alive; a renamed Vercel project
  breaks the door silently.

## Related ADRs

- ADR 0011 — Monorepo under the CYBERDECK umbrella: light tooling, `apps/*`, independent apps.
- ADR 0012 — Changesets for per-app versioning: why the hub gets its own version and changelog.
- ADR 0014 — The Deck Kit: what the hub consumes, and the bar it does not lower.
- ADR 0021 — SPRAWL//Atlas is a piece, not a tool: the fence this ADR steps around rather than over.
- ADR 0024 — Themes: the chrome / user-pixels boundary that decides the hub's Theme answer.

## Implementation Notes

`apps/deck` is built by issue #323; this ADR is decision-only and adds no app code.

**Deploy.** Its own Vercel project, **Root Directory** `apps/deck`, driven by its own `vercel.json`
that `cd`s to the repo root so the `@cyberdeck/deck-kit` workspace dependency resolves — the shape
all four programs already use. Its `ignoreCommand` is theirs with `apps/deck` in the path list, and
is copied rather than reinvented: the README's Deploys section is the canonical explanation, and the
trailing `; [ $? -eq 0 ]` clamp is load-bearing, not clutter — it is what stops a force-push from
erroring every deployment on the branch (#342). It watches `packages/deck-kit` like everything else,
because the kit is consumed as source (ADR 0014), so the hub rebuilds on kit changes it may not
use — the same trade every program takes.

**Theme test consequence.** `packages/deck-kit/src/theme/roster.test.ts` asserts which programs carry
a hand-inlined pre-paint script, and it finds them by looking rather than from a list. When
`apps/deck` lands with its script, that assertion becomes `['ascii', 'deck', 'glitch', 'golem']`.
Its companion — that SPRAWL//Atlas carries none — does not move, and must not: it is the assertion
that keeps that exclusion a decision rather than an omission. The surrounding wording ("every
program that has a Theme control") is the `apps/*` vocabulary drift noted above and should be
reworded when the hub lands.

## Questions / Future Work

- The cross-origin Theme handoff, above. It only became a real question once a surface linked to
  another, and it is now one.
