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
  // ascii gradient
  | 'classic'
  | 'sharp'
  | 'detailed'
  | 'ascii'
  // unicode blocks
  | 'blocks'
  | 'halfblock'
  // writing systems
  | 'braille'
  | 'katakana'
  // shapes
  | 'geometric'
  | 'circles'
  // specialized
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
  // ascii gradient
  classic: ' .:-=+*#%@',
  sharp: ' .^!*<&%$#@',
  detailed: ' .\'`^",:;Il!i><~+_-?][}{1)(|\\/tfjrxnuvczXYUJCLQ0OZmwqpdbkhao*#MW&8%B@$',
  ascii: ' .,;|+=i1lt*xX0#@',
  // unicode blocks
  blocks: ' ░▒▓█',
  halfblock: ' ▄▀█',
  // writing systems
  braille: ' ⠁⠃⠇⡇⣇⣧⣷⣿',
  katakana: ' ･ｦｧｱｲｴｵｸｶｷｺｻｼｽｾｿﾁﾂﾃﾄﾅﾆﾇﾉﾊﾌﾍﾎﾏﾐﾑﾒﾔﾗﾘﾙﾚﾛﾜﾝ',
  // shapes
  geometric: ' ·•○◇◆□■▲▼◀▶★✦',
  circles: ' ·∘○◎●',
  // specialized
  box: ' ╴─│┼╪╬█',
  binary: ' 01',
}

export interface AsciiCell {
  char: string
  r: number
  g: number
  b: number
}
