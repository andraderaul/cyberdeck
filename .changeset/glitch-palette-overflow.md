---
'@cyberdeck/glitch': patch
---

Stop the page from scrolling sideways when you open the add-effect palette on mobile. The palette's
`add effect` fieldset carries the UA `<fieldset>` rule `min-inline-size: min-content`, so it refused
to shrink below the six effect chips' combined width and pushed the whole document ~73px past the
viewport instead of letting its own row scroll. Adding `min-w-0` lets the fieldset shrink to the
panel width so the chips scroll in place — the same fight the chain row below already won with
`flex-1 min-w-0`.
