---
'@cyberdeck/deck-kit': minor
---

Three accessibility fixes at the level where a control is either operable or it is not.

The Source Image drop zone hid its file input with `display: none`, which is neither focusable nor
in the accessibility tree — and a label cannot take focus in its place. Since the drop zone is the
deck's single Source Image entry point, that left keyboard and screen-reader users with the webcam
as the only way in. The input is now visually hidden but reachable, and the zone shows the focus it
receives.

`ToggleGroup` spelled its selected option in colour and border alone, so a screen reader heard three
buttons and no answer; each option now reports whether it is the one in force. The group also takes
its name from a legend rather than an `aria-label`, which a fieldset is spec'd to do and screen
readers honour more consistently.
