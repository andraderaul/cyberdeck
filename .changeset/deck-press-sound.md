---
'@cyberdeck/deck': minor
---

The front door makes a sound, and the mute is on the door.

One listener at the document on `pointerdown`, one preloaded WAV, one mute — the mechanism of ADR
0029, taken whole from `@cyberdeck/deck-kit/sound` rather than written again here. **Sound is on by
default**, so a visitor hears one press before they can decline; the mute sits beside the Theme
picker in the header, labelled, and is remembered under the deck-wide `cyberdeck:sound` key.

The hub is included on purpose and it is the one workspace where that needed checking. ADR 0025's
fence forbids it an input, an artifact, a domain core, an embedded program and retention machinery; a
press sound is none of them, and a mute is a preference about how the deck presents itself — the same
clause that already admitted the Theme picker — rather than state about your use kept to bring you
back.

Measured in Chromium over the built output, the header fits at 320, 360 and 375: the mute costs its
44px in a row that had the room, and the word it shows from `sm` up is hidden below that.

The hub has no service worker, so its share of the build rule is only that the sample is emitted as a
file under `dist/assets` instead of being folded into the entry chunk as a data URI, where it would
charge first paint for a sound only a press ever needs.
