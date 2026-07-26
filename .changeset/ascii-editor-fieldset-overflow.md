---
'@cyberdeck/ascii': patch
---

Stop the page from scrolling sideways in the EDIT tab's charset and color-mode tools. Their
`<fieldset>` wrappers carry the UA rule `min-inline-size: min-content`, so they refused to shrink
below their chip rows and pushed the document past the viewport instead of letting the rows scroll —
charset by ~484px on mobile and even ~74px at desktop widths (its five category groups are wider than
the panel), color mode by ~63px on mobile. Adding `min-w-0` to both fieldsets lets them shrink to the
panel width so the chips scroll in place.
