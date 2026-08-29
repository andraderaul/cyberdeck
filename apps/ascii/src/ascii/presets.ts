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
 * around one of them rather than sprinkling all three across the roster. The last three answer the
 * same argument one layer out, where what went unnamed was not an axis but *values* of one — the
 * `floyd` Dithering no entry had ever spent, and the two Color Modes that are an instrument and no
 * stylization at all. Every entry is appended rather than interleaved, so the opening chip stays
 * the face the program has always opened with.
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
  {
    id: 'duotone',
    name: 'Duotone',
    // The first entry to dither into a dual Color Mode, and the two axes turn out to be genuinely
    // independent: the diffusion moves the glyph index, `acid` reads the cell's own RGB and never
    // sees it. Continuous tone in the marks, a hard cut in the colour — which is what a two-ink
    // riso print is, and why a ramp made of dot patterns is the Charset for it.
    //
    // The contrast is the number that matters here and it is not about tone. `floyd` measures each
    // cell's error against its bucket's *floor*, so the error is always positive and always handed
    // forward: over a flat field sitting just above black the diffusion walks the level up until it
    // crosses the first boundary, and a graphic's dead ground comes back speckled. Contrast is what
    // clamps that ground to a true zero, where there is no error left to hand on — measured on the
    // flat Source, it takes the frame from 45% of its cells inked back to 7%, against 6% for the
    // same look undithered. Nothing under about 1.2 holds it.
    //
    // Brightness stays at 1, and the contrast with Core Dump is the point: the offset correcting
    // `charIndex`'s floor is one bucket either way, but a bucket of `binary` is a third of the ramp
    // and a bucket of `braille` is an eighth. Measured against `none`, the mean glyph moves by up
    // to a tenth of this ramp where it moves a third of that one. The ramp needs no pulling back —
    // only the blank boundary did, and the contrast already holds it.
    //
    // The Resolution is bounded from above by the same wall Thermal runs into: past about 10 a cell
    // averages enough Source together that a flat graphic's bright marks fall back under the 0.5
    // cut and the second ink stops appearing at all. 8 keeps a step of room under that, and is as
    // fine as this Charset goes before the dot pattern inside a glyph stops reading as one — which
    // for a look whose whole subject is halftone dots is the other half of the same choice.
    settings: {
      charset: 'braille',
      colorMode: 'acid',
      resolution: 8,
      brightness: 1.0,
      contrast: 1.5,
      edgeGlyphs: false,
      dithering: 'floyd',
    },
  },
  {
    id: 'thermal',
    name: 'Thermal',
    // The roster's first instrument rather than a style. `infrared` splits at a fixed luminance and
    // paints both sides flat, so the frame reads as a sensor's rather than a photograph's, and
    // `sharp` is what makes the hot side arrive as a solid blob: most of its length is spent on
    // `&%$#@`, so everything over the cut comes back dense.
    //
    // The Resolution is the whole curation, for a reason no slider hints at: the split reads the
    // cell's *own* RGB, upstream of brightness and contrast, so neither can move the cut by a
    // single cell — but a coarser cell averages more of the Source into the one reading that is
    // tested. On a photograph that changes nothing. On a flat graphic, whose hot side is thin
    // bright type, it is the difference between two colours and one: measured on the same Source,
    // the hot half is 9% of the painted cells at 6, 3% at 8, under 1% at 10, and by 12 the frame
    // comes back a single colour. So this look sits at the finest step the program offers.
    //
    // Contrast 1.8 is then the *cold* side's budget, not the hot one's. Past about 2 the shadows
    // fall into the Charset's opening space, and a cell that paints nothing paints no colour — the
    // second half of the pair thins from below while the cut stays exactly where it was. It is
    // Silkscreen's coverage argument arriving from the other end.
    settings: {
      charset: 'sharp',
      colorMode: 'infrared',
      resolution: 6,
      brightness: 1.0,
      contrast: 1.8,
      edgeGlyphs: false,
      dithering: 'none',
    },
  },
  {
    id: 'truecolor',
    name: 'Truecolor',
    // The one look that stylizes nothing — every other chip on the roster hands back the deck's own
    // colours or a flattened version of the Source's, and this one hands back the pixel. Silkscreen
    // is the neighbour and the difference is exact: `adaptive` answers with a lattice bin's mean,
    // `original` with the cell's own RGB. The Resolution follows from that, because at this Color
    // Mode the cell count *is* the fidelity — measured on a photograph, 6 resolves ~4800 distinct
    // colours where 8 resolves ~3400.
    //
    // Contrast is exactly 1, and that is a decision rather than a default left alone. A colour is
    // only ever seen through the glyph carrying it, so anything under 1 lifts the whole picture off
    // zero and a Source's dead ground stops being dead: at 0.95 the flat graphic comes back with
    // every one of its cells inked, near-black dots over what had been a clean field. At 1 black
    // maps to black whatever the brightness is, which is what makes the lift below safe to spend.
    //
    // That lift is Silkscreen's number for Silkscreen's reason — `ascii` opens on a space, and a
    // cell inside that first bucket contributes no colour to a look whose whole subject is the
    // Source's own. It takes a photograph from 78% of its cells painting to 83%. It stops at 1.3
    // because the ceiling is nearer than it looks: past about 1.5 the deck's own void clears the
    // first bucket and the flat Source fills in after all.
    settings: {
      charset: 'ascii',
      colorMode: 'original',
      resolution: 6,
      brightness: 1.3,
      contrast: 1.0,
      edgeGlyphs: false,
      dithering: 'none',
    },
  },
]
