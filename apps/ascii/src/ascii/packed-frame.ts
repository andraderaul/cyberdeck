// The wire shape of a converted frame, and the two encodings that make it one — ADR 0002's return
// leg. Kept apart from `renderer.ts` because the `adaptive` quantizer packs colours too, and
// `renderer.ts` already imports it: the pair would otherwise be a cycle.

/**
 * One frame as flat arrays, which is the whole point of the shape: it is what the Worker's return
 * leg **transfers** rather than clones (ADR 0002). One entry per cell, row-major, blanks included —
 * `computeFrame` emits one per cell, so the index *is* the grid and x/y are arithmetic on it rather
 * than two more numbers to carry.
 *
 * The pure core emits this natively. A packing step would have to run somewhere, and the only two
 * places are the Worker (pure overhead over emitting it directly) and the main thread (which is the
 * cost this shape exists to remove) — so there is no step, and the synchronous fallback pays
 * nothing for an encoding it does not need.
 */
export interface PackedFrame {
  cols: number
  rows: number
  /**
   * One Unicode **code point** per cell. Not a UTF-16 code unit: `charsetGlyphs` splits a ramp by
   * code point precisely because an authored Charset can reach past the BMP (`charset.ts`), and a
   * 16-bit cell would hand the grid half a surrogate pair — the same corruption that split is there
   * to prevent, one layer down.
   */
  chars: Uint32Array
  /** One packed colour per cell — see `CSS_RGB_FORM` for the packing. */
  colors: Uint32Array
}

/**
 * Set when the packed colour is to be written as `rgb(r,g,b)`, clear when it is `#rrggbb`.
 *
 * The bit is what makes the packing **lossless at the string level**, which is the property that
 * matters: the colour is written verbatim into an HTML Export's `style` attribute, so a frame that
 * came back as `rgb(0,255,65)` where it used to say `#00ff41` would be a different document. Two
 * spellings are all this program produces — a fixed or dual mode's hex literal, and the decimal
 * triple `original` and `adaptive` build — so one bit covers them.
 */
const CSS_RGB_FORM = 1 << 24

/** A `#rrggbb` literal as a packed colour. */
export function packHex(hex: string): number {
  return Number.parseInt(hex.slice(1), 16)
}

/** A cell's own channels as a packed colour, spelled `rgb(r,g,b)` when unpacked. */
export function packRgb(r: number, g: number, b: number): number {
  return CSS_RGB_FORM | (r << 16) | (g << 8) | b
}

// Bounded rather than unbounded: `original` can put a distinct colour in every cell of a 150,000
// cell grid, and a cache that kept them all would be a leak the Live Source feeds ~15 times a
// second. Every other Color Mode fits in a handful of entries — one for the fixed modes, two for
// the dual ones, at most 64 for `adaptive` — which is exactly the case the cache is for.
const CACHE_CAP = 4096
const cssColors = new Map<number, string>()
const glyphs = new Map<number, string>()

function intern(cache: Map<number, string>, key: number, build: (key: number) => string): string {
  const hit = cache.get(key)
  if (hit !== undefined) {
    return hit
  }
  const value = build(key)
  if (cache.size >= CACHE_CAP) {
    cache.clear()
  }
  cache.set(key, value)
  return value
}

/** The CSS colour a packed entry stands for, byte for byte as `computeFrame` decided it. */
export function cssColor(packed: number): string {
  return intern(cssColors, packed, (key) => {
    const rgb = key & 0xffffff
    return key & CSS_RGB_FORM
      ? `rgb(${rgb >>> 16},${(rgb >>> 8) & 0xff},${rgb & 0xff})`
      : `#${rgb.toString(16).padStart(6, '0')}`
  })
}

/**
 * The glyph a packed code point stands for.
 *
 * Interned, so the paint loop hands `fillText` a shared string rather than allocating one per cell:
 * a frame draws from the Charset's ramp plus the four Edge Glyphs, so the distinct count is dozens
 * however many cells there are.
 */
export function frameGlyph(codePoint: number): string {
  return intern(glyphs, codePoint, String.fromCodePoint)
}

/** The frame's characters row by row — TXT Export verbatim, built only when an Export asks. */
export function frameRows({ chars, cols, rows }: PackedFrame): string[] {
  const lines: string[] = []
  for (let row = 0; row < rows; row++) {
    let line = ''
    for (let col = 0; col < cols; col++) {
      line += frameGlyph(chars[row * cols + col])
    }
    lines.push(line)
  }
  return lines
}
