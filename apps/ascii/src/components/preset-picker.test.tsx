import { act, render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { beforeEach, describe, expect, it, vi } from 'vitest'
import { PRESETS } from '../ascii/presets'
import type { ConversionSettings } from '../ascii/types'
import PresetPicker from './preset-picker'

// The derivation is `thumbnail.test.ts`' subject; happy-dom has no 2D context to run it with, so
// here it stands in for one — what this file holds is what the row does with what comes back.
vi.mock('../ascii/thumbnail', async (importOriginal) => ({
  ...(await importOriginal<typeof import('../ascii/thumbnail')>()),
  derivePresetThumbnails: vi.fn(() =>
    Object.fromEntries(PRESETS.map((preset) => [preset.id, `data:image/png;base64,${preset.id}`])),
  ),
}))

const { derivePresetThumbnails } = await import('../ascii/thumbnail')
const deriveMock = vi.mocked(derivePresetThumbnails)

function makeSourceImage(): HTMLImageElement {
  const img = new Image()
  Object.defineProperty(img, 'naturalWidth', { value: 400 })
  Object.defineProperty(img, 'naturalHeight', { value: 300 })
  return img
}

function renderPicker(props: Partial<React.ComponentProps<typeof PresetPicker>> = {}) {
  const onSelect = vi.fn()
  const view = render(
    <PresetPicker
      settings={PRESETS[0].settings}
      activePresetId={null}
      source={null}
      onSelect={onSelect}
      {...props}
    />,
  )
  return { onSelect, ...view }
}

beforeEach(() => {
  deriveMock.mockClear()
})

describe('PresetPicker', () => {
  it('renders a "presets" section label', () => {
    renderPicker()
    expect(screen.getByText(/^presets$/i)).toBeInTheDocument()
  })

  it('renders one button per preset name', () => {
    renderPicker()
    for (const preset of PRESETS) {
      expect(screen.getByRole('button', { name: preset.name })).toBeInTheDocument()
    }
  })

  it('clicking a preset button calls onSelect with the correct preset', async () => {
    const user = userEvent.setup()
    const { onSelect } = renderPicker()
    const preset = PRESETS[0]
    await user.click(screen.getByRole('button', { name: preset.name }))
    expect(onSelect).toHaveBeenCalledWith(preset)
  })

  it('active preset button has aria-pressed="true"', () => {
    const activePreset = PRESETS[1]
    renderPicker({ settings: activePreset.settings, activePresetId: activePreset.id })
    expect(screen.getByRole('button', { name: activePreset.name })).toHaveAttribute(
      'aria-pressed',
      'true',
    )
  })

  it('non-active preset buttons have aria-pressed="false"', () => {
    const activePreset = PRESETS[0]
    renderPicker({ settings: activePreset.settings, activePresetId: activePreset.id })
    for (const preset of PRESETS.filter((p) => p.id !== activePreset.id)) {
      expect(screen.getByRole('button', { name: preset.name })).toHaveAttribute(
        'aria-pressed',
        'false',
      )
    }
  })

  it('marks the active pill modified — visually with * and in its accessible name', () => {
    const activePreset = PRESETS[0]
    const diverged: ConversionSettings = { ...activePreset.settings, brightness: 1.9 }
    renderPicker({ settings: diverged, activePresetId: activePreset.id })
    const btn = screen.getByRole('button', { name: `${activePreset.name} (modified)` })
    expect(btn.querySelector('span.text-warning')?.textContent).toBe('*')
  })

  it('offers no revert chip when nothing has been applied', () => {
    renderPicker()
    expect(screen.queryByRole('button', { name: /revert/i })).not.toBeInTheDocument()
  })

  it('shows a revert chip while an applied suggestion still stands, and calls it back', async () => {
    const user = userEvent.setup()
    const onRevertSuggestion = vi.fn()
    renderPicker({ onRevertSuggestion })

    await user.click(screen.getByRole('button', { name: 'revert suggestion' }))
    expect(onRevertSuggestion).toHaveBeenCalledOnce()
  })

  it('does not mark modified when settings exactly match the active preset', () => {
    const activePreset = PRESETS[0]
    renderPicker({ settings: activePreset.settings, activePresetId: activePreset.id })
    const btn = screen.getByRole('button', { name: activePreset.name })
    expect(btn.textContent).not.toContain('*')
  })

  it('draws each preset on the loaded Source', () => {
    renderPicker({ source: makeSourceImage() })

    for (const preset of PRESETS) {
      const chip = screen.getByRole('button', { name: preset.name })
      expect(chip.querySelector('img')).toHaveAttribute('src', `data:image/png;base64,${preset.id}`)
    }
  })

  it('leaves the accessible name to the word — the picture is not part of it', () => {
    const activePreset = PRESETS[0]
    const diverged: ConversionSettings = { ...activePreset.settings, brightness: 1.9 }
    renderPicker({
      settings: diverged,
      activePresetId: activePreset.id,
      source: makeSourceImage(),
    })

    const chip = screen.getByRole('button', { name: `${activePreset.name} (modified)` })
    expect(chip.querySelector('img')).toHaveAttribute('alt', '')
  })

  it('falls back to the name alone when the pipeline derived nothing', () => {
    deriveMock.mockReturnValueOnce({})
    renderPicker({ source: makeSourceImage() })

    expect(document.querySelectorAll('img')).toHaveLength(0)
    for (const preset of PRESETS) {
      expect(screen.getByRole('button', { name: preset.name })).toBeInTheDocument()
    }
  })

  it('derives once per Source, not once per render', () => {
    const source = makeSourceImage()
    const { rerender } = renderPicker({ source })

    rerender(
      <PresetPicker
        settings={{ ...PRESETS[0].settings, brightness: 1.9 }}
        activePresetId={PRESETS[0].id}
        source={source}
        onSelect={vi.fn()}
      />,
    )

    expect(deriveMock).toHaveBeenCalledOnce()
  })

  it('remembers a Source Image across the tab being left and come back to', () => {
    const source = makeSourceImage()
    const { unmount } = renderPicker({ source })
    unmount()

    renderPicker({ source })

    // A Source Image is immutable for the session, so the second visit is the first one's answer.
    expect(deriveMock).toHaveBeenCalledOnce()
    expect(document.querySelectorAll('img')).toHaveLength(PRESETS.length)
  })

  it('re-derives when the Source itself changes', () => {
    const { rerender } = renderPicker({ source: makeSourceImage() })

    rerender(
      <PresetPicker
        settings={PRESETS[0].settings}
        activePresetId={null}
        source={makeSourceImage()}
        onSelect={vi.fn()}
      />,
    )

    expect(deriveMock).toHaveBeenCalledTimes(2)
  })

  it('answers a Live Source with no frame yet by waiting for one', () => {
    // What the derivation hands back for a Live Source that has decoded nothing to snapshot.
    deriveMock.mockReturnValueOnce({})
    const video = document.createElement('video')
    renderPicker({ source: video })
    expect(document.querySelectorAll('img')).toHaveLength(0)

    act(() => {
      video.dispatchEvent(new Event('loadeddata'))
    })

    expect(document.querySelectorAll('img')).toHaveLength(PRESETS.length)
    // Twice over the whole take — not once for each of the 15 frames a second the loop draws.
    expect(deriveMock).toHaveBeenCalledTimes(2)
  })

  it('keeps the row scrollable inside the Strip rather than spilling past its edge', () => {
    const { container } = renderPicker({ source: makeSourceImage() })

    // The fieldset's UA `min-inline-size: min-content` is what would push the chips past the
    // Strip's right edge instead of letting the row scroll.
    expect(container.querySelector('fieldset')).toHaveClass('min-w-0')
    expect(screen.getByRole('button', { name: PRESETS[0].name }).parentElement).toHaveClass(
      'overflow-x-auto',
    )
  })
})
