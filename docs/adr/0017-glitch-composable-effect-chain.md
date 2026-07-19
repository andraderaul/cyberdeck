---
status: proposed
---

# GLITCH — the composable Effect Chain (a list of Links, not a flat settings object)

GLITCH//Studio v1 ships a **fixed Pipeline**: a canonical order of Effects
(`Block Displacement → Pixel Sort → Channel Shift → Chromatic Aberration → Scanlines → Noise`)
driven by `GlitchSettings`, a flat object holding one params block per Effect. The glossary
reserved the words **stack** and **chain** for a future composable model, and the `Pipeline` entry
calls the fixed order "um caso particular da futura pilha componível." This ADR records the decision
for that model, worked out in a grilling session. It is **proposed, not built** — the shipped code
remains the flat Pipeline; this exists so the model is settled before implementation starts and so
the reserved-term burn is deliberate.

The decision: replace the flat `GlitchSettings` with a **Chain** — an *ordered list of Effect
instances*, each one a **Link** of shape `{ type, params }`, **repeats allowed**. The whole "look"
is now the Chain. The canonical order stops being a law and becomes merely how the default Chains
are built; a user can reorder, add, remove, and duplicate Links in the advanced surface. The casual
front door (Presets + Randomize) is unchanged — a Preset is now simply a curated Chain, and the
Chain editor lives behind the existing advanced disclosure.

## Considered options

- **Flat params + an `order: EffectId[]` array (reorder only, no repeats).** Rejected: the single
  capability that makes a "stack" meaningful — the *same* Effect appearing more than once
  (a double melt, a channel-split before *and* after a sort) — is impossible in a flat "one block
  per Effect" object. Without repeats this is just a reorderable Pipeline, and we'd have
  over-reserved two glossary terms for it.
- **Term "stack" for the ordered list.** Rejected in favor of **"chain."** The model is sequential
  signal flow — a `PixelBuffer` flows through each Effect, each feeding the next — which is a signal
  *chain*, not a *stack*. "Stack" connotes parallel composited **layers**, and "layer" is already an
  `avoid` term; "chain" also yields a clean element name, **Link**. `stack` stays an `avoid` term.
- **A running RNG stream threaded through the Chain** (each Link draws in sequence). Rejected: it
  makes randomness depend on *how many draws ran before a Link* — the exact order-dependence Noise's
  positional-hash design deliberately avoids ("a function of where a pixel sits rather than of how
  many draws ran before it"). Reordering or inserting an upstream Link would scramble everything
  downstream.
- **Randomize composes the Chain structure** (random Links / order / repeats). Rejected: random
  *structure* is the "deal out a combination nobody vouched for" trap at the level where it hurts
  most — bad structure sinks a look faster than a bad number. Structural variety is curated as more
  Presets, not assembled at random.
- **A per-Link `mute` toggle in v1 of the Chain.** Deferred: presence in the Chain is the on/off, so
  the first cut ships add/remove only. Mute (keep a Link but skip it, preserving its params) is a
  fast-follow if power users reach for it.

## Consequences

- **`GlitchSettings` retires as a term.** The look is now the Chain; two words for one concept is
  what the glossary forbids. The `ConversionSettings` parallel with ASCII//Convert breaks here — an
  accepted per-app divergence (ADR 0011).
- **New vocabulary:** **Chain** (the ordered list — the look), **Link** (one Effect instance,
  `{ type, params }`), **Effect** (the kind of transform — unchanged). `CONTEXT.md`'s reserved-term
  note resolves to "chain."
- **`applyPipeline` → `applyChain(pixels, chain, seed)`**, a pure fold over the Links. This requires
  an **Effect registry** (type → pure fn + `DEFAULT_*` params + param-UI) that the hardcoded
  `applyPipeline` calls do not have today.
- **Determinism via global Seed + per-Link occurrence sub-seed.** One Seed still sits *beside* the
  Chain. Each Link derives its randomness from **its type and which occurrence of that type it is** —
  the *first* Block Displacement in a Chain draws on the global Seed untouched, the second on
  `hash(Seed, 1)`, and so on. Repeats therefore get distinct draws, and Re-roll still re-rolls the
  whole arrangement. Noise stays positional *within* a Link.

  **Amended during Slice 1 (#125)** — this originally read `hash(Seed, linkIndex)`, keyed on the
  Link's absolute position. That was found to be unimplementable alongside two acceptance criteria
  the slices also carry: a position-keyed sub-seed changes what the seeded Effects draw the moment
  any Link is added, removed, or moved, so neither "pixel-identical to the fixed Pipeline" (#125) nor
  the migration golden tests (#126) can pass. Keying on occurrence satisfies all of them — verified
  empirically across all six Presets — because a one-of-each Chain leaves every Link at occurrence 0
  and so reproduces the old Pipeline byte for byte.

  It also **removes** the cost the index scheme accepted: reordering a Link no longer reshuffles its
  arrangement, because position is no longer an input. The "stable per-Link salt" this ADR considered
  and deferred was rejected for costing *hidden per-Link state and salt-minting on Preset apply* —
  that objection does not reach this scheme, whose stability is **derived** from the Chain rather than
  stored beside it. The residual cost is narrower: two Links of the same type swap arrangements when
  reordered past each other, since it is their relative order that names them.
- **A repeat has to differ to be worth anything.** Pixel Sort is idempotent — a sorted run is a
  fixed point — so two adjacent Pixel Sorts with *identical* params render exactly as one. The
  "double melt" above is still reachable, but it takes two sorts tuned differently (a horizontal
  pass crossed with a vertical one), not a straight copy. Discovered while building the editor
  (#128): the registry carries an `idempotent` flag, and the editor withholds *duplicate* for the
  Effects it marks while still offering them from the add palette. The refusal is a UI judgement
  and lives there — the Chain itself accepts the copy, because two identical sorts are pointless
  rather than invalid, and the same state is reachable by adding a Link and tuning it to match.

- **On/off collapses into presence.** The `enabled` booleans (Pixel Sort, Scanlines) and the
  encode-zero idiom (Channel Shift, Noise, CA) are *deleted* — an Effect is on because its Link is in
  the Chain. A genuine simplification the restructure earns.
- **`glitchSettingsMatch` → `chainMatch`**, an **order-sensitive, total** list comparison (same
  length, same type + params at each position). It ignores each Link's ephemeral UI id — plumbing
  *outside the look*, the same discipline that keeps the Seed outside look-equality. `activePresetId`
  tracking stays; reorder / add / remove / param-edit all mark `(modified)`.
- **Presets become Chains**, migrated to preserve today's looks exactly: one-of-each in the canonical
  order, **dropping the Links that were off** (VHS loses Pixel Sort; CORRUPTED / NEON RAIN lose
  Scanlines). Golden tests pin each migrated Chain against the old flat output.
- **A hard cap on Chain length** guards performance (Pixel Sort is heaviest; the 800×800 sampling cap
  bounds one Link, but N heavy Links compound) and the UI. Value tuned in implementation (~8–12).
- **`CONTEXT.md` is not rewritten to the Chain vocabulary yet** — it is loaded as ground truth each
  session and must keep describing the shipped flat Pipeline. Only the reserved-term note is updated.
  The implementing work rewrites the glossary when the code lands.
- A future reader should read this ADR before "tidying" any of the load-bearing quirks — the
  order-sensitive `chainMatch`, the occurrence sub-seed, or Randomize's structure-rides-through rule.
