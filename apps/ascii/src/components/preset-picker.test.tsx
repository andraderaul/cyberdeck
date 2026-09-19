import { act, render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { beforeEach, describe, expect, it, vi } from 'vitest'
import { PRESETS } from '../ascii/presets'
import type { ConversionSettings } from '../ascii/types'
import { DEFAULT_SETTINGS } from '../ascii/types'
import PresetPicker from './preset-picker'

// The derivation is `thumbnail.test.ts`' subject; happy-dom has no 2D context to run it with, so
// here it stands in for one — what this file holds is what the row does with what comes back.
vi.mock('../ascii/thumbnail', async (importOriginal) => ({
  ...(await importOriginal<typeof import('../ascii/thumbnail')>()),
  derivePresetThumbnails: vi.fn(async () =>
    Object.fromEntries(PRESETS.map((preset) => [preset.id, `data:image/png;base64,${preset.id}`])),
  ),
}))

const { derivePresetThumbnails } = await import('../ascii/thumbnail')
const deriveMock = vi.mocked(derivePresetThumbnails)

// One off-default value per axis, spelled as a full ConversionSettings rather than a loose record:
// a new axis is a type error here until it is given one, which is the compile-time half of the
// run-time sweep below.
const OFF_DEFAULT: ConversionSettings = {
  resolution: 20,
  brightness: 1.5,
  contrast: 2.0,
  colorMode: 'acid',
  charset: 'box',
  edgeGlyphs: true,
  dithering: 'bayer',
}

function makeSourceImage(): HTMLImageElement {
  const img = new Image()
  Object.defineProperty(img, 'naturalWidth', { value: 400 })
  Object.defineProperty(img, 'naturalHeight', { value: 300 })
  return img
}

function renderPicker(props: Partial<React.ComponentProps<typeof PresetPicker>> = {}) {
  const onSelect = vi.fn()
  const onReset = vi.fn()
  const view = render(
    <PresetPicker
      settings={PRESETS[0].settings}
      activePresetId={null}
      source={null}
      onSelect={onSelect}
      onReset={onReset}
      {...props}
    />,
  )
  return { onSelect, onReset, ...view }
}

// The derivation runs through a FrameRunner now (ADR 0002), so the row's pictures land a microtask
// after the render that asked for them rather than inside it.
async function flushThumbnails(): Promise<void> {
  await act(async () => {})
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

  it('shows a revert chip while a replaced look still stands, and calls it back', async () => {
    const user = userEvent.setup()
    const onRevert = vi.fn()
    renderPicker({ onRevert })

    await user.click(screen.getByRole('button', { name: 'revert to the previous look' }))
    expect(onRevert).toHaveBeenCalledOnce()
  })

  it('calls back the global reset, and puts it ahead of the revert offer it raises', async () => {
    const user = userEvent.setup()
    const { onReset } = renderPicker({ onRevert: vi.fn() })

    const reset = screen.getByRole('button', { name: 'reset to defaults' })
    await user.click(reset)
    expect(onReset).toHaveBeenCalledOnce()

    // Leftmost, so the revert offer the press raises lands to its right rather than under the
    // pointer that just pressed it.
    expect(reset.nextElementSibling).toBe(
      screen.getByRole('button', { name: 'revert to the previous look' }),
    )
  })

  it('keeps the global reset in place but unavailable once there is nothing left to reset', () => {
    renderPicker({ settings: DEFAULT_SETTINGS, activePresetId: null })
    expect(screen.getByRole('button', { name: /reset to defaults — unavailable/ })).toBeDisabled()
  })

  it('still offers the global reset for a Preset whose look is the default one', () => {
    // Half of what the control undoes is the selected chip, which no comparison of the axes sees.
    renderPicker({ settings: DEFAULT_SETTINGS, activePresetId: PRESETS[0].id })
    expect(screen.getByRole('button', { name: 'reset to defaults' })).toBeEnabled()
  })

  // `handleReset` assigns DEFAULT_SETTINGS wholesale, so "every axis returns" needs no test — the
  // assignment guarantees it. What the scope decides is the *availability*, and an axis missing
  // from it fails the other way: the control sits disabled, saying "already at its default", while
  // a non-default axis stands and nothing on screen offers a way back.
  describe.each(
    Object.keys(DEFAULT_SETTINGS) as (keyof ConversionSettings)[],
  )('with only %s off its default', (key) => {
    it('still offers the global reset', () => {
      renderPicker({ settings: { ...DEFAULT_SETTINGS, [key]: OFF_DEFAULT[key] } })
      expect(screen.getByRole('button', { name: 'reset to defaults' })).toBeEnabled()
    })
  })

  it('does not mark modified when settings exactly match the active preset', () => {
    const activePreset = PRESETS[0]
    renderPicker({ settings: activePreset.settings, activePresetId: activePreset.id })
    const btn = screen.getByRole('button', { name: activePreset.name })
    expect(btn.textContent).not.toContain('*')
  })

  it('draws each preset on the loaded Source', async () => {
    renderPicker({ source: makeSourceImage() })
    await flushThumbnails()

    for (const preset of PRESETS) {
      const chip = screen.getByRole('button', { name: preset.name })
      expect(chip.querySelector('img')).toHaveAttribute('src', `data:image/png;base64,${preset.id}`)
    }
  })

  it('leaves the accessible name to the word — the picture is not part of it', async () => {
    const activePreset = PRESETS[0]
    const diverged: ConversionSettings = { ...activePreset.settings, brightness: 1.9 }
    renderPicker({
      settings: diverged,
      activePresetId: activePreset.id,
      source: makeSourceImage(),
    })
    await flushThumbnails()

    const chip = screen.getByRole('button', { name: `${activePreset.name} (modified)` })
    expect(chip.querySelector('img')).toHaveAttribute('alt', '')
  })

  it('falls back to the name alone when the pipeline derived nothing', async () => {
    deriveMock.mockResolvedValueOnce({})
    renderPicker({ source: makeSourceImage() })
    await flushThumbnails()

    expect(document.querySelectorAll('img')).toHaveLength(0)
    for (const preset of PRESETS) {
      expect(screen.getByRole('button', { name: preset.name })).toBeInTheDocument()
    }
  })

  // Same answer as an empty derivation, and for the same reason: the chip reads as the name it was
  // before this feature existed. Not the canvas' ErrorBoundary — the Strip is that boundary's
  // sibling, so a re-throw here would take the whole program down over a row of decorations.
  it('falls back to the name alone when the derivation throws', async () => {
    deriveMock.mockRejectedValueOnce(new Error('no 2D context'))
    renderPicker({ source: makeSourceImage() })
    await flushThumbnails()

    expect(document.querySelectorAll('img')).toHaveLength(0)
    for (const preset of PRESETS) {
      expect(screen.getByRole('button', { name: preset.name })).toBeInTheDocument()
    }
  })

  it('derives once per Source, not once per render', async () => {
    const source = makeSourceImage()
    const { rerender } = renderPicker({ source })

    rerender(
      <PresetPicker
        settings={{ ...PRESETS[0].settings, brightness: 1.9 }}
        activePresetId={PRESETS[0].id}
        source={source}
        onSelect={vi.fn()}
        onReset={vi.fn()}
      />,
    )
    await flushThumbnails()

    expect(deriveMock).toHaveBeenCalledOnce()
  })

  it('remembers a Source Image across the tab being left and come back to', async () => {
    const source = makeSourceImage()
    const { unmount } = renderPicker({ source })
    await flushThumbnails()
    unmount()

    renderPicker({ source })
    await flushThumbnails()

    // A Source Image is immutable for the session, so the second visit is the first one's answer.
    expect(deriveMock).toHaveBeenCalledOnce()
    expect(document.querySelectorAll('img')).toHaveLength(PRESETS.length)
  })

  it('re-derives when the Source itself changes', async () => {
    const { rerender } = renderPicker({ source: makeSourceImage() })

    rerender(
      <PresetPicker
        settings={PRESETS[0].settings}
        activePresetId={null}
        source={makeSourceImage()}
        onSelect={vi.fn()}
        onReset={vi.fn()}
      />,
    )
    await flushThumbnails()

    expect(deriveMock).toHaveBeenCalledTimes(2)
  })

  it('answers a Live Source with no frame yet by waiting for one', async () => {
    // What the derivation hands back for a Live Source that has decoded nothing to snapshot.
    deriveMock.mockResolvedValueOnce({})
    const video = document.createElement('video')
    renderPicker({ source: video })
    await flushThumbnails()
    expect(document.querySelectorAll('img')).toHaveLength(0)

    video.dispatchEvent(new Event('loadeddata'))
    await flushThumbnails()

    expect(document.querySelectorAll('img')).toHaveLength(PRESETS.length)
    // Twice over the whole take — not once for each of the 15 frames a second the loop draws.
    expect(deriveMock).toHaveBeenCalledTimes(2)
  })

  it('keeps the row scrollable inside the Strip rather than spilling past its edge', async () => {
    const { container } = renderPicker({ source: makeSourceImage() })
    await flushThumbnails()

    // The fieldset's UA `min-inline-size: min-content` is what would push the chips past the
    // Strip's right edge instead of letting the row scroll.
    expect(container.querySelector('fieldset')).toHaveClass('min-w-0')
    expect(screen.getByRole('button', { name: PRESETS[0].name }).parentElement).toHaveClass(
      'overflow-x-auto',
    )
  })
})
