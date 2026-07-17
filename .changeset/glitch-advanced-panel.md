---
'@cyberdeck/glitch': minor
---

GLITCH//Studio: the control panel moves behind an **advanced** affordance. Every Effect's params and
the Re-roll control are unchanged — they now sit inside a collapsed disclosure rather than facing
the user on open, which is the progressive-disclosure layer the presets-first front door sits above
(#86).

The panel is the tweak layer, not the front door: a casual creator should reach a good-looking
result without meeting a wall of sliders, and the sliders should still allow the ugly extremes for
anyone who goes looking. A new `Disclosure` primitive owns the open state and the
`aria-expanded` / `aria-controls` wiring.
