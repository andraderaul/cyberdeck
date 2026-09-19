import { computeLuminosity } from './converter'
import { cssColor, frameGlyph, type PackedFrame, packHex, packRgb } from './packed-frame'
import { paletteColor, quantizePalette } from './palette'
import {
  type AsciiCell,
  type ColorMode,
  type ConversionSettings,
  MONOSPACE_CHAR_WIDTH_RATIO,
} from './types'

export const COLOR_MODE_COLORS: Partial<Record<ColorMode, string>> = {
  matrix: '#00ff41',
  bw: '#c8c8e0',
  retro: '#ffe600',
  sepia: '#c4a46b',
  neon: '#ff2d78',
}

/**
 * The ground every glyph sits on. Shared with the HTML Export so a document opened offline stands on
 * the same void the preview does — the canvas is the user's art, so this is a literal, not a Theme
 * token (ADR 0013, ADR 0024).
 */
export const CANVAS_BACKGROUND = '#0a0a0f'

const DUAL_COLOR_LUM_THRESHOLD = 0.5

export type DualColorPair = readonly [bright: string, dark: string]

export const DUAL_COLOR_MODES: Partial<Record<ColorMode, DualColorPair>> = {
  synthwave: ['#00ffff', '#ff00ff'],
  'matrix-dual': ['#00ff41', '#9d00ff'],
  acid: ['#ccff00', '#ff0099'],
  infrared: ['#ff4500', '#0066ff'],
}

/** What a mode with no fixed colour of its own falls back to — `bw`'s gray, spelled once. */
const FALLBACK_COLOR = '#c8c8e0'

/** Single accessor so the fallback gray lives in one place. */
export function getModePalette(mode: ColorMode): string | DualColorPair {
  return DUAL_COLOR_MODES[mode] ?? COLOR_MODE_COLORS[mode] ?? FALLBACK_COLOR
}

/**
 * Pure: derives the packed frame from a cell grid — no DOM, fully testable.
 * See ADR 0005 for the pure/impure boundary rationale.
 *
 * Assumes a rectangular grid, which is what `convertImage` and `sliceToRegion` both build: the row
 * width is read once and every index is arithmetic on it.
 */
export function computeFrame(
  cells: AsciiCell[][],
  settings: Pick<ConversionSettings, 'colorMode'>,
): PackedFrame {
  const { colorMode } = settings
  const rows = cells.length
  const cols = cells[0]?.length ?? 0

  const chars = new Uint32Array(rows * cols)
  const colors = new Uint32Array(rows * cols)

  // All hoisted out of the cell loop: the Color Mode is one decision per frame, and this loop runs
  // over every cell of every frame of a Live Source. `adaptive` reads the whole grid before the loop
  // starts — the palette is the picture's own, so there is nothing per-cell to derive it from.
  const palette = colorMode === 'adaptive' ? quantizePalette(cells) : null
  const dualColors = DUAL_COLOR_MODES[colorMode]
  const dual = dualColors && ([packHex(dualColors[0]), packHex(dualColors[1])] as const)
  const fallback = packHex(FALLBACK_COLOR)
  const fixed = packHex(COLOR_MODE_COLORS[colorMode] ?? FALLBACK_COLOR)

  for (let row = 0; row < rows; row++) {
    for (let col = 0; col < cols; col++) {
      const cell = cells[row][col]
      const at = row * cols + col
      if (palette) {
        colors[at] = paletteColor(palette, cell) ?? fallback
      } else if (dual) {
        colors[at] =
          computeLuminosity(cell.r, cell.g, cell.b) >= DUAL_COLOR_LUM_THRESHOLD ? dual[0] : dual[1]
      } else if (colorMode === 'original') {
        colors[at] = packRgb(cell.r, cell.g, cell.b)
      } else {
        colors[at] = fixed
      }
      // `codePointAt` and not `charCodeAt`: a glyph out of `charsetGlyphs` is exactly one code
      // point, and an authored ramp can put an astral one there.
      chars[at] = cell.char.codePointAt(0) ?? 32
    }
  }

  return { cols, rows, chars, colors }
}

/**
 * Impure: the only function that writes to CanvasRenderingContext2D for rendering.
 * See ADR 0005 for the pure/impure boundary rationale.
 */
export function paintFrame(
  ctx: CanvasRenderingContext2D,
  frame: PackedFrame,
  resolution: number,
  fontFamily: string,
): void {
  const { cols, rows, chars, colors } = frame
  const charW = resolution * MONOSPACE_CHAR_WIDTH_RATIO
  const { width: W, height: H } = ctx.canvas
  ctx.fillStyle = CANVAS_BACKGROUND
  ctx.fillRect(0, 0, W, H)
  ctx.font = `${resolution}px ${fontFamily}`
  ctx.textBaseline = 'top'

  // The colour is re-read only where it changes, which is what makes the unpacking free in every
  // mode but `original`: a fixed mode paints the whole frame out of one entry.
  let painted = -1
  for (let row = 0; row < rows; row++) {
    for (let col = 0; col < cols; col++) {
      const at = row * cols + col
      if (colors[at] !== painted) {
        painted = colors[at]
        ctx.fillStyle = cssColor(painted)
      }
      ctx.fillText(frameGlyph(chars[at]), col * charW, row * resolution)
    }
  }
}
