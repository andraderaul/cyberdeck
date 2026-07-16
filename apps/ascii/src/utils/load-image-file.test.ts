import { beforeEach, describe, expect, it, vi } from 'vitest'
import { loadImageFile } from './load-image-file'

let lastImg: { onload: (() => void) | null; onerror: (() => void) | null; src: string } | null =
  null

class MockImage {
  onload: (() => void) | null = null
  onerror: (() => void) | null = null
  src = ''
  constructor() {
    lastImg = this
  }
}

beforeEach(() => {
  lastImg = null
  vi.stubGlobal('Image', MockImage)
  vi.stubGlobal('URL', { createObjectURL: vi.fn(() => 'blob:mock'), revokeObjectURL: vi.fn() })
})

describe('loadImageFile', () => {
  it('calls onLoad with the HTMLImageElement when the image loads', () => {
    const onLoad = vi.fn()
    loadImageFile(new File(['x'], 'a.jpg', { type: 'image/jpeg' }), onLoad)
    lastImg?.onload?.()
    expect(onLoad).toHaveBeenCalledWith(lastImg)
  })

  it('revokes the object URL after successful load', () => {
    loadImageFile(new File(['x'], 'a.jpg', { type: 'image/jpeg' }), vi.fn())
    lastImg?.onload?.()
    expect(URL.revokeObjectURL).toHaveBeenCalledWith('blob:mock')
  })

  it('calls onError and revokes the URL when the image fails to load', () => {
    const onError = vi.fn()
    loadImageFile(new File(['x'], 'bad.jpg', { type: 'image/jpeg' }), vi.fn(), onError)
    lastImg?.onerror?.()
    expect(onError).toHaveBeenCalledWith('Failed to load image')
    expect(URL.revokeObjectURL).toHaveBeenCalledWith('blob:mock')
  })

  it('does nothing for non-image files', () => {
    const onLoad = vi.fn()
    loadImageFile(new File(['x'], 'doc.pdf', { type: 'application/pdf' }), onLoad)
    expect(lastImg).toBeNull()
    expect(onLoad).not.toHaveBeenCalled()
  })
})
