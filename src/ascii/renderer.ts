import type { AsciiCell, ColorMode, ConversionSettings } from './types'

export interface RenderInstruction {
  char: string
  x: number
  y: number
  color: string
}

const COLOR_MODE_COLORS: Partial<Record<ColorMode, string>> = {
  matrix: '#00ff41',
  bw: '#c8c8e0',
  retro: '#ffe600',
  sepia: '#c4a46b',
  neon: '#ff2d78',
}

// Dual-color modes: [colorA (bright, lum ≥ 0.5), colorB (dark, lum < 0.5)]
const DUAL_COLOR_MODES: Partial<Record<ColorMode, [string, string]>> = {
  synthwave: ['#00ffff', '#ff00ff'],
  'matrix-dual': ['#00ff41', '#9d00ff'],
  acid: ['#ccff00', '#ff0099'],
  infrared: ['#ff4500', '#0066ff'],
}

export const MONOSPACE_CHAR_WIDTH_RATIO = 0.6

// Pure: derives render instructions and ascii text from a cell grid — no DOM, fully testable.
// See ADR 0005 for the pure/impure boundary rationale.
export function computeFrame(
  cells: AsciiCell[][],
  settings: Pick<ConversionSettings, 'resolution' | 'colorMode'>,
): { instructions: RenderInstruction[]; asciiRows: string[] } {
  const { resolution, colorMode } = settings
  const charW = resolution * MONOSPACE_CHAR_WIDTH_RATIO
  const charH = resolution

  const instructions: RenderInstruction[] = []
  const asciiRows: string[] = []

  for (let row = 0; row < cells.length; row++) {
    let line = ''
    for (let col = 0; col < cells[row].length; col++) {
      const cell = cells[row][col]
      const dualColors = DUAL_COLOR_MODES[colorMode]
      let color: string
      if (dualColors) {
        const lum = (0.299 * cell.r + 0.587 * cell.g + 0.114 * cell.b) / 255
        color = lum >= 0.5 ? dualColors[0] : dualColors[1]
      } else if (colorMode === 'original') {
        color = `rgb(${cell.r},${cell.g},${cell.b})`
      } else {
        color = COLOR_MODE_COLORS[colorMode] ?? '#c8c8e0'
      }
      instructions.push({ char: cell.char, x: col * charW, y: row * charH, color })
      line += cell.char
    }
    asciiRows.push(line)
  }

  return { instructions, asciiRows }
}

// Impure: only function that writes to CanvasRenderingContext2D for rendering.
export function paintFrame(
  ctx: CanvasRenderingContext2D,
  instructions: RenderInstruction[],
  resolution: number,
  fontFamily: string,
): void {
  const { width: W, height: H } = ctx.canvas
  ctx.fillStyle = '#0a0a0f'
  ctx.fillRect(0, 0, W, H)
  ctx.font = `${resolution}px ${fontFamily}`
  ctx.textBaseline = 'top'

  for (const { char, x, y, color } of instructions) {
    ctx.fillStyle = color
    ctx.fillText(char, x, y)
  }
}
