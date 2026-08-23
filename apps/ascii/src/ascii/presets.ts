import type { ConversionSettings } from './types'

export function settingsMatch(a: ConversionSettings, b: ConversionSettings): boolean {
  return (
    a.charset === b.charset &&
    a.colorMode === b.colorMode &&
    a.resolution === b.resolution &&
    a.brightness === b.brightness &&
    a.contrast === b.contrast &&
    a.edgeGlyphs === b.edgeGlyphs &&
    a.dithering === b.dithering
  )
}

export interface Preset {
  id: string
  name: string
  settings: ConversionSettings
}

/**
 * The curated looks — the app's front door, where a casual user gets a good result in one click.
 *
 * Each entry is a whole `ConversionSettings` snapshot rather than a diff from a default, so a
 * reader sees the entire look in one place and re-curating one never moves another.
 *
 * The first four predate the Edge Glyph, the Dithering and the `adaptive` Color Mode, and each of
 * them still spells those axes off — they are the looks the deck shipped, and this is a curation
 * pass, not a restyling of what already works. The three that follow are curated *for* those axes:
 * an axis nothing here names is an axis nobody finds, which is why each of the three is built
 * around one of them rather than sprinkling all three across the roster. They are appended rather
 * than interleaved so the opening chip stays the face the program has always opened with.
 *
 * These numbers are taste. They came from driving both Sources the deck has to read well on — a
 * dense landscape photograph and a flat high-contrast graphic — until each look landed on *both*,
 * and the per-entry comments record what a reader could not get back from the values.
 */
export const PRESETS: Preset[] = [
  {
    id: 'matrix-terminal',
    name: 'Matrix Terminal',
    settings: {
      charset: 'katakana',
      colorMode: 'matrix',
      resolution: 10,
      brightness: 1.0,
      contrast: 1.3,
      edgeGlyphs: false,
      dithering: 'none',
    },
  },
  {
    id: 'demoscene',
    name: 'Demoscene',
    settings: {
      charset: 'halfblock',
      colorMode: 'neon',
      resolution: 8,
      brightness: 1.1,
      contrast: 1.4,
      edgeGlyphs: false,
      dithering: 'none',
    },
  },
  {
    id: 'newspaper',
    name: 'Newspaper',
    settings: {
      charset: 'detailed',
      colorMode: 'bw',
      resolution: 6,
      brightness: 0.9,
      contrast: 1.5,
      edgeGlyphs: false,
      dithering: 'none',
    },
  },
  {
    id: 'synthwave-glow',
    name: 'Synthwave Glow',
    settings: {
      charset: 'classic',
      colorMode: 'synthwave',
      resolution: 12,
      brightness: 1.2,
      contrast: 1.2,
      edgeGlyphs: false,
      dithering: 'none',
    },
  },
  {
    id: 'blueprint',
    name: 'Blueprint',
    // The one look that draws instead of shading: the Edge Glyph carries the picture and every
    // other value is chosen to get out of its way. `circles` because its ramp opens on a space and
    // its marks are round — away from a contour the frame falls to blank and dots, and a dot is the
    // one glyph that never reads as a fragment of `|`, `/`, `-` or `\`.
    //
    // The brightness and contrast are a *pair*, and not the pair either slider looks like alone.
    // Both are folded into the luminance the gradient reads, so the Sobel response scales with
    // roughly their product while the ramp's own level tracks brightness by itself. Pushing
    // contrast up and brightness down therefore quiets the shading without giving up the contours —
    // which is the whole trick here, and why brightness sits below 1 in a look that needs its
    // strokes to be what the eye finds.
    //
    // Resolution is the other half of it and it is a genuine compromise between the two Sources: a
    // coarser cell smooths a dense photograph into clean ridge lines but dissolves a graphic's
    // type, and 10 is the coarsest that still traces letterforms as hollow outlines.
    settings: {
      charset: 'circles',
      colorMode: 'bw',
      resolution: 10,
      brightness: 0.8,
      contrast: 2.0,
      edgeGlyphs: true,
      dithering: 'none',
    },
  },
  {
    id: 'core-dump',
    name: 'Core Dump',
    // A picture surfacing out of a page of ones and zeros, and the Dithering is the entire reason
    // there is a picture: `binary` is three glyphs, so undithered it floors a photograph into blank,
    // `0` and `1`, and most of a landscape lands in blank — the frame comes back nearly empty. The
    // ordered tile spends those two boundaries across 16 cells and the same three characters carry
    // continuous tone. It is the clearest case on the roster of a coarse Charset being *rescued*
    // rather than decorated.
    //
    // `bayer` rather than `floyd`, decided at the canvas: both give a legible picture at three
    // glyphs, but the diffusion's error travels along the row and the terrain comes back smeared,
    // where the fixed tile keeps the ridges crisp and reads as print rather than as noise.
    //
    // Brightness stays under 1 because the dithered path genuinely runs brighter than the
    // undithered one — the offset correcting `charIndex`'s floor is a whole bucket, and across only
    // three levels a bucket is a large share of the picture.
    settings: {
      charset: 'binary',
      colorMode: 'retro',
      resolution: 8,
      brightness: 0.95,
      contrast: 1.5,
      edgeGlyphs: false,
      dithering: 'bayer',
    },
  },
  {
    id: 'silkscreen',
    name: 'Silkscreen',
    // The one look that brings no colour of its own: `adaptive` quantizes the palette off the
    // Source, so the art comes back in the colours it already had, flattened onto the lattice the
    // way an ink layer flattens onto a screen print. Every other Preset paints the picture in the
    // deck's colours; this one paints it in its own, and it is the only chip from which a user
    // learns the program can do that at all.
    //
    // `blocks` is what lets the colour be the subject — a filled cell is a field of ink rather than
    // a mark, so the posterisation reads as a print instead of a mosaic of punctuation.
    //
    // Brightness above 1 is not a stylistic lift but a coverage one, and it is specific to this
    // Color Mode: `blocks` opens on a space, a space paints nothing, and a cell that paints nothing
    // contributes no colour at all. The lift moves the ceiling of that blank first bucket from
    // level ~67 down to ~53, which is the band of a photograph's shadows that goes from
    // withholding its colour to giving it — on a look whose whole point is the Source's palette.
    settings: {
      charset: 'blocks',
      colorMode: 'adaptive',
      resolution: 8,
      brightness: 1.3,
      contrast: 1.05,
      edgeGlyphs: false,
      dithering: 'none',
    },
  },
]
