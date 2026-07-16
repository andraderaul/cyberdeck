import { describe, expect, it, vi } from 'vitest'

describe('resizeImage', () => {
  it('returns the same image when width is within limit', async () => {
    const { resizeImage } = await import('./image-utils')
    const img = { naturalWidth: 400, naturalHeight: 300 } as HTMLImageElement
    expect(resizeImage(img)).toBe(img)
  })

  it('returns the same image at exactly the limit', async () => {
    const { resizeImage } = await import('./image-utils')
    const img = { naturalWidth: 800, naturalHeight: 600 } as HTMLImageElement
    expect(resizeImage(img)).toBe(img)
  })

  it('resizes image when width exceeds 800px', async () => {
    const mockCtx = { drawImage: vi.fn() }
    const mockCanvas = {
      width: 0,
      height: 0,
      getContext: vi.fn(() => mockCtx),
      toDataURL: vi.fn(() => 'data:image/png;base64,fake'),
    }
    vi.stubGlobal('document', {
      createElement: vi.fn(() => mockCanvas),
    })

    const { resizeImage } = await import('./image-utils')
    const img = { naturalWidth: 1600, naturalHeight: 900 } as HTMLImageElement

    const result = resizeImage(img)
    expect(result).not.toBe(img)
    expect(mockCanvas.width).toBe(800)
    expect(mockCanvas.height).toBe(450)

    vi.unstubAllGlobals()
  })

  it('returns the canvas directly — no async Image decode (regression: all-black bug)', async () => {
    const mockCtx = { drawImage: vi.fn() }
    const mockCanvas = {
      width: 0,
      height: 0,
      getContext: vi.fn(() => mockCtx),
      toDataURL: vi.fn(),
    }
    vi.stubGlobal('document', { createElement: vi.fn(() => mockCanvas) })
    const ImageSpy = vi.fn()
    vi.stubGlobal('Image', ImageSpy)

    const { resizeImage } = await import('./image-utils')
    const img = { naturalWidth: 1600, naturalHeight: 900 } as HTMLImageElement

    const result = resizeImage(img)

    expect(result).toBe(mockCanvas)
    expect(ImageSpy).not.toHaveBeenCalled()
    expect(mockCanvas.toDataURL).not.toHaveBeenCalled()

    vi.unstubAllGlobals()
  })
})
