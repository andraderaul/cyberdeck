---
'@cyberdeck/golem': patch
---

GOLEM//Console now reads as part of the deck rather than a separate thing sharing its colours:
the same header shell, border and spacing scale as ASCII//Convert and GLITCH//Studio.

On a small screen the panels stack into one scrolling column instead of a squeezed desktop
layout, so a shared link can be read and run on a phone. No horizontal overflow at any common
width, and the Console input no longer autocapitalises the commands you type.
