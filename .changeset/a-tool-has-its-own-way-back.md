---
'@cyberdeck/ascii': minor
---

Every tool in the EDIT tab has its own way back: a `↺` on the rule that names it, restoring that
tool's ConversionSettings and nothing else — turn the tone around and come back without losing the
Charset you were happy with. The program had no reset of any kind before this, scoped or global.

Which keys a tool owns is spelled out rather than read off the id it happens to match, and a test
holds the partition: every key of ConversionSettings claimed exactly once, none orphaned. So a reset
patches one scope, the canvas repaints on it, and the Preset the chips are tracking hears about
exactly the axis that moved.

A tool already at its default keeps its control and disables it, saying why — an absent control
would reflow the panel the moment the tool came home. The Charset reads that question one way
wider, because a refused ramp stands in its field rather than in the settings: while an error is on
screen the `↺` stays offered, since it is what takes the error away. `DEFAULT_SETTINGS` moves beside
`ConversionSettings` on the way, so the sliders' double-click reset and the `↺` can no longer
disagree about what a default is.
