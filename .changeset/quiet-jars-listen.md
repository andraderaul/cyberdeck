---
'@cyberdeck/golem': minor
---

`clear` wipes the Console log, and `ctrl+l` / `cmd+k` do it without leaving the prompt — the two
chords the operator already learned, one from the unix shell and one from macOS Terminal. Both are
bound only while the Console input has focus, so anywhere else on the page they stay the browser's.

It clears the Console and nothing else: the Machine, its Terminal and the recorded trace all
survive, which is the Console/Terminal line the program is built on (ADR 0018). The chord submits
the same `clear` command the parser accepts rather than reaching past it, so the shortcut cannot
drift from what typing the word does — and, like a real shell, it leaves a half-typed command at
the prompt alone.
