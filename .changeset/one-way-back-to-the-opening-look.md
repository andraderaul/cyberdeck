---
'@cyberdeck/ascii': minor
---

One control returns the whole conversion to the look the program opens on: `↺ defaults` in the
PRESETS tab, which restores every ConversionSettings axis *and* leaves whatever Preset was selected.
It reuses the EDIT tab's own patch builder over every default key, so "already at its default" is
one rule and not a second copy of the defaults, and there is no second tool→keys map to keep.

It lives in PRESETS because the Strip is this program's only control grammar (ADR 0020) and its
three tabs answer three different questions — which look, which value of one axis, what to do with
the result. "Back to the opening look" is the first of those: it clears the active Preset as much as
it restores the axes, and clearing a Preset is a thing no per-tool control in EDIT may do. So it
stands as the row's zeroth chip, ahead of the scrolling Presets, rather than as an eighth reset in
EDIT or a fourth act in OUT — and the deck grows no command header to hang it from.

Throwing the look away is reversible instead of confirmed, through the offer the program already
has: the reset takes a revert point, so the `revert` control that undoes an applied Suggestion
undoes this too, under the same rule — the user's own next edit retires it, because by then
restoring the snapshot would discard work rather than return it. Nothing asks a modal question on
the way. The loaded Source never moves: this is the conversion resetting, not the session.

That way back is one level deep and not a stack: the two acts share a single snapshot, so a reset
pressed while a Suggestion's revert still stands gives the suggested look back, not the one the
session started from. The control names "the previous look" for exactly that reason — it undoes
whichever of the two last ran.
