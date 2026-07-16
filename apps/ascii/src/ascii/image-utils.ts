const MAX_WIDTH = 800

export function resizeImage(img: HTMLImageElement): HTMLCanvasElement | HTMLImageElement {
  if (img.naturalWidth <= MAX_WIDTH) {
    return img
  }

  const ratio = MAX_WIDTH / img.naturalWidth
  const canvas = document.createElement('canvas')
  canvas.width = MAX_WIDTH
  canvas.height = Math.round(img.naturalHeight * ratio)
  const ctx = canvas.getContext('2d')
  if (!ctx) {
    return img
  }
  ctx.drawImage(img, 0, 0, canvas.width, canvas.height)

  return canvas
}
