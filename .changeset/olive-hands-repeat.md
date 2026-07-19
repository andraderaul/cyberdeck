---
'@cyberdeck/glitch': minor
---

The Chain is now the look. App state holds an ordered list of Links instead of a flat settings object, the six Presets are Chains carrying only the Effects they actually use, and an Effect is on because its Link is present — the on/off toggles and the "zero means off" convention are gone. Every Preset renders exactly as it did before. The advanced panel lists the active look's Links in order, so a Preset that leaves an Effect out simply has one section fewer.
