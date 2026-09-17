---
'@cyberdeck/ascii': minor
---

The deck makes a sound, and ASCII//Convert is where it starts.

One listener at the document on `pointerdown`, one preloaded WAV, one mute — the whole mechanism of
ADR 0029 in its first program. The trigger is `pointerdown` rather than `click` so the sound lands on
the way down, before the re-render the press causes, and it plays only for an allowlist of controls
matched with `closest()`, so a canvas, a panel or a scroll surface stays quiet without asking. Sound
is only ever a second channel: every press that plays it already changes something visible, and
nothing here has come to depend on hearing it.

**Sound is on by default** (ADR 0029 chose opt-out — a feedback nobody has heard is a feedback nobody
enables), so a user who does not want it hears one press before they can decline. The mute is beside
the Theme picker in the header, labelled rather than hidden behind a glyph, and it is remembered under
the deck-wide `cyberdeck:sound` key.

**The sample and the level are both placeholders, set by arithmetic and not by ear.** ADR 0029 asks
for a gain tuned by listening *and* for a designed artifact, and neither exists yet: `click.wav` is a
synthesised 30 ms resonant burst normalised to a peak of exactly 0.700 — the round number is the tell
— standing in until someone makes one by listening. `CLICK_VOLUME` in `src/sound/sound.ts` is the
single edit that changes the level, `src/sound/click.wav` the single file that replaces the sample,
and `src/sound/click-sample.mjs` beside it is the recipe that writes the placeholder, committed so
the replacement starts from constants someone can vary rather than from an opaque blob.

**Only controls that actuate on the press make a sound.** `input` is spelled by type rather than
bare: a text field's press begins typing rather than doing anything, and the typing is silent, so a
bare `<input>` in the allowlist would only sound on entering the field and on moving the caret.
