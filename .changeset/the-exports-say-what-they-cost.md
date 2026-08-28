---
'@cyberdeck/ascii': minor
---

Say what each Export costs, under the control that charges it. The OUT tab offered `export png`,
`export txt` and `export html` as three equal buttons, and they are not equal: each one throws away
a different half of the result, and nothing on screen said which half before the click.

The distinction was never missing, only misfiled — `CONTEXT.md`'s **HTML Export** entry has stated
it plainly for as long as that Export has existed ("o **PNG Export** guarda a cor e destrói o texto,
o **TXT Export** guarda o texto e larga a cor"), and the sentence had simply never left the
glossary. It now reads under the buttons: PNG keeps the colour and hands back nothing selectable,
TXT keeps selectable text and drops the colour, HTML keeps both and opens with no network.

Inline in the tab rather than behind an export terminal. A modal would charge one click to read what
fits under a button and a second to act, so the one-click path to each Export survives untouched —
and the copy is carried to a screen reader on `aria-describedby`, which otherwise still heard three
identical buttons. The PNG scale chips keep their place above the row, and the Live Source's Capture
and Record are unchanged.
