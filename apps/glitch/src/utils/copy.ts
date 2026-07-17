function canvasToPngBlob(canvas: HTMLCanvasElement): Promise<Blob> {
  return new Promise((resolve, reject) => {
    canvas.toBlob((blob) => {
      if (blob) {
        resolve(blob)
        return
      }
      reject(new Error('canvas produced no PNG blob'))
    }, 'image/png')
  })
}

/**
 * Whether the browser can put an image on the clipboard at all — a Copy that fails this is
 * unrecoverable, not worth a retry, so the shell tells those users to Export instead.
 */
export function isClipboardImageSupported(): boolean {
  return typeof ClipboardItem !== 'undefined' && typeof navigator.clipboard?.write === 'function'
}

/**
 * Copy: writes the canvas out as a PNG the user can paste elsewhere. Reads the canvas as-is, the
 * same act as PNG Export on a different destination.
 */
export async function copyCanvasToClipboard(canvas: HTMLCanvasElement): Promise<void> {
  if (!isClipboardImageSupported()) {
    throw new Error('clipboard image write unsupported')
  }
  // Safari resolves the write against the gesture that constructed the ClipboardItem, so the item
  // gets the pending blob promise — awaiting the blob first loses the gesture and the write is
  // rejected. Do not simplify to `await canvasToPngBlob(canvas)`.
  await navigator.clipboard.write([new ClipboardItem({ 'image/png': canvasToPngBlob(canvas) })])
}
