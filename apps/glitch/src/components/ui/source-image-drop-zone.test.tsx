import { fireEvent, render, screen } from '@testing-library/react'
import { beforeEach, describe, expect, it, vi } from 'vitest'

vi.mock('../../utils/load-image-file', () => ({
  loadImageFile: vi.fn(),
}))

vi.mock('../../utils/device', () => ({
  isTouchDevice: false,
}))

import { loadImageFile } from '../../utils/load-image-file'
import SourceImageDropZone from './source-image-drop-zone'

const mockLoadImageFile = vi.mocked(loadImageFile)

const baseProps = {
  size: 'sm' as const,
  onImage: vi.fn(),
  onError: vi.fn(),
}

beforeEach(() => vi.clearAllMocks())

describe('SourceImageDropZone', () => {
  // Behavior 1: label and input are linked via matching htmlFor/id
  it('links label to file input via matching htmlFor and id', () => {
    render(<SourceImageDropZone {...baseProps} />)
    const fileInput = document.querySelector('input[type="file"]') as HTMLInputElement
    expect(fileInput).not.toBeNull()
    const label = document.querySelector('label')
    expect(label).not.toBeNull()
    expect(label?.htmlFor).toBe(fileInput?.id)
    expect(fileInput?.id).not.toBe('')
  })

  // Behavior 2: file input accepts the correct image types
  it('accepts jpeg, png, and webp image types only', () => {
    render(<SourceImageDropZone {...baseProps} />)
    const fileInput = document.querySelector('input[type="file"]') as HTMLInputElement
    expect(fileInput.accept).toBe('image/jpeg,image/png,image/webp')
  })

  // Behavior 3: calls loadImageFile (→ onImage/onError) when file is selected via input
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

  // Behavior 4: applies size=sm visual tokens
  it('applies text-lg and min-h-[120px] for size="sm"', () => {
    render(<SourceImageDropZone {...baseProps} size="sm" />)
    const label = document.querySelector('label') as HTMLElement
    expect(label.className).toContain('min-h-[120px]')
    expect(label.className).toContain('p-xl')
    const icon = screen.getByText('⬆')
    expect(icon.className).toContain('text-lg')
  })

  // Behavior 5: applies size=lg visual tokens
  it('applies text-3xl and min-h-[160px] for size="lg"', () => {
    render(<SourceImageDropZone {...baseProps} size="lg" />)
    const label = document.querySelector('label') as HTMLElement
    expect(label.className).toContain('min-h-[160px]')
    const icon = screen.getByText('⬆')
    expect(icon.className).toContain('text-3xl')
  })

  // Behavior 6: drag-over adds active border/bg classes
  it('shows drag-active styles on dragover and removes them on dragleave', () => {
    render(<SourceImageDropZone {...baseProps} />)
    const label = document.querySelector('label') as HTMLElement
    expect(label.className).not.toContain('border-violet')

    fireEvent.dragOver(label, { preventDefault: () => {} })
    expect(label.className).toContain('border-violet')
    expect(label.className).toContain('bg-accent-ghost')

    fireEvent.dragLeave(label)
    expect(label.className).not.toContain('border-violet')
    expect(label.className).not.toContain('bg-accent-ghost')
  })

  // Behavior 7: drop calls loadImageFile with the dropped file
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

  // Behavior 8: renders hint text
  it('renders the jpg · png · webp hint text', () => {
    render(<SourceImageDropZone {...baseProps} />)
    expect(screen.getByText('jpg · png · webp')).toBeInTheDocument()
  })

  // Behavior 9: two instances on the same page have distinct IDs (AC from issue #48)
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

  // Behavior 10: h-full applied so the label stretches in flex containers
  it('applies h-full so the label fills its flex parent', () => {
    render(<SourceImageDropZone {...baseProps} />)
    const label = document.querySelector('label') as HTMLElement
    expect(label.className).toContain('h-full')
  })
})
