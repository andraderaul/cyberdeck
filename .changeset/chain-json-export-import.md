---
'@cyberdeck/glitch': minor
---

Export and import a Chain as JSON — the user's own Preset.

Randomize deliberately never invents structure: which Links, how many and in what order ride
through untouched, because bad structure sinks a look faster than a bad number. So structural
variety can only come from curation, and until now only the six shipped Presets could carry it. A
Chain built by hand in the EDIT tab now leaves the app as a file from OUT and comes back from
PRESETS, which is where a brought look belongs — it is applied exactly as one of the six is.

The file carries the **Chain only**: no Seed (importing draws a fresh one, as applying a Preset
does) and no Link `id` (UI plumbing, which `chainMatch` already ignores). An imported Chain clears
the active Preset — it is a look the user brought, not one of the six edited away from. Nothing in
the file is trusted: an unknown Effect, a param outside its range, malformed JSON or a Chain past
`MAX_CHAIN_LENGTH` are each rejected — never clamped — with a message naming what is wrong,
surfaced through a toast.
