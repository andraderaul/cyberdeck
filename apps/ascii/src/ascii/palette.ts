// The adaptive Color Mode's quantizer. Pure over the AsciiCell grid — no canvas, no DOM, the same
// boundary ADR 0005 draws around computeFrame(), which is its only caller.
//
// Nothing here reads a Theme token, and nothing here may: a Color Mode paints the user's art and a
// Theme paints the deck's chrome (ADR 0013, ADR 0024). Every colour this file produces came out of
// the Source itself, which is the strongest form that rule can take — there is no constant to get
// wrong.

import type { AsciiCell } from './types'

/**
 * The lattice the colour cube is cut into — 4 × 4 × 4 = 64 bins, on edges that are constants and
 * are never derived from the picture. Every claim this file makes rests on that one property, so
 * it is the number to be careful with.
 */
const BINS_PER_CHANNEL = 4

/**
 * Bits discarded from a channel to land in its bin. Derived rather than spelled: this and
 * `BINS_PER_CHANNEL` are one fact, and written twice a change to the first silently wrongs the
 * second.
 */
const CHANNEL_SHIFT = 8 - Math.log2(BINS_PER_CHANNEL)

/** Bins in the lattice — the length of a `SourcePalette`. */
const BIN_COUNT = BINS_PER_CHANNEL ** 3

/** What each bin accumulates, interleaved in one buffer: population, then ΣR, ΣG, ΣB. */
const BIN_STRIDE = 4

/**
 * A colour per lattice bin — the mean of the cells that landed in it — and a hole where none did.
 * Read it through `paletteColor` rather than by index: which bin a colour belongs to is this file's
 * business, and a caller indexing it itself would be a second copy of the partition.
 */
export type SourcePalette = readonly (string | undefined)[]

/**
 * Which bin a colour falls in. This is the whole partition, and it is settled before any picture is
 * seen: three constant thresholds per channel — no ranking, no clustering, nothing off the data.
 */
function binOf(cell: AsciiCell): number {
  return (
    ((cell.r >> CHANNEL_SHIFT) * BINS_PER_CHANNEL + (cell.g >> CHANNEL_SHIFT)) * BINS_PER_CHANNEL +
    (cell.b >> CHANNEL_SHIFT)
  )
}

/**
 * The Source's own colours, one per occupied lattice bin, each the mean of the cells that landed in
 * it — so the colours the art comes back in are colours the picture really has, not the lattice's
 * corners. What a cell is painted is decided by which bin it is *in*, never by which of the
 * palette's entries it is nearest.
 *
 * **That distinction is the design, and it was bought the hard way.** An earlier shape kept the six
 * most populated bins and painted each cell the nearest of those six. It reads like the same idea
 * and is not: nearest-of-six is a Voronoi over six *data-dependent* means, so the partition
 * deciding colour moved with the picture after all. Reproduced on two contenders straddling sixth
 * place, moving a single cell traded the cut and repainted **21 of 71 cells**, ten in bins that
 * cell never touched. Painting a cell from its own bin deletes the ranking and the Voronoi
 * together, and with them the failure. `palette.test.ts` holds that reproduction as a regression.
 *
 * The price is named rather than hidden: the palette is no longer capped at six. It holds as many
 * colours as the picture puts in the lattice — at most 64, in practice a couple of dozen — so this
 * is a posterisation, not a reduction to a handful. That is what a partition which does not move
 * costs, and it is the better half of the trade.
 *
 * **Recomputed per frame, a Live Source included, and that is the decision.** The two ways this
 * could go wrong are staleness (a palette held from the first frame while the scene moves on) and
 * flicker (a palette that jumps between frames). Neither survives contact with the shape above:
 *
 * - Staleness would be fatal and is refused. A Live Source has no *Source* to hold a palette for —
 *   the scene is the input, and a webcam's first frames are the ones it spends warming up and white
 *   balancing. A palette pinned there would paint the rest of the session in the colours of one
 *   dark, wrong frame, with nothing short of re-opening the camera to clear it.
 * - Flicker is what a data-dependent partition costs, and this partition is not one. Between two
 *   frames a cell can change colour in exactly two ways, and both are bounded. It crosses a fixed
 *   channel threshold, in which case it alone moves and it moves to the bin next door; or its own
 *   bin's mean shifts, which is an average over that bin's population and reaches no other bin at
 *   all. There is no step at which one cell's change can repaint a cell in a different bin.
 *
 * Holding it per Source would also cost the property that makes Preview, PNG Export, TXT Export and
 * HTML Export agree by construction: the palette would become state outside `computeFrame()`,
 * and every one of those consumers would have to be handed the same copy of it.
 *
 * Blank cells are skipped, and that is not only an optimisation. A cell whose character is a space
 * paints nothing, so its colour is never seen — and skipping it is what makes the full grid and the
 * region-cropped grid (ADR 0010) derive the *same* palette, since the letterbox bands are void
 * cells and nothing else separates the two. Without it the preview and the text Exports would be
 * two quantizations of two different pictures.
 */
export function quantizePalette(cells: readonly AsciiCell[][]): SourcePalette {
  const bins = new Int32Array(BIN_COUNT * BIN_STRIDE)

  for (const row of cells) {
    for (const cell of row) {
      if (cell.char === ' ') {
        continue
      }
      const at = binOf(cell) * BIN_STRIDE
      bins[at] += 1
      bins[at + 1] += cell.r
      bins[at + 2] += cell.g
      bins[at + 3] += cell.b
    }
  }

  const palette: (string | undefined)[] = new Array(BIN_COUNT)
  for (let bin = 0; bin < BIN_COUNT; bin++) {
    const at = bin * BIN_STRIDE
    const population = bins[at]
    if (population > 0) {
      const r = Math.round(bins[at + 1] / population)
      const g = Math.round(bins[at + 2] / population)
      const b = Math.round(bins[at + 3] / population)
      palette[bin] = `rgb(${r},${g},${b})`
    }
  }
  return palette
}

/**
 * The colour the Source gave this cell's corner of the lattice.
 *
 * @returns `undefined` where no painting cell reached this cell's bin. For a cell of the very grid
 *   the palette came from that means only a blank, since a painting cell always contributes to its
 *   own bin — but the function makes no such promise about a cell from anywhere else.
 */
export function paletteColor(palette: SourcePalette, cell: AsciiCell): string | undefined {
  return palette[binOf(cell)]
}
