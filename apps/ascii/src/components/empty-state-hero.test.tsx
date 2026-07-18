import { ToastProvider } from '@cyberdeck/deck-kit/ui'
import { act, fireEvent, render, screen } from '@testing-library/react'
import { beforeEach, describe, expect, it, vi } from 'vitest'
import EmptyStateHero from './empty-state-hero'

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
      <EmptyStateHero onImage={vi.fn()} onStartWebcam={vi.fn()} {...props} />
    </ToastProvider>,
  )
}

describe('EmptyStateHero', () => {
  beforeEach(() => {
    lastImg = null
    vi.stubGlobal('Image', MockImage)
    vi.stubGlobal('URL', { createObjectURL: vi.fn(() => 'blob:mock'), revokeObjectURL: vi.fn() })
  })

  it('renders upload drop zone and webcam CTA', () => {
    renderHero()
    expect(screen.getByText(/drag & drop/i)).toBeInTheDocument()
    expect(screen.getByRole('button', { name: /use webcam/i })).toBeInTheDocument()
  })

  it('calls onStartWebcam when webcam button is clicked', () => {
    const onStartWebcam = vi.fn()
    renderHero({ onStartWebcam })
    fireEvent.click(screen.getByRole('button', { name: /use webcam/i }))
    expect(onStartWebcam).toHaveBeenCalledOnce()
  })

  it('calls onImage when a valid image file is dropped onto the drop zone', () => {
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

  it('does not call onImage for non-image files', () => {
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

  it('shows a toast when a dropped image fails to load', () => {
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
