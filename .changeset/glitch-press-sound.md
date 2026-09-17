---
'@cyberdeck/glitch': minor
---

GLITCH//Studio makes a sound.

The mechanism of ADR 0029 comes whole from `@cyberdeck/deck-kit/sound` — one listener at the document
on `pointerdown` so the sound lands on the way down, one preloaded WAV, one allowlist matched with
`closest()` so the canvas, the panels and the Control Strip's scroll surface stay quiet without asking
for an exemption. Sound is only ever a second channel: every press that plays it already changes
something visible, and nothing here has come to depend on hearing it.

**Sound is on by default** (ADR 0029 chose opt-out), so a user who does not want it hears one press
before they can decline. The mute is beside the Theme picker in the header — the same slot in every
included workspace (ADR 0015) — labelled rather than hidden behind a glyph, and remembered under the
deck-wide `cyberdeck:sound` key, which carries no program name: the mute is one decision for the deck,
and it is per origin only because `localStorage` is, the same recorded gap the Theme already has.

Measured in Chromium over the built output, the header fits at 320, 360 and 375: the mute costs its
44px in a row that had the room, and the word it shows from `sm` up is hidden below that.

The sample is emitted into `dist/assets` and precached with the rest of the shell, never inlined into
the entry chunk — a sound only a press needs does not belong on the first-paint path.
