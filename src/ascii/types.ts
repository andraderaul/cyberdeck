export const COLOR_MODES = [
  'matrix',
  'bw',
  'retro',
  'sepia',
  'neon',
  'original',
  'synthwave',
  'matrix-dual',
  'acid',
  'infrared',
] as const

export type ColorMode = (typeof COLOR_MODES)[number]
export type Charset =
  | 'classic'
  | 'sharp'
  | 'detailed'
  | 'ascii'
  | 'blocks'
  | 'halfblock'
  | 'braille'
  | 'katakana'
  | 'geometric'
  | 'circles'
  | 'box'
  | 'binary'

export interface ConversionSettings {
  resolution: number
  brightness: number
  contrast: number
  colorMode: ColorMode
  charset: Charset
}

export const CHARSET_MAPS: Record<Charset, string> = {
  classic: ' .:-=+*#%@',
  sharp: ' .^!*<&%$#@',
  detailed: ' .\'`^",:;Il!i><~+_-?][}{1)(|\\/tfjrxnuvczXYUJCLQ0OZmwqpdbkhao*#MW&8%B@$',
  ascii: ' .,;|+=i1lt*xX0#@',
  blocks: ' ░▒▓█',
  halfblock: ' ▄▀█',
  braille: ' ⠁⠃⠇⡇⣇⣧⣷⣿',
  katakana: ' ･ｦｧｱｲｴｵｸｶｷｺｻｼｽｾｿﾁﾂﾃﾄﾅﾆﾇﾉﾊﾌﾍﾎﾏﾐﾑﾒﾔﾗﾘﾙﾚﾛﾜﾝ',
  geometric: ' ·•○◇◆□■▲▼◀▶★✦',
  circles: ' ·∘○◎●',
  box: ' ╴─│┼╪╬█',
  binary: ' 01',
}

export interface AsciiCell {
  char: string
  r: number
  g: number
  b: number
}

/**
 * Centered sub-region of the char grid that the Source is drawn into (contain fit).
 * Cells outside it are void — see ADR 0010.
 */
export interface FitRegion {
  offsetX: number
  offsetY: number
  dCols: number
  dRows: number
}
