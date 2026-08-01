import { fireEvent, render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { beforeEach, describe, expect, it, vi } from 'vitest'

vi.mock('../utils/load-image-file', () => ({
  loadImageFile: vi.fn(),
}))

vi.mock('../utils/device', () => ({
  isTouchDevice: false,
}))

import { loadImageFile } from '../utils/load-image-file'
import SourceImageDropZone from './source-image-drop-zone'

const mockLoadImageFile = vi.mocked(loadImageFile)

const baseProps = {
  size: 'sm' as const,
  onImage: vi.fn(),
  onError: vi.fn(),
}

beforeEach(() => vi.clearAllMocks())

describe('SourceImageDropZone', () => {
  // This is the whole Source Image entry point of the deck (ADR 0015). A `display: none` input is
  // neither focusable nor in the accessibility tree, and the label around it never takes focus
  // either, so hiding it that way left keyboard users with webcam as the only way in.
  describe('keyboard reach', () => {
    it('puts the file input in the tab order, carrying the zone’s words as its name', async () => {
      const user = userEvent.setup()
      render(<SourceImageDropZone {...baseProps} />)
      const fileInput = document.querySelector('input[type="file"]') as HTMLInputElement

      await user.tab()

      expect(fileInput).toHaveFocus()
      expect(fileInput).toHaveAccessibleName(/upload/i)
    })

    // The one that actually guards the regression. happy-dom does not model focusability through
    // `display: none`, so the tab test above passes against the broken markup too — only the class
    // says which of the two hiding techniques is in force.
    it('never hides the input from the accessibility tree', () => {
      render(<SourceImageDropZone {...baseProps} />)
      const fileInput = document.querySelector('input[type="file"]') as HTMLInputElement
      const classes = new Set(fileInput.className.split(/\s+/))

      // `sr-only` clips it to a pixel and leaves it reachable; `hidden` removes it outright.
      expect(classes).toContain('sr-only')
      expect(classes).not.toContain('hidden')
    })

    // Focus lands on an input clipped to one pixel, so the zone itself has to show it.
    it('shows focus on the zone rather than the clipped input', () => {
      render(<SourceImageDropZone {...baseProps} />)
      const label = document.querySelector('label') as HTMLElement
      expect(label.className).toContain('has-[:focus-visible]:border-accent')
    })
  })

  it('links label to file input via matching htmlFor and id', () => {
    render(<SourceImageDropZone {...baseProps} />)
    const fileInput = document.querySelector('input[type="file"]') as HTMLInputElement
    expect(fileInput).not.toBeNull()
    const label = document.querySelector('label')
    expect(label).not.toBeNull()
    expect(label?.htmlFor).toBe(fileInput?.id)
    expect(fileInput?.id).not.toBe('')
  })

  it('accepts jpeg, png, and webp image types only', () => {
    render(<SourceImageDropZone {...baseProps} />)
    const fileInput = document.querySelector('input[type="file"]') as HTMLInputElement
    expect(fileInput.accept).toBe('image/jpeg,image/png,image/webp')
  })

  it('calls loadImageFile with the selected file and callbacks on file input change', () => {
    const onImage = vi.fn()
    const onError = vi.fn()
    render(<SourceImageDropZone size="sm" onImage={onImage} onError={onError} />)
    const fileInput = document.querySelector('input[type="file"]') as HTMLInputElement
    const file = new File(['pixel'], 'photo.jpg', { type: 'image/jpeg' })
    Object.defineProperty(fileInput, 'files', { value: [file], configurable: true })
    fireEvent.change(fileInput)
    expect(mockLoadImageFile).toHaveBeenCalledOnce()
    expect(mockLoadImageFile).toHaveBeenCalledWith(file, onImage, onError)
  })

  it('applies text-lg and min-h-[120px] for size="sm"', () => {
    render(<SourceImageDropZone {...baseProps} size="sm" />)
    const label = document.querySelector('label') as HTMLElement
    expect(label.className).toContain('min-h-[120px]')
    expect(label.className).toContain('p-xl')
    const icon = screen.getByText('⬆')
    expect(icon.className).toContain('text-lg')
  })

  it('applies text-3xl and min-h-[160px] for size="lg"', () => {
    render(<SourceImageDropZone {...baseProps} size="lg" />)
    const label = document.querySelector('label') as HTMLElement
    expect(label.className).toContain('min-h-[160px]')
    const icon = screen.getByText('⬆')
    expect(icon.className).toContain('text-3xl')
  })

  it('shows drag-active styles on dragover and removes them on dragleave', () => {
    render(<SourceImageDropZone {...baseProps} />)
    const label = document.querySelector('label') as HTMLElement
    const classes = () => new Set(label.className.split(/\s+/))
    expect(classes()).not.toContain('border-accent')

    fireEvent.dragOver(label, { preventDefault: () => {} })
    expect(classes()).toContain('border-accent')
    expect(classes()).toContain('bg-accent-ghost')

    fireEvent.dragLeave(label)
    expect(classes()).not.toContain('border-accent')
    expect(classes()).not.toContain('bg-accent-ghost')
  })

  it('lights the border on hover while idle, matching the webcam panel beside it', () => {
    render(<SourceImageDropZone {...baseProps} />)
    const label = document.querySelector('label') as HTMLElement
    expect(label.className).toContain('hover:border-accent')

    fireEvent.dragOver(label, { preventDefault: () => {} })
    expect(label.className).not.toContain('hover:border-accent')
  })

  it('calls loadImageFile with dropped file on drop', () => {
    const onImage = vi.fn()
    const onError = vi.fn()
    render(<SourceImageDropZone size="sm" onImage={onImage} onError={onError} />)
    const label = document.querySelector('label') as HTMLElement
    const file = new File(['pixel'], 'drop.png', { type: 'image/png' })
    fireEvent.drop(label, {
      preventDefault: () => {},
      dataTransfer: { files: [file] },
    })
    expect(mockLoadImageFile).toHaveBeenCalledOnce()
    expect(mockLoadImageFile).toHaveBeenCalledWith(file, onImage, onError)
  })

  it('renders the jpg · png · webp hint text', () => {
    render(<SourceImageDropZone {...baseProps} />)
    expect(screen.getByText('jpg · png · webp')).toBeInTheDocument()
  })

  // AC from issue #48
  it('generates distinct IDs across two instances rendered together', () => {
    render(
      <>
        <SourceImageDropZone {...baseProps} />
        <SourceImageDropZone {...baseProps} />
      </>,
    )
    const inputs = document.querySelectorAll('input[type="file"]')
    expect(inputs).toHaveLength(2)
    expect((inputs[0] as HTMLInputElement).id).not.toBe((inputs[1] as HTMLInputElement).id)
  })

  it('applies h-full so the label fills its flex parent', () => {
    render(<SourceImageDropZone {...baseProps} />)
    const label = document.querySelector('label') as HTMLElement
    expect(label.className).toContain('h-full')
  })
})
