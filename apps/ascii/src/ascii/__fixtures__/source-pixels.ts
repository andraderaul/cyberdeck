// A synthetic Source painted straight into the sampled grid, for tests that need to state exactly
// what `convertImage` reads — a hard line, a diagonal, a gentle ramp, a colour no palette ships.
//
// Shared rather than copied: `converter.test.ts` and `presets.test.ts` both drive the same
// pipeline and had grown the same stub independently, which is the second caller the deck's
// extraction bar asks for.
//
// The buffer itself rather than a sampling-canvas stub, since the conversion moved off the main
// thread (ADR 0002): `convertImage` is now handed the pixels `sampleSource` read off the hidden
// canvas, so what a test states is the pixels.

/** The RGBA of a `cols × rows` sampled grid whose every cell is opaque `rgb(col, row)`. */
export function sourcePixels(
  cols: number,
  rows: number,
  rgb: (col: number, row: number) => [number, number, number],
): Uint8ClampedArray {
  const data = new Uint8ClampedArray(cols * rows * 4)
  for (let row = 0; row < rows; row++) {
    for (let col = 0; col < cols; col++) {
      const i = (row * cols + col) * 4
      const [r, g, b] = rgb(col, row)
      data[i] = r
      data[i + 1] = g
      data[i + 2] = b
      data[i + 3] = 255
    }
  }
  return data
}

/** `sourcePixels` for the grey Sources, where `grey(col, row)` is the level the cell reads. */
export function greyPixels(
  cols: number,
  rows: number,
  grey: (col: number, row: number) => number,
): Uint8ClampedArray {
  return sourcePixels(cols, rows, (col, row) => {
    const level = grey(col, row)
    return [level, level, level]
  })
}
