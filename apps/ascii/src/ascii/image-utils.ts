/**
 * The widest a Source is sampled from. Exported because a Live Source is frozen through the same
 * cap when the Preset thumbnails snapshot it — one number, so both Sources reach the pipeline
 * having been read at the same scale.
 */
export const SOURCE_SAMPLE_MAX_WIDTH = 800

export function resizeImage(img: HTMLImageElement): HTMLCanvasElement | HTMLImageElement {
  if (img.naturalWidth <= SOURCE_SAMPLE_MAX_WIDTH) {
    return img
  }

  const ratio = SOURCE_SAMPLE_MAX_WIDTH / img.naturalWidth
  const canvas = document.createElement('canvas')
  canvas.width = SOURCE_SAMPLE_MAX_WIDTH
  canvas.height = Math.round(img.naturalHeight * ratio)
  const ctx = canvas.getContext('2d')
  if (!ctx) {
    return img
  }
  ctx.drawImage(img, 0, 0, canvas.width, canvas.height)

  return canvas
}
