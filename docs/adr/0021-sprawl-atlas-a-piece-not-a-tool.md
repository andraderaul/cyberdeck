# SPRAWL//Atlas — the deck admits a piece, not a tool

Every program on the deck so far is a **tool**: ASCII//Convert converts *your* image, GLITCH//Studio
glitches *your* webcam, GOLEM//Console runs *your* assembly. Each consumes user material and its worth
is `f(your_input)` — you return because you have another input. CLAUDE.md says it plainly: the deck is a
monorepo of *creative tools*.

SPRAWL//Atlas breaks that. It takes **no user material**. It ships with a dataset and shows you the
world's data-exchange capacity as light — Ashburn, Frankfurt, São Paulo incandescent against the dark —
and lets you slide a logarithmic scale until structure emerges from the saturation. You do not create
anything; you *look*. It is the deck's first **piece, not tool**, and this ADR records that the deck
admits one — and draws the fence so it stays one.

The seed is a passage from Gibson's *Neuromancer*: a map of data traffic where each gigabyte is a pixel,
the map whites out into a supernova under its own load, and the operator rewrites it at a coarser scale
until he "begins to distinguish certain blocks." The drama there is not the image — it is **scale
vertigo**: the simulation nearly dies because the real is too large, and the fix is to rewrite coarser.
That vertigo only lands on *real* data (an invented map fakes the overload), which is why SPRAWL//Atlas
is built on a real dataset — see ADR 0022 for how that data reaches a client-side deck without a backend.

## Why a piece is allowed here

- **The passage endorses authorship without input.** Case is the author — *"Program a map… Rewrite the
  map. Increase the scale."* He loads nothing; he **declares** a mapping and looks. The user's material
  in SPRAWL//Atlas is the *mapping function* (where the log window sits, the viewport), not a file. That
  is a real creative act, just not the tool kind.
- **It obeys the deck's core pattern.** The pure core is `project(dataset, scale, viewport) →
  RenderInstruction[]` — the same imperative-shell / functional-core split as ADR 0005, the same
  "render instructions" currency as ASCII//Convert. It is *stateless in time* (same dataset + same scale
  ⇒ same image), which puts it in the ASCII/GLITCH family, not the stateful-machine family of GOLEM.
- **It fits the deck's fiction.** A dark world where Western Europe flares into a single incandescent
  smear and you *recognise it without a legend* is pure Sprawl — the trilogy that named this program.
  The aesthetic is the point; retention is not.

## The ruler is the first screen, not retention

Every other program is judged by whether you come **back** — a tool's ruler. A piece is judged by its
**first screen**. SPRAWL//Atlas opens *white*: at `1 px = 1 GB` the map is honestly blown out, the
scale reader saying `OVERFLOW`, and the only control at hand is the one Case reached for. You learn the
program by *repairing* it. If that first screen — the white, the overflow, Europe emerging as you slide
coarser — is not breathtaking, no amount of replay saves it. That is the correct ruler for this program
and the wrong ruler for the other three; do not measure it by return visits.

This does not mean it has no replay — scale is replay (you re-walk the same axis to watch structure
emerge), and a re-vendored dataset moves the world under you. But that replay is *shallower* than a
tool's infinite `f(input)`, and that is fine: the ruler is still the first screen.

## The fence

**SPRAWL//Atlas is the last program on the deck for a good while, and the only piece.** One piece among
three tools is the exception that illuminates the rule; a *second* piece is the deck losing its
identity. Like ADR 0014 fencing extraction against "empty diff + two callers," this ADR fences the deck
against drift:

- **A future proposal for a second non-tool program must clear a higher bar than "it would look cool."**
  The default answer is no. The deck is tools; this is the one deliberate exception, recorded so nobody
  treats it as a precedent.
- **A future review must not "fix" SPRAWL//Atlas into a tool.** Its having no user upload, no dataset
  import, no traceroute input is the decision, not an oversight. The material is the mapping function.

## Considered options

- **Force it to be a tool** (upload your own dataset, run a live traceroute) — rejected: it turns a piece
  with a single sharp idea into a generic viewer and dissolves its one sharp idea. It is the same trap ADR 0011
  warns of — forcing distinct intents through one abstraction — dressed as a feature.
- **Build it outside the deck / not at all** — rejected: it obeys the deck's core pattern (ADR 0005) and
  visual language, and the honest question was never "will people return" but "do you accept a program
  judged by its first screen." We do, for exactly one.
- **A live real-time map** — rejected upstream in the design: the passage's variable is *scale*, not
  *time*. Real-time buys nothing the first screen needs and costs a backend (ADR 0022).

## Consequences

- A fourth `apps/sprawl` workspace joins the deck, versioned independently (ADR 0012). It adds the
  `packages/deck-kit/src/**` Tailwind `content` glob (ADR 0014) like every program.
- **A time axis** (successive dated snapshots — the internet growing, 2019 → 2026) is deliberately *out
  of v1*: scale is the passage's only axis, and a second axis dilutes the first session. The dated
  snapshot format (ADR 0022) keeps that door open for free.
- CONTEXT-MAP gains a fourth program and its first tool/piece distinction; the "creative tools" framing
  in CLAUDE.md now carries this one recorded exception.
