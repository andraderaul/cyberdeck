import { computeLuminosity } from './converter'
import { paletteColor, quantizePalette } from './palette'
import {
  type AsciiCell,
  type ColorMode,
  type ConversionSettings,
  MONOSPACE_CHAR_WIDTH_RATIO,
} from './types'

export interface RenderInstruction {
  char: string
  x: number
  y: number
  color: string
}

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
 * Pure: derives render instructions and ascii text from a cell grid — no DOM, fully testable.
 * See ADR 0005 for the pure/impure boundary rationale.
 */
export function computeFrame(
  cells: AsciiCell[][],
  settings: Pick<ConversionSettings, 'resolution' | 'colorMode'>,
): { instructions: RenderInstruction[]; asciiRows: string[] } {
  const { resolution, colorMode } = settings
  const charW = resolution * MONOSPACE_CHAR_WIDTH_RATIO
  const charH = resolution

  const instructions: RenderInstruction[] = []
  const asciiRows: string[] = []

  // Both hoisted out of the cell loop: the Color Mode is one decision per frame, and this loop runs
  // over every cell of every frame of a Live Source. `adaptive` reads the whole grid before the loop
  // starts — the palette is the picture's own, so there is nothing per-cell to derive it from.
  const palette = colorMode === 'adaptive' ? quantizePalette(cells) : null
  const dualColors = DUAL_COLOR_MODES[colorMode]

  for (let row = 0; row < cells.length; row++) {
    let line = ''
    for (let col = 0; col < cells[row].length; col++) {
      const cell = cells[row][col]
      let color: string
      if (palette) {
        color = paletteColor(palette, cell) ?? FALLBACK_COLOR
      } else if (dualColors) {
        color =
          computeLuminosity(cell.r, cell.g, cell.b) >= DUAL_COLOR_LUM_THRESHOLD
            ? dualColors[0]
            : dualColors[1]
      } else if (colorMode === 'original') {
        color = `rgb(${cell.r},${cell.g},${cell.b})`
      } else {
        color = COLOR_MODE_COLORS[colorMode] ?? FALLBACK_COLOR
      }
      instructions.push({ char: cell.char, x: col * charW, y: row * charH, color })
      line += cell.char
    }
    asciiRows.push(line)
  }

  return { instructions, asciiRows }
}

/**
 * Impure: the only function that writes to CanvasRenderingContext2D for rendering.
 * See ADR 0005 for the pure/impure boundary rationale.
 */
export function paintFrame(
  ctx: CanvasRenderingContext2D,
  instructions: RenderInstruction[],
  resolution: number,
  fontFamily: string,
): void {
  const { width: W, height: H } = ctx.canvas
  ctx.fillStyle = CANVAS_BACKGROUND
  ctx.fillRect(0, 0, W, H)
  ctx.font = `${resolution}px ${fontFamily}`
  ctx.textBaseline = 'top'

  for (const { char, x, y, color } of instructions) {
    ctx.fillStyle = color
    ctx.fillText(char, x, y)
  }
}
