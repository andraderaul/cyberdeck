---
'@cyberdeck/golem': minor
---

GOLEM//Console makes a sound — and its command line stays silent.

The mechanism of ADR 0029 comes whole from `@cyberdeck/deck-kit/sound`: one listener at the document
on `pointerdown` so the sound lands on the way down, one preloaded WAV, one allowlist matched with
`closest()`. This program is the case that shaped that allowlist — it names `input` **by type** and
never bare, because a press on the Console's prompt begins typing rather than actuating anything, and
the typing itself is silent. A bare `<input>` in the list would have bought a click on entering the
field and another on moving the caret.

**Sound is on by default** (ADR 0029 chose opt-out), so a user who does not want it hears one press
before they can decline. The mute is beside the Theme picker in the header — the same slot in every
included workspace (ADR 0015) — and is remembered under the deck-wide `cyberdeck:sound` key. It is the
second control here that is not a typed command, and like the first it changes how the deck looks and
sounds rather than what the machine does, so ADR 0018's rule about the Console being the only control
grammar is untouched.

Measured in Chromium over the built output, the header fits at 320, 360 and 375 — the status readout
yields the auto margin and nothing is clipped.

The sample is emitted into `dist/assets` and precached with the rest of the shell, never inlined into
the entry chunk.
