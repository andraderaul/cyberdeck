import { beforeEach, describe, expect, it, vi } from 'vitest'
import { copyCanvasToClipboard } from './copy'

class FakeClipboardItem {
  constructor(readonly items: Record<string, Promise<Blob> | Blob>) {}
}

const write = vi.fn((_items: FakeClipboardItem[]) => Promise.resolve())

function canvasYielding(blob: Blob | null): HTMLCanvasElement {
  const canvas = document.createElement('canvas')
  canvas.toBlob = (callback: BlobCallback) => callback(blob)
  return canvas
}

const pngBlob = () => new Blob(['x'], { type: 'image/png' })

beforeEach(() => {
  vi.clearAllMocks()
  vi.stubGlobal('ClipboardItem', FakeClipboardItem)
  Object.defineProperty(navigator, 'clipboard', {
    value: { write },
    writable: true,
    configurable: true,
  })
})

describe('copyCanvasToClipboard', () => {
  it('writes the canvas to the clipboard as a PNG', async () => {
    const blob = pngBlob()

    await copyCanvasToClipboard(canvasYielding(blob))

    expect(write).toHaveBeenCalledTimes(1)
    const [[items]] = write.mock.calls
    expect(items).toHaveLength(1)
    expect(items[0]).toBeInstanceOf(FakeClipboardItem)
    await expect(items[0].items['image/png']).resolves.toBe(blob)
  })

  // Safari resolves the write against the gesture that built the ClipboardItem, so the item must
  // be handed the pending blob promise rather than an awaited blob. Do not simplify this away.
  it('hands the ClipboardItem a pending blob rather than awaiting first', async () => {
    let settle: (blob: Blob) => void = () => {}
    const canvas = document.createElement('canvas')
    canvas.toBlob = (callback: BlobCallback) => {
      settle = callback
    }

    const copying = copyCanvasToClipboard(canvas)
    await Promise.resolve()

    expect(write).toHaveBeenCalledTimes(1)
    settle(pngBlob())
    await expect(copying).resolves.toBeUndefined()
  })

  it('rejects when the canvas yields no PNG', async () => {
    // The real ClipboardItem awaits the blob it was handed, so the fake must too for the
    // rejection to reach the caller
    write.mockImplementationOnce(async (items) => {
      await items[0].items['image/png']
    })

    await expect(copyCanvasToClipboard(canvasYielding(null))).rejects.toThrow()
  })

  it('rejects when the clipboard rejects the write', async () => {
    write.mockRejectedValueOnce(new Error('denied'))

    await expect(copyCanvasToClipboard(canvasYielding(pngBlob()))).rejects.toThrow('denied')
  })

  it('rejects when the browser cannot write images to the clipboard', async () => {
    vi.stubGlobal('ClipboardItem', undefined)

    await expect(copyCanvasToClipboard(canvasYielding(pngBlob()))).rejects.toThrow()
    expect(write).not.toHaveBeenCalled()
  })
})
