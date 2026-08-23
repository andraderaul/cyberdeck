---
'@cyberdeck/ascii': minor
---

Add the `adaptive` Color Mode: the palette is quantized from the Source itself, so the art comes back recoloured in its own colours rather than in a preset's. The colour cube is cut into a fixed 4×4×4 lattice and each cell is painted the mean of the bin it falls in — never the nearest of a ranked few, which would be a Voronoi over data-dependent means and would move the partition with the picture. Because the bin edges are constants, the palette is recomputed on every frame, a Live Source included: one held from a webcam's first frame would paint the whole session in the colours of one dark, warming-up frame. Preview, PNG Export, TXT Export and HTML Export all read the one grid, so they agree by construction.
