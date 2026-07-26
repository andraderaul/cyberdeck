---
"@cyberdeck/ascii": minor
---

ASCII//Convert gains the deck's Theme control, in the header beside `about` and the AI key
(ADR 0024).

The Color Modes are untouched. A Theme is what the program is drawn in; a Color Mode is what the
conversion paints, and picking one cannot change art you have already made. It is also why no Theme
is called `matrix` or `neon`: this is the only program where both controls are visible, and they
must not read as one setting shown twice.

Also fixes the default modal's background, which carried `bg-elevated` — not a class, so the modal
has been transparent since it was written.
