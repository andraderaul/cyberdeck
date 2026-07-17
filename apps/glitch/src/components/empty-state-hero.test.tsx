import { act, fireEvent, render, screen } from '@testing-library/react'
import { beforeEach, describe, expect, it, vi } from 'vitest'
import EmptyStateHero from './empty-state-hero'
import { ToastProvider } from './toast-provider'

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

function makeFile(name: string, type: string) {
  return new File(['x'], name, { type })
}

function renderHero(props: Partial<Parameters<typeof EmptyStateHero>[0]> = {}) {
  render(
    <ToastProvider>
      <EmptyStateHero onImage={vi.fn()} onUseWebcam={vi.fn()} {...props} />
    </ToastProvider>,
  )
}

describe('EmptyStateHero', () => {
  beforeEach(() => {
    lastImg = null
    vi.stubGlobal('Image', MockImage)
    vi.stubGlobal('URL', { createObjectURL: vi.fn(() => 'blob:mock'), revokeObjectURL: vi.fn() })
  })

  // Both ways in must be present and reachable — the empty state is where the Source is chosen.
  it('offers both the upload drop zone and the webcam entry point', () => {
    renderHero()

    expect(screen.getByText(/drag & drop/i)).toBeInTheDocument()
    expect(screen.getByRole('button', { name: /use webcam/i })).toBeInTheDocument()
  })

  it('goes to the Live Source when the webcam entry point is clicked', () => {
    const onUseWebcam = vi.fn()
    renderHero({ onUseWebcam })

    fireEvent.click(screen.getByRole('button', { name: /use webcam/i }))

    expect(onUseWebcam).toHaveBeenCalledOnce()
  })

  it('hands up a Source Image once a valid image is dropped', () => {
    const onImage = vi.fn()
    renderHero({ onImage })

    const dropLabel = screen.getByText(/drag & drop/i).closest('label')
    if (!dropLabel) {
      throw new Error('drop zone not found')
    }
    fireEvent.drop(dropLabel, {
      dataTransfer: { files: [makeFile('photo.jpg', 'image/jpeg')] },
    })
    act(() => {
      lastImg?.onload?.()
    })

    expect(onImage).toHaveBeenCalledOnce()
    expect(onImage.mock.calls[0][0]).toBeInstanceOf(MockImage)
  })

  it('ignores non-image files', () => {
    const onImage = vi.fn()
    renderHero({ onImage })

    const dropLabel = screen.getByText(/drag & drop/i).closest('label')
    if (!dropLabel) {
      throw new Error('drop zone not found')
    }
    fireEvent.drop(dropLabel, {
      dataTransfer: { files: [makeFile('doc.pdf', 'application/pdf')] },
    })

    expect(onImage).not.toHaveBeenCalled()
  })

  // ADR 0006: an image that fails to load is an operational failure, so it surfaces as a toast.
  it('surfaces a failed image load as a toast', () => {
    renderHero()

    const dropLabel = screen.getByText(/drag & drop/i).closest('label')
    if (!dropLabel) {
      throw new Error('drop zone not found')
    }
    fireEvent.drop(dropLabel, {
      dataTransfer: { files: [makeFile('bad.jpg', 'image/jpeg')] },
    })
    act(() => {
      lastImg?.onerror?.()
    })

    expect(screen.getByText(/failed to load image/i)).toBeInTheDocument()
  })
})
