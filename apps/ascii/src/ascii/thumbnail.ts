// A Preset drawn on the Source it would be applied to, so the PRESETS row is browsed by look
// rather than by name (ADR 0015, ADR 0020 — the front door is a good result in one tap).
//
// There is no second conversion path here and no adjusted look: `renderFrame` runs the ordinary
// pipeline (ADR 0005) over each Preset's own ConversionSettings, untouched, so a thumbnail cannot
// advertise something the chip does not apply. What makes it cheap is the *box* — a fraction of the
// canvas' cells — and never a fraction of the settings.

import { resizeImage, SOURCE_SAMPLE_MAX_WIDTH } from './image-utils'
import { PRESETS } from './presets'
import { gridSize, monoFontFamily, renderFrame } from './render-frame'

/** The box a thumbnail is drawn in, in CSS pixels — the `<img>` the picker lays out. */
export const THUMBNAIL_WIDTH = 96
export const THUMBNAIL_HEIGHT = 60

/**
 * The thumbnail renders at twice its box and is drawn down into it, which is what makes it a
 * thumbnail *of the canvas* rather than a differently-configured canvas: every glyph keeps the size
 * the Preset's Resolution gives it, and the box simply holds twice as many — the picture as it
 * reads from across the room.
 *
 * Rendered 1:1 instead, the coarsest Preset on the roster would get five rows of characters and
 * advertise nothing.
 */
const THUMBNAIL_SUPERSAMPLE = 2

/**
 * The cell grid one thumbnail converts at. The row's whole cost is this, once per Preset —
 * `thumbnail.test.ts` holds it against a single canvas frame.
 */
export function thumbnailGrid(resolution: number): { cols: number; rows: number } {
  return gridSize(
    THUMBNAIL_WIDTH * THUMBNAIL_SUPERSAMPLE,
    THUMBNAIL_HEIGHT * THUMBNAIL_SUPERSAMPLE,
    resolution,
  )
}

/**
 * The still every conversion reads. A Source Image travels through the same `resizeImage` the
 * canvas samples it through, so both see one picture; a Live Source is frozen into a canvas of its
 * own here, and that freeze is the point — the loop runs at 15fps (ADR 0002), and one extra
 * conversion per Preset per frame is not what a row of chips is worth. It also keeps the chips
 * honest with each other: they advertise one instant rather than a run of consecutive ones.
 *
 * Returns `null` when there is nothing to read yet — a Live Source reports width 0 until its first
 * frame decodes, and a blank still would come back as a row of empty chips.
 */
function snapshotSource(source: HTMLImageElement | HTMLVideoElement): CanvasImageSource | null {
  if (!(source instanceof HTMLVideoElement)) {
    return source.naturalWidth > 0 ? resizeImage(source) : null
  }

  const { videoWidth, videoHeight } = source
  if (videoWidth < 1 || videoHeight < 1) {
    return null
  }
  const scale = Math.min(1, SOURCE_SAMPLE_MAX_WIDTH / videoWidth)
  const still = document.createElement('canvas')
  still.width = Math.round(videoWidth * scale)
  still.height = Math.round(videoHeight * scale)
  const ctx = still.getContext('2d')
  if (!ctx) {
    return null
  }
  ctx.drawImage(source, 0, 0, still.width, still.height)
  return still
}

/**
 * Every Preset as it would look on this Source, as data URLs keyed by Preset id.
 *
 * A Preset the pipeline refused to render is left out rather than given a placeholder: the chip
 * then reads as the name it has always been, which is the state this whole feature improves on and
 * a correct answer where a canvas is unavailable.
 */
export function derivePresetThumbnails(
  source: HTMLImageElement | HTMLVideoElement,
): Record<string, string> {
  const still = snapshotSource(source)
  if (!still) {
    return {}
  }

  // One pair of canvases for the whole row: `paintFrame` fills the visible one before it draws a
  // glyph, so no Preset can leave anything behind for the next, and `renderFrame` resizes the
  // hidden sampling one itself.
  const canvas = document.createElement('canvas')
  canvas.width = THUMBNAIL_WIDTH * THUMBNAIL_SUPERSAMPLE
  canvas.height = THUMBNAIL_HEIGHT * THUMBNAIL_SUPERSAMPLE
  const hidden = document.createElement('canvas')
  const fontFamily = monoFontFamily()

  const thumbnails: Record<string, string> = {}
  for (const preset of PRESETS) {
    if (renderFrame(still, canvas, hidden, preset.settings, fontFamily)) {
      thumbnails[preset.id] = canvas.toDataURL()
    }
  }
  return thumbnails
}
