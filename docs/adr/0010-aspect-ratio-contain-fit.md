# Aspect-ratio contain fit

`convertImage()` drew the source with `ctx.drawImage(img, 0, 0, cols, rows)`, stretching it to fill the whole `cols × rows` grid. The ASCII output therefore always took the aspect ratio of the canvas container, never that of the Source — portraits and panoramas came out distorted. This full-bleed behavior was an accident of the `drawImage` call, not a deliberate choice. Since a conversion tool should be faithful to the Source, we switched to a "contain" fit that preserves the Source's proportions and letterboxes the remaining canvas as void.

The decision:

- **Contain fit for both Source Image and Live Source.** A new pure helper `computeContainFit(srcW, srcH, cols, rows)` converts the Source aspect into grid units — accounting for the non-square monospace cell via `MONOSPACE_CHAR_WIDTH_RATIO` — and returns the centered `{ dCols, dRows, offsetX, offsetY }` sub-region. It is pure arithmetic, testable without a DOM (see ADR 0005).
- **Explicit void mask for the bands, not black pixels.** Cells outside the drawn sub-region are emitted directly as `' '` void cells, bypassing the luminance pipeline. Relying on black pixels was rejected: `applyBrightnessContrast(0, …)` lifts pure black to a visible character whenever `contrast < 1`, so the "empty" bands would fill with `:`/`.` glyphs exactly when the user lowers contrast.
- **`convertImage()` receives the fit region.** It already owns `drawImage` on the hidden canvas and is already impure, so passing it the sub-region does not cross the ADR 0005 boundary — `computeFrame()` stays pure and untouched.
- **TXT Export is trimmed tight; PNG keeps the frame.** PNG is a visual medium where the letterbox reads as intentional. TXT exists to be pasted into terminals/editors, where margin is noise. Because `render-frame.ts` knows the region, it slices `asciiRows` to `oy..oy+dRows × ox..ox+dCols` exactly — no blank-line heuristics — before handing rows to `onConverted`. This deliberate divergence keeps `computeFrame()` free of new parameters.
- **Degenerate dimensions fall back to fill.** If `srcW <= 0 || srcH <= 0` (e.g. a video before metadata resolves), `computeContainFit` returns the full grid rather than producing `NaN`. `dCols`/`dRows` are clamped to `[1, cols]`/`[1, rows]`; the existing `cols < 1 || rows < 1` render guard is unchanged.

No user-facing fill/contain toggle: fill was the accident we are removing, so canonizing it as an option (a new `ConversionSetting`, UI, persistence, tests) would be premature. Mirror handling is unchanged — `isMirrored` is a CSS `scaleX(-1)` on the visible canvas, and the centered bands are horizontally symmetric.

## Considered Options

- **Keep full-bleed stretch** — rejected: distorts the Source; fidelity of proportion is the requirement.
- **Letterbox via black pixels instead of a void mask** — rejected: breaks under `contrast < 1`, which lifts black into visible glyphs.
- **TXT Export matching the PNG frame (padding included)** — rejected: leading/trailing spaces and blank lines are noise in a text file meant for pasting.
- **A fill/contain toggle** — rejected for now: no demand, and it would preserve the very behavior we classified as a bug.
