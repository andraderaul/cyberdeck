---
'@cyberdeck/glitch': minor
---

A Link can now be **bypassed** — silenced without leaving the Chain. Finding out what a Link was
contributing used to mean removing it, which cost the params it had been tuned to and brought it
back on defaults. A bypassed Link keeps its params, its position and its slot against the ten-Link
cap: it is silenced, not absent, so the chip stays in the row (marked with a dashed border and a ⊘,
and announced as bypassed in its accessible name) and the `N of 10 effects` count still counts it.
Its params stay editable while it is silent, which is half the point — tune a Link you cannot hear
yet, then switch it back on.

Bypass is part of the look, so it moves with the look and only with the look: it rides through a
Re-roll and an animated Seed untouched, and a Preset or a Randomize replaces the look outright with
one whose every Link is audible. Silencing a Link marks the active Preset `(modified)`, and
switching it back on restores the match.

The Chain file carries it — `"bypassed": true` on a silenced Link, written only when it is true —
**at format version 1, unchanged**. Every Chain file exported before this still imports, with every
Link active.
