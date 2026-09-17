---
'@cyberdeck/sprawl': patch
---

The `[B]` key hint on the outline chip receded with alpha, and `opacity-60` over `--fg-muted`
composites to `#5f5f79` on `--bg` — 3.19:1, under AA-small (#355). Only while the outline is off;
with it on the chip recolours to `--info` and the dimmed key has the headroom.

The off state takes `--fg-subtle` instead, the next step down the foreground scale and one the Theme
Contract pins above the floor. The key still recedes behind the word it belongs to, and the amount it
recedes by is now a token a guard can read rather than a composite nothing audits.
