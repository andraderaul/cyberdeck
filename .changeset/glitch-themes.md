---
"@cyberdeck/glitch": minor
---

GLITCH//Studio gains the deck's Theme control, in the header (ADR 0024). Chrome, panels and the
LIVE / REC badges follow the Theme; the Chain's output does not. The Theme stops where the user's
pixels begin — the same line ADR 0013 already drew for canvas overlays — so no chrome setting
silently recolours the artefact you are making.

Also fixes the Chain editor's remove control, which carried `hover:text-hot`. That is not a class,
so the control has never changed colour on hover.
