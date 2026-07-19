---
'@cyberdeck/glitch': minor
---

The Control Strip's OUT tab (ADR 0020): PNG Export, Capture, Copy and Recording move into the third
tab with today's per-source availability unchanged, and the always-visible ExportBar is gone —
export is the session's terminal action and affords a tab switch.

Recording is the one stateful output, so its start and stop now live apart: start is a control in
OUT, stop is the canvas REC badge, which becomes tappable and carries the elapsed timer. A take
keeps running while you tweak the look in PRESETS or EDIT, and is stoppable from any of them
without new chrome.

A full GLITCH session — choose a Source, apply a Preset, tweak the Chain, take the result out — now
runs in the Strip alone.
