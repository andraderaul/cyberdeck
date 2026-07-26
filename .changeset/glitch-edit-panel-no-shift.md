---
'@cyberdeck/glitch': patch
---

Stop the EDIT tab from jumping on mobile each time you switch Effects. The params panel stacks its
controls below `sm`, so each Effect's height differed (1 to 3 controls — pixel sort the tallest),
and only a `min-h` floor was reserved: switching Effect changed the panel's height and reflowed the
whole strip, moving the canvas boundary by up to ~135px. The panel now reserves the tallest Effect's
stacked height on mobile so it holds steady across switches; at `sm` the params flow into equal
columns and every Effect is already one row, so the floor drops back.
