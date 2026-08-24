// A synthetic Source painted straight into the sampled grid, for tests that need to state exactly
// what `convertImage` reads — a hard line, a diagonal, a gentle ramp, a colour no palette ships.
//
// Shared rather than copied: `converter.test.ts` and `presets.test.ts` both drive the same
// pipeline and had grown the same stub independently, which is the second caller the deck's
// extraction bar asks for.

import { vi } from 'vitest'

/**
 * A 2D-context stub reporting `rgb(col, row)` as the opaque colour of every sampled cell.
 *
 * Only the three calls `convertImage` makes on the sampling canvas are stubbed — a test that
 * asserts *how* the canvas was driven wants its own spy, not this.
 */
export function sourceCtx(
  cols: number,
  rows: number,
  rgb: (col: number, row: number) => [number, number, number],
): CanvasRenderingContext2D {
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
  return {
    clearRect: vi.fn(),
    drawImage: vi.fn(),
    getImageData: vi.fn(() => ({ data })),
  } as unknown as CanvasRenderingContext2D
}

/** `sourceCtx` for the grey Sources, where `grey(col, row)` is the level the cell reads. */
export function greyCtx(
  cols: number,
  rows: number,
  grey: (col: number, row: number) => number,
): CanvasRenderingContext2D {
  return sourceCtx(cols, rows, (col, row) => {
    const level = grey(col, row)
    return [level, level, level]
  })
}
