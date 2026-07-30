---
'@cyberdeck/deck-kit': minor
---

The Control Strip's tabs now behave the way `role="tab"` promises: the Strip is a single tab stop,
the arrows move along the row, Home and End jump to either end, and Enter or Space selects. Moving
through the tabs deliberately does not swap the panel underneath — a tablist that selected on
arrival would change what you are looking at while you were only passing through.

Two things also stop talking over the interface. A toast's variant glyph is decoration, but it was
the first thing its alert announced, so every error opened with "multiplication x". And the modal's
click-away backdrop reached a screen reader as a full-viewport button with no name at all; it is
pointer scenery now, with Escape still closing from the keyboard.
