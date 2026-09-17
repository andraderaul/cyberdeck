---
'@cyberdeck/ascii': patch
---

The press sound now comes from the kit.

Nothing about it changes for a user of this program — the same listener, the same sample, the same
mute under the same deck-wide `cyberdeck:sound` key. What changed is where it lives: the module was
written here at #398 because one caller is a hypothetical seam (ADR 0014), and it moved whole into
`@cyberdeck/deck-kit/sound` now that the hub, GLITCH//Studio and GOLEM//Console are callers two,
three and four. `src/sound/` is gone; what is left here is the `installClickSound()` call in
`main.tsx` and the `SoundControl` in the header.

**One visible detail did change.** The mute wore this program's header typography — `font-display`
and its tracking pair, from `src/header-type.ts` — and no other header on the deck has such a module,
so the shared control now wears `HeaderButton`'s own type, exactly as the `ThemeControl` beside it
does. The two now match each other rather than the AI control on their other side. Re-measured in
Chromium at 320, 360 and 375 over the built output: the header is unchanged at 372px, because below
`sm` the mute is glyph-only and sits on `HeaderButton`'s `min-w-[44px]` floor, where the face it
wears cannot move the row. `HEADER_CONTROL_LABEL` and `HEADER_CONTROL_GLYPH` left `header-type.ts`
with the control; `HEADER_CONTROL_TYPE` stays, since the AI control still takes it.
