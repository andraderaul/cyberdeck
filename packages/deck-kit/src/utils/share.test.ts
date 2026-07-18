import { beforeEach, describe, expect, it, vi } from 'vitest'

const device = vi.hoisted(() => ({ isTouchDevice: false }))

vi.mock('./device', () => {
  const mod = {} as { isTouchDevice: boolean }
  Object.defineProperty(mod, 'isTouchDevice', {
    get: () => device.isTouchDevice,
    enumerable: true,
    configurable: true,
  })
  return mod
})

import { shareOrDownloadBlob } from './share'

describe('shareOrDownloadBlob', () => {
  const mockShare = vi.fn()
  const mockCanShare = vi.fn()
  const mockCreateObjectURL = vi.fn(() => 'blob:fake-url')
  const mockRevokeObjectURL = vi.fn()

  beforeEach(() => {
    vi.clearAllMocks()
    device.isTouchDevice = false

    URL.createObjectURL = mockCreateObjectURL
    URL.revokeObjectURL = mockRevokeObjectURL

    Object.defineProperty(navigator, 'canShare', {
      value: mockCanShare,
      writable: true,
      configurable: true,
    })
    Object.defineProperty(navigator, 'share', {
      value: mockShare,
      writable: true,
      configurable: true,
    })
  })

  it('triggers download on non-touch device regardless of canShare', async () => {
    device.isTouchDevice = false
    mockCanShare.mockReturnValue(true)
    mockShare.mockResolvedValue(undefined)

    await shareOrDownloadBlob(new Blob(['x'], { type: 'image/png' }), 'test.png')

    expect(mockCreateObjectURL).toHaveBeenCalled()
    expect(mockShare).not.toHaveBeenCalled()
  })

  it('triggers download on touch device when canShare is unavailable', async () => {
    device.isTouchDevice = true
    Object.defineProperty(navigator, 'canShare', {
      value: undefined,
      writable: true,
      configurable: true,
    })

    await shareOrDownloadBlob(new Blob(['x'], { type: 'image/png' }), 'test.png')

    expect(mockCreateObjectURL).toHaveBeenCalled()
    expect(mockShare).not.toHaveBeenCalled()
  })

  it('triggers download on touch device when canShare returns false', async () => {
    device.isTouchDevice = true
    mockCanShare.mockReturnValue(false)

    await shareOrDownloadBlob(new Blob(['x'], { type: 'image/png' }), 'test.png')

    expect(mockCreateObjectURL).toHaveBeenCalled()
    expect(mockShare).not.toHaveBeenCalled()
  })

  it('opens native share sheet on touch device when canShare is true', async () => {
    device.isTouchDevice = true
    mockCanShare.mockReturnValue(true)
    mockShare.mockResolvedValue(undefined)

    await shareOrDownloadBlob(new Blob(['x'], { type: 'image/png' }), 'ascii.png')

    expect(mockShare).toHaveBeenCalledWith({
      files: [expect.objectContaining({ name: 'ascii.png', type: 'image/png' })],
    })
    expect(mockCreateObjectURL).not.toHaveBeenCalled()
  })

  it('does not fall back to download when user dismisses the share sheet (AbortError)', async () => {
    device.isTouchDevice = true
    mockCanShare.mockReturnValue(true)
    const abortError = new Error('Aborted')
    abortError.name = 'AbortError'
    mockShare.mockRejectedValue(abortError)

    await shareOrDownloadBlob(new Blob(['x'], { type: 'image/png' }), 'test.png')

    expect(mockCreateObjectURL).not.toHaveBeenCalled()
  })

  it('falls back to download when share fails with an unexpected error', async () => {
    device.isTouchDevice = true
    mockCanShare.mockReturnValue(true)
    mockShare.mockRejectedValue(new Error('Share failed'))

    await shareOrDownloadBlob(new Blob(['x'], { type: 'image/png' }), 'test.png')

    expect(mockCreateObjectURL).toHaveBeenCalled()
  })
})
