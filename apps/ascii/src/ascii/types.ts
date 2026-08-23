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

export const DITHERINGS = ['none', 'bayer', 'floyd'] as const

/**
 * Which Dithering the conversion spends before the Charset buckets a cell — see CONTEXT.md.
 * `none` is the conversion as it stood before the pass existed and stays the default everywhere.
 */
export type Dithering = (typeof DITHERINGS)[number]

export interface ConversionSettings {
  resolution: number
  brightness: number
  contrast: number
  colorMode: ColorMode
  charset: Charset
  /** The Edge Glyph axis. Off is the deck's shipped look, so it stays the default everywhere. */
  edgeGlyphs: boolean
  dithering: Dithering
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

/**
 * Width of a monospace cell as a fraction of its height. Grid geometry, not paint: the fit region,
 * the cols/rows math and the Edge Glyph angle all need it, and only one of those three paints.
 */
export const MONOSPACE_CHAR_WIDTH_RATIO = 0.6

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
