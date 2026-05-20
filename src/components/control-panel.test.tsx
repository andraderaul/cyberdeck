import { fireEvent, render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { describe, expect, it, vi } from 'vitest'
import { PRESETS } from '../ascii/presets'
import type { ConversionSettings } from '../ascii/types'
import { CHARSET_MAPS, COLOR_MODES } from '../ascii/types'
import ControlPanel from './control-panel'

const DEFAULT_SETTINGS: ConversionSettings = {
  resolution: 12,
  colorMode: 'matrix',
  charset: 'classic',
  brightness: 1.0,
  contrast: 1.0,
}

function renderPanel(onChange = vi.fn()) {
  render(<ControlPanel settings={DEFAULT_SETTINGS} onChange={onChange} />)
  return { onChange }
}

describe('ControlPanel', () => {
  it('calls onChange with resolution patch when resolution slider changes', () => {
    const { onChange } = renderPanel()

    fireEvent.change(screen.getByLabelText(/resolution/i), { target: { value: '16' } })

    expect(onChange).toHaveBeenCalledWith({ resolution: 16 })
  })

  it('calls onChange with colorMode patch when a color mode button is clicked', async () => {
    const user = userEvent.setup()
    const { onChange } = renderPanel()

    await user.click(screen.getByRole('button', { name: 'neon' }))

    expect(onChange).toHaveBeenCalledWith({ colorMode: 'neon' })
  })

  it('calls onChange with charset patch when a charset button is clicked', async () => {
    const user = userEvent.setup()
    const { onChange } = renderPanel()

    await user.click(screen.getByRole('button', { name: 'sharp' }))

    expect(onChange).toHaveBeenCalledWith({ charset: 'sharp' })
  })

  it('calls onChange with brightness patch when brightness slider changes', () => {
    const { onChange } = renderPanel()

    fireEvent.change(screen.getByLabelText(/brightness/i), { target: { value: '1.5' } })

    expect(onChange).toHaveBeenCalledWith({ brightness: 1.5 })
  })

  it('calls onChange with contrast patch when contrast slider changes', () => {
    const { onChange } = renderPanel()

    fireEvent.change(screen.getByLabelText(/contrast/i), { target: { value: '2.0' } })

    expect(onChange).toHaveBeenCalledWith({ contrast: 2 })
  })

  // Issue #4: Grouped Charset picker
  describe('Charset grouping', () => {
    it('renders charset category headers', () => {
      renderPanel()
      expect(screen.getByText(/ascii gradient/i)).toBeInTheDocument()
      expect(screen.getByText(/unicode blocks/i)).toBeInTheDocument()
      expect(screen.getByText(/writing systems/i)).toBeInTheDocument()
      expect(screen.getByText(/shapes/i)).toBeInTheDocument()
      expect(screen.getByText(/specialized/i)).toBeInTheDocument()
    })

    it('every charset chip includes the last char of its CHARSET_MAPS entry (covers full ramp)', () => {
      renderPanel()
      for (const [charset, map] of Object.entries(CHARSET_MAPS)) {
        const btn = screen.getByRole('button', { name: charset })
        const chars = [...map]
        const lastChar = chars[chars.length - 1] ?? ''
        expect(btn.textContent).toContain(lastChar)
      }
    })

    it('all 12 charset chips are rendered', () => {
      renderPanel()
      const charsets = Object.keys(CHARSET_MAPS)
      for (const charset of charsets) {
        expect(screen.getByRole('button', { name: charset })).toBeInTheDocument()
      }
    })
  })

  // Issue #5: Color Mode swatch picker
  describe('Color Mode swatches', () => {
    it('renders a [data-swatch] for every color mode', () => {
      renderPanel()
      for (const mode of COLOR_MODES) {
        const btn = screen.getByRole('button', { name: mode })
        expect(btn.querySelector('[data-swatch]')).toBeInTheDocument()
      }
    })

    it('single-color modes render a swatch with solid background', () => {
      renderPanel()
      const matrixBtn = screen.getByRole('button', { name: 'matrix' })
      const swatch = matrixBtn.querySelector('[data-swatch]') as HTMLElement
      expect(swatch.style.background || swatch.style.backgroundColor).toBeTruthy()
    })

    it('gradient color modes render a swatch with gradient background', () => {
      renderPanel()
      for (const mode of ['synthwave', 'matrix-dual', 'acid', 'infrared']) {
        const swatch = screen
          .getByRole('button', { name: mode })
          .querySelector('[data-swatch]') as HTMLElement
        expect(swatch.style.background).toContain('gradient')
      }
    })

    it('original color mode renders a multicolor gradient swatch', () => {
      renderPanel()
      const swatch = screen
        .getByRole('button', { name: 'original' })
        .querySelector('[data-swatch]') as HTMLElement
      expect(swatch.style.background).toContain('gradient')
    })
  })

  // Issue #19: Named presets
  describe('Preset pills', () => {
    it('renders one button per preset name', () => {
      renderPanel()
      for (const preset of PRESETS) {
        expect(screen.getByRole('button', { name: preset.name })).toBeInTheDocument()
      }
    })

    it('clicking a preset button calls onPresetSelect with the correct preset', async () => {
      const user = userEvent.setup()
      const onPresetSelect = vi.fn()
      render(
        <ControlPanel
          settings={DEFAULT_SETTINGS}
          onChange={vi.fn()}
          activePresetId={null}
          onPresetSelect={onPresetSelect}
        />,
      )
      const preset = PRESETS[0]
      await user.click(screen.getByRole('button', { name: preset.name }))
      expect(onPresetSelect).toHaveBeenCalledWith(preset)
    })

    it('active preset button has aria-pressed="true"', () => {
      const activePreset = PRESETS[1]
      render(
        <ControlPanel
          settings={activePreset.settings}
          onChange={vi.fn()}
          activePresetId={activePreset.id}
          onPresetSelect={vi.fn()}
        />,
      )
      const btn = screen.getByRole('button', { name: activePreset.name })
      expect(btn).toHaveAttribute('aria-pressed', 'true')
    })

    it('non-active preset buttons have aria-pressed="false"', () => {
      const activePreset = PRESETS[0]
      render(
        <ControlPanel
          settings={activePreset.settings}
          onChange={vi.fn()}
          activePresetId={activePreset.id}
          onPresetSelect={vi.fn()}
        />,
      )
      for (const preset of PRESETS.filter((p) => p.id !== activePreset.id)) {
        const btn = screen.getByRole('button', { name: preset.name })
        expect(btn).toHaveAttribute('aria-pressed', 'false')
      }
    })

    it('shows modified dot (·) on active pill when settings diverge from preset', () => {
      const activePreset = PRESETS[0]
      const divergedSettings: ConversionSettings = { ...activePreset.settings, brightness: 1.9 }
      render(
        <ControlPanel
          settings={divergedSettings}
          onChange={vi.fn()}
          activePresetId={activePreset.id}
          onPresetSelect={vi.fn()}
        />,
      )
      const btn = screen.getByRole('button', { name: new RegExp(`${activePreset.name}`) })
      expect(btn.textContent).toContain('·')
    })

    it('does not show modified dot when settings exactly match the active preset', () => {
      const activePreset = PRESETS[0]
      render(
        <ControlPanel
          settings={activePreset.settings}
          onChange={vi.fn()}
          activePresetId={activePreset.id}
          onPresetSelect={vi.fn()}
        />,
      )
      const btn = screen.getByRole('button', { name: activePreset.name })
      expect(btn.textContent).not.toContain('·')
    })
  })
})
