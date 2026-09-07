# ADR 0029 — The deck makes sound: audible by default, muted by hand, one decision for the deck

## Status

Accepted

**Date:** 2026-09-07 · **Deciders:** andraderaul · **Related:** issue #394

## Context

Every control on this deck answers in one channel. A press changes a colour, moves a box, repaints a
canvas — and that is the whole of it. The deck is a fiction about a machine you operate, and a
machine you operate makes noise; a console whose keys are silent is a picture of a console.

The prior art is measured rather than imagined. asciinator.app ships the entire effect with **two
static files and one listener**: a `clickme.wav` at volume `0.40` and a `chime.mp3` at `0.55`, no
Web Audio, no synthesis. It was verified by instrumenting `HTMLMediaElement.prototype.play` — a
synthetic `pointerdown` on any `<button>` plays the sample, and a programmatic `.click()` plays
nothing, which is how we know the trigger is a single listener bubbling to the document rather than
a handler per button. The two volumes differ from each other and neither is normalised: they were
tuned by ear.

The `pointerdown` detail is the one that makes it feel like hardware. A sound on `click` arrives
after mouseup and, in a React program, usually after the re-render the press caused — so the
feedback lands *behind* its own consequence. On `pointerdown` it lands on the way down, before
either.

The question needs answering before code because almost every hard part is a decision rather than an
implementation. Sound is the first thing on this deck that a user might actively not want, and the
deck has no mechanism for that: `prefers-reduced-motion` has an audio analogue in no browser, so
nothing in the platform tells us. It is also the first behaviour that would be *identical* across
programs while those programs are versioned and deployed independently (ADR 0011, ADR 0012), and the
first that reaches for shared user state across origins the deck deliberately keeps apart. And the
deck's own test suites have to stay silent without a mock in every file that renders a button.

## Decision

**The deck makes sound, audibly, on first load. Mute is a decision the user makes once, by hand, and
the deck remembers it.**

Opt-out rather than opt-in, and the reason is that an opt-in sound layer does not exist. Nobody
enables a feedback they have never heard, so shipping it silent is shipping nothing while paying for
it — which would be the more expensive way of deciding not to do this at all. The cost is real and
named rather than argued away: a user who does not want sound hears exactly one before they can
decline. Two things pay for it — the gain is low (the prior art's `0.40`, and calibration is by ear,
not by a normaliser), and the mute is one press away on the first screen rather than inside a modal.

**The trigger is `pointerdown`, on one listener at the document, never a handler per control.** The
event is chosen for latency, as above: feedback before the consequence. Two properties come along
with it and are worth recording, because they read as gaps until you see them. `HTMLElement.click()`
— and Testing Library's `fireEvent.click`, which is that call by another name — dispatches no
`pointerdown`, so a script or a restored session cannot make the deck talk to itself by synthesising
a click; that is exactly how the prior art was measured. It is **not** a property the test suites
rest on, and #398 must not build on it: ten files on this deck drive the UI through
`@testing-library/user-event`, whose `click()` dispatches the full pointer sequence, `pointerdown`
included. Those specs stay silent for the reason recorded below — no unit environment here has an
audio device — not because of the trigger. And `pointerdown` never fires for keyboard activation —
Enter and Space on a focused control are silent — which, given the accessibility position below, is
not a hole to plug. **No `keydown` companion is added.**

The listener plays only for an **allowlist** of interactive elements matched by `closest()`, not for
anything the pointer lands on. Silence is the default for everything unnamed, so a canvas, a panel
or a scroll surface stays quiet without an exemption, and a control added tomorrow gets its sound
without wiring.

**The mute is one decision for the whole deck, and it is stored under one deck-wide key,
`cyberdeck:sound`, holding `'on'` or `'off'`.** No program name appears in the key. Nobody wants
GLITCH//Studio quiet and GOLEM//Console loud; a per-program mute would make that split a *design*
choice and multiply, by four, a control ADR 0015 says should be learnable once.

Absence of the key means the ADR's default, resolved in code — the same shape as `cyberdeck:theme`,
where `resolveTheme(null)` returns `ice` and nothing is written until somebody actually picks. The
value is the **explicit state** rather than a "muted" flag, for a reason that only shows up later:
storing the deviation from the default means that changing the default silently rewrites everyone's
choice, and storing `'on'` means a user who deliberately kept sound keeps it whatever this ADR is
amended to say.

**It is one decision in intent and one key in fact, and it is still per origin, because a browser
gives us nothing else.** Each program is its own deploy on its own origin (ADR 0011, ADR 0012) and
`localStorage` does not cross one. This is not a new leak: ADR 0025 already logged it for Themes —
choose `chiba` at the door and ASCII//Convert opens in `ice` — and listed the fixes as a shared
parent domain or a handoff in the URL, both larger than a front door and both larger than this. Sound
inherits that recorded gap rather than opening a second one, and the single unqualified key is
precisely what lets one future handoff carry both.

What is shared here is a key name and a default living in one module — a convention, not runtime
state. **No deployment is coupled and no version drags another.** That is the same footing ADR 0015
stood on when parity crossed the programs without coupling their releases.

**Every workspace is in, except SPRAWL//Atlas.**

The hub is **in**, and checking it against ADR 0025's fence is a short exercise. That fence forbids
the hub an input that takes user material, an artifact you keep, a domain core, an embedded program,
and retention machinery. A press sound is none of them: it consumes nothing you brought, hands back
nothing to keep, has no subject, and a mute is not retention machinery — retention machinery is
favourites and history, state about *your use* kept to bring you back. A mute is a preference about
how the deck presents itself, which is the same thing ADR 0025 already cleared when it admitted the
Theme picker under the third clause: choosing how the deck's own chrome is painted is the deck
describing itself. Sound is that chrome with a second channel.

**SPRAWL//Atlas is excluded, deliberately, and the exclusion is asserted by a test rather than left
as an omission.** ADR 0024 excluded it from Themes because its pixels are neither chrome nor the
user's — they are the piece, and recolouring a work by setting is a different act. The same argument
carries one channel over: a work's sound belongs to the work. Putting the deck's furniture noise
under a piece whose ruler is its first screen (ADR 0021) is the deck talking over it. If
SPRAWL//Atlas ever makes a sound it will be *composed for the piece*, not inherited from the deck.

**Two static files, no Web Audio, no synthesis.** The click is a **WAV**, and the format is not
incidental: MP3 encoders pad the head of the file with silence, which would put a delay in front of
the attack of the one sound chosen for arriving early. A compressed format is right for anything
longer; it is wrong for a click.

**Sound is never the only channel of a feedback.** Nothing that exists today may come to depend on
it, and nothing new may say something in audio alone. Every press that plays a sample already
changes something visible, and that visible change stays the feedback — the sample is a second
channel over it, which is why the layer can be muted at all without the deck losing information. The
happy consequence of `pointerdown` falls out here: a screen-reader user, operating by keyboard, never
triggers it and never has the deck clicking over their own audio channel.

**The test suites stay silent by construction, not by mock.** No unit environment on the deck has an
audio device — `happy-dom` gives `Audio` an element that decodes nothing — and production code has to
swallow a rejected `play()` anyway, because the browser's autoplay policy rejects it. So Vitest is
silent with no setup at all, not even a global stub in `test-setup.ts`, which would be the same
fragile mock one layer up and would hide a `play()` that threw for a real reason. Playwright is
silenced by **one line in the root config** — `--mute-audio` on the Chromium launch — which covers
all five projects at once and, importantly, mutes the *device* rather than the code: a spec can still
instrument `HTMLMediaElement.prototype.play` and assert the sound fired, which is exactly how the
prior art was measured.

**The autoplay policy is not an obstacle here, and that is what makes opt-out implementable at all.**
Audio before a user gesture is blocked; the first sound this deck makes *is* a gesture's response. A
`pointerdown` is the gesture. There is no unlock dance to write and no silent-first-click to explain.

**The layer covers the press and nothing else.** A second sample for a completed export or a finished
Chain is a different decision and this ADR does not admit it — it is not a gesture, so it meets the
autoplay policy differently, and it needs a call site per program, which is the first place app
vocabulary would cross the seam.

## Considered Alternatives

- **Opt-in — silent on first load, sound behind a control.**
  - *Pros:* nobody is ever surprised; no defence of a default needed.
  - *Cons:* a feedback nobody has heard is a feedback nobody enables. The layer would be built,
    shipped, precached and maintained for a fraction of a percent of sessions.
  - *Rejected because:* it is the expensive way of deciding not to do this. If the sound is not worth
    defaulting on, it is not worth writing.

- **Web Audio, synthesised — no asset files at all.**
  - *Pros:* zero bytes shipped, overlapping voices for free, pitch variation per press, and it fits
    the deck's habit of spelling a thing rather than buying it (ADR 0027).
  - *Cons:* an `AudioContext` has a lifecycle to own and a `resume()` on first gesture to get right,
    and a click worth hearing is a hand-tuned envelope — which is a small synth engine nobody asked
    for, written to replace a 3 kB file.
  - *Rejected because:* the sample is a *designed* artifact, tuned by ear, and a decision this ADR
    explicitly wants tunable by listening rather than by editing coefficients. The prior art
    delivers the whole effect with two files; matching it with a synthesiser is more code for a
    worse click.

- **A handler per control — `onPointerDown` on the kit's `Button`, `Chip`, `HeaderButton`.**
  - *Pros:* explicit at every callsite; no selector to maintain; a control that should be silent
    simply does not call it.
  - *Cons:* it is one edit per primitive, forever, and it misses every control that is not one — the
    canvas overlay's raw elements, GOLEM//Console's command line, anything a program builds itself.
    The rule "which controls make sound" would then live in a dozen files instead of one.
  - *Rejected because:* the measured prior art is one listener, and one listener is also the smaller
    thing to reason about, mute, and delete.

- **A per-program mute key (`cyberdeck:ascii:sound`).**
  - *Pros:* honest about the per-origin reality — nothing pretends to be shared that is not.
  - *Cons:* it makes the origin split a decision instead of a limitation, so the day a cross-origin
    handoff exists there is nothing to hand off; and it invites five different answers to a question
    that has one.
  - *Rejected because:* the split is a fact about browsers, not a preference about sound. Naming it
    in the key would freeze it.

- **Seeding `cyberdeck:sound=off` in every E2E spec instead of muting Chromium.**
  - *Pros:* no launch flag; the suite is silent for the same reason a muted user is.
  - *Cons:* every spec has to remember, and the suite would then only ever exercise the muted path —
    the default everybody gets is the one nothing tests.
  - *Rejected because:* it silences the code under test rather than the machine running it.

## Consequences

**Positive:**

- The deck gains a second feedback channel for the price of one listener and one file, and every
  control on every included workspace gets it without being touched.
- The mute is one control, one key and one default for the whole deck — nothing to relearn between
  programs (ADR 0015), and one thing to carry if the cross-origin handoff is ever built.
- Both test suites are silent for structural reasons. Nothing has to be remembered by the author of
  the next spec.
- The sound files are not chunks, so they land in the bundle budget's unbudgeted `other` and no
  ceiling moves — **provided they are imported through the bundler** and emitted into `dist/assets`.
  `scripts/bundle-budget.mjs` walks only that directory; a `public/` file lands in dist's root and is
  counted nowhere, so reaching for `public/` would not put the samples outside a ceiling, it would
  put them outside the accounting. Install grows either way — which is the right place for it, and
  ADR 0027 already drew that line: install is not first paint.

**Negative:**

- **A user who does not want sound hears one before they can say so.** That is opt-out, stated
  plainly. The gain is low and the control is one press away on the first screen; there is no version
  of this default that costs nothing.
- **The per-origin split is worse for sound than for Themes, and it is inherited rather than
  introduced.** A Theme you have to re-pick is a preference; a mute you have to re-pick is a sound
  you already heard. Mute at the hub, click into ASCII//Convert, hear it once more. The fix is the
  same cross-origin handoff ADR 0025 left open.
- **Keyboard activation is silent.** It follows from `pointerdown` and is accepted on the accessibility
  position above — the visual channel carries every feedback on its own — but it is a real asymmetry
  between two ways of pressing the same control.
- **On touch, the sound fires at the start of any gesture that lands on a control, press or not.**
  `pointerdown` is dispatched when the finger goes down, so a pan or a scroll that begins on a button
  and travels away plays a click for a press that never happens. The obvious fix — wait for
  `pointerup` and play only when the gesture resolved to a tap — is precisely the latency the trigger
  was chosen to avoid, so it would undo the argument that picked `pointerdown` in the first place.
  Accepted as the cost of that choice rather than overlooked; the gain is low enough that a stray
  click on a swipe is a texture, not an error.
- ADR 0027's precache classifier rejects any emitted file it does not recognise, so the new audio
  extension has to be added to `SHELL_EXTENSIONS` or the build fails. That failure is the guard
  working; it is listed here so it is not read as a bug when it happens.
- The samples are precached like the rest of the shell, so every install downloads them whether or
  not the user will keep sound on. The alternative is a runtime cache strategy, which ADR 0027
  declines.
- The deck now has a *second* preference remembered per origin. A third would be the point at which
  a preferences module is worth having rather than two keys read in two places.

## Related ADRs

- ADR 0011 — the monorepo: each program its own build and deploy, repo-wide tooling at the root.
- ADR 0012 — Changesets for per-app versioning: why sharing a key must not share a version.
- ADR 0014 — the Deck Kit, and the "empty diff plus two real callers" bar this decision is measured
  against below.
- ADR 0015 — cross-program parity of shell and pattern: why one mute control in one place.
- ADR 0021 — SPRAWL//Atlas is a piece, not a tool: why the piece is excluded.
- ADR 0024 — Themes: the precedent for an explicit exclusion, and the `cyberdeck:theme` key this one
  is shaped after.
- ADR 0025 — the hub is chrome: the fence a sound layer is checked against, and the per-origin split
  it already recorded.
- ADR 0027 — the precached shell: what a new shipped asset has to be classified into, and the
  app-first route `UpdateBanner` took into the kit, which this decision follows.

## Implementation Notes

This ADR is decision-only and adds no code. Issue #398 builds the mechanism in ASCII//Convert alone;
issue #400 brings the remaining included workspaces.

**The mechanism is born in `apps/ascii`, and crosses into `deck-kit` whole at #400.** At #398 it has
exactly one caller, and one caller is a hypothetical seam — ADR 0014 says so in as many words when it
leaves `badge`, `error-text` and, at the time, `tooltip`, `modal` and `header-button` in the app that
had them. So #398 writes it where the caller is: `apps/ascii/src/sound/`. When #400 brings the hub,
GLITCH//Studio and GOLEM//Console, the second, third and fourth callers arrive at once and the module
moves — one `git mv` into `packages/deck-kit/src/sound/` plus the import rewrites, and the diff of
that move is the evidence.

**That is the route `UpdateBanner` took, and it is worth being exact about, because the tempting
reading of ADR 0027 is the opposite one.** The banner did not start in the kit. It "landed in
`apps/ascii` first and crossed the seam whole when the second, third and fourth callers arrived — an
empty diff apart from the cache prefix, which is the bar ADR 0014 sets" (ADR 0027, Implementation
Notes). The bar was *measured* there, because somebody ran the diff. Building the sound module in
the kit at #398 would replace that measurement with an assertion: it would claim, before
GOLEM//Console has written a line of it, that what GOLEM//Console needs is byte-for-byte what
ASCII//Convert wrote.

The claim is probably true. A pointerdown, a sample and a gain carry no domain vocabulary at all, so
none of what ADR 0014 actually fears — *vocabulary dragged through one abstraction*, the reason
`use-webcam-state` and `outputFilename` stayed copied — is in play. But that is a reason to expect
the move at #400 to be trivial, not a reason to skip it. Loosening "empty diff plus two real callers"
into "empty by construction" buys one `git mv` and costs the bar its meaning, and the deck has no
need to buy it. The bar stays evidential, and this decision is measured against it like everything
else.

Expected shape, for the slice to fill in. Paths are as of #398; the sound module's own file is the
only one #400 relocates, from `apps/ascii/src/sound/` to `packages/deck-kit/src/sound/`, and the
build and config entries below are deck-wide already:

- `apps/ascii/src/sound/` — the key (`cyberdeck:sound`), the resolution of a stored value to
  `on | off` with the ADR's default for anything absent or unrecognised, the document listener, and
  the mute control. The key name is deck-wide from the first line, unqualified and unprefixed, even
  while only one program reads it — that is the decision above, and it is what makes the move at #400
  a move rather than a rename. The read and write wrap `localStorage` in `try/catch` exactly as
  `theme/use-theme.ts` does — Safari private mode and sandboxed iframes throw, and a preference that
  cannot be remembered is still worth having for the session.
- The sample is one `Audio` element created once with `preload="auto"`, its `volume` set in code
  rather than baked into the file, and `currentTime = 0` before each `play()` — a single element
  cannot overlap itself, and resetting is cheaper than cloning on every press. `play()` returns a
  promise that must be caught and dropped; an uncaught rejection under the autoplay policy is the
  console error #398 names.
- The mute control sits beside the Theme control, in the same slot in every included workspace
  (ADR 0015) — ASCII//Convert's slot at #398, the other three at #400. It is a labelled control, not
  a glyph with a tooltip — it is the escape hatch for a default the user did not choose. It reaches
  for the kit's existing primitives rather than transcribing their classes: a shared component that
  copies an app primitive's markup puts the seam in the worst place there is (ADR 0014).
- `packages/deck-kit/scripts/precache-shell.ts` — the audio extension joins `SHELL_EXTENSIONS`.
- `playwright.config.ts` — `use.launchOptions.args: ['--mute-audio']`, once, at the top level, so it
  reaches all five projects.
- The SPRAWL//Atlas exclusion gets an assertion of its own, in the register of the roster guard's
  companion check that the piece carries no pre-paint script: a guard that reads the workspaces'
  sources and holds that `apps/sprawl` names the sound module nowhere. It is written against
  whichever import path is current, so #400's move updates it along with every other caller. Its
  purpose is to keep the exclusion a decision that someone has to argue with rather than a line
  nobody noticed was missing.

## Questions / Future Work

- **The cross-origin handoff, still open from ADR 0025.** It now has two passengers rather than one,
  and building it for the Theme alone would be the drift — whatever carries one must carry both. The
  hub is the natural place for it, and the fence in ADR 0025 is not in the way: a link that carries
  a *preference* is navigation, not the artifact that fence forbids.
- **The completion chime.** The prior art has two sounds, and this ADR ships one. The second is not a
  press, so it needs a call site per program — the first place app vocabulary would reach the seam —
  and it should be decided when there is a program that wants it, not before.
- **Whether the allowlist stays a selector.** One document listener with a `closest()` allowlist is
  the smallest thing that works. If a program ever needs a control that is in the grammar but must
  stay silent, an opt-out attribute is the cheaper answer than moving to per-component handlers.
