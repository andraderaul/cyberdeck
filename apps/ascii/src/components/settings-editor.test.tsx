import { fireEvent, render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { describe, expect, it, vi } from 'vitest'
import type { ConversionSettings } from '../ascii/types'
import { CHARSET_MAPS, COLOR_MODES } from '../ascii/types'
import SettingsEditor from './settings-editor'

const DEFAULT_SETTINGS: ConversionSettings = {
  resolution: 12,
  colorMode: 'matrix',
  charset: 'classic',
  brightness: 1.0,
  contrast: 1.0,
}

function renderEditor(onChange = vi.fn()) {
  render(<SettingsEditor settings={DEFAULT_SETTINGS} onChange={onChange} />)
  return { onChange }
}

/** Puts a tool's control in the panel — the row only ever selects (ADR 0020). */
function focusTool(label: string) {
  fireEvent.click(screen.getByRole('button', { name: label }))
}

describe('SettingsEditor', () => {
  it('offers every ConversionSettings control as a tool chip', () => {
    renderEditor()

    for (const tool of ['charset', 'color mode', 'resolution', 'brightness', 'contrast']) {
      expect(screen.getByRole('button', { name: tool })).toBeInTheDocument()
    }
  })

  // Charset is the front of the row, so the tab opens on something rather than an empty panel.
  it('opens focused on the charset tool', () => {
    renderEditor()

    expect(screen.getByRole('button', { name: 'sharp' })).toBeInTheDocument()
  })

  it('swaps the panel to the tool that is tapped', () => {
    renderEditor()

    focusTool('color mode')

    expect(screen.getByRole('button', { name: 'neon' })).toBeInTheDocument()
    expect(screen.queryByRole('button', { name: 'sharp' })).not.toBeInTheDocument()
  })

  it('calls onChange with a resolution patch when the resolution slider changes', () => {
    const { onChange } = renderEditor()
    focusTool('resolution')

    fireEvent.change(screen.getByLabelText(/resolution/i), { target: { value: '16' } })

    expect(onChange).toHaveBeenCalledWith({ resolution: 16 })
  })

  it('calls onChange with a brightness patch when the brightness slider changes', () => {
    const { onChange } = renderEditor()
    focusTool('brightness')

    fireEvent.change(screen.getByLabelText(/brightness/i), { target: { value: '1.5' } })

    expect(onChange).toHaveBeenCalledWith({ brightness: 1.5 })
  })

  it('calls onChange with a contrast patch when the contrast slider changes', () => {
    const { onChange } = renderEditor()
    focusTool('contrast')

    fireEvent.change(screen.getByLabelText(/contrast/i), { target: { value: '2.0' } })

    expect(onChange).toHaveBeenCalledWith({ contrast: 2 })
  })

  it('calls onChange with a colorMode patch when a color mode chip is clicked', async () => {
    const user = userEvent.setup()
    const { onChange } = renderEditor()
    focusTool('color mode')

    await user.click(screen.getByRole('button', { name: 'neon' }))

    expect(onChange).toHaveBeenCalledWith({ colorMode: 'neon' })
  })

  it('calls onChange with a charset patch when a charset chip is clicked', async () => {
    const user = userEvent.setup()
    const { onChange } = renderEditor()

    await user.click(screen.getByRole('button', { name: 'sharp' }))

    expect(onChange).toHaveBeenCalledWith({ charset: 'sharp' })
  })

  // The three sliders are siblings: at sm the whole group shows at once, so they share one markup
  // tree and CSS decides the density. `hidden` keeps the off-density ones out of the a11y tree too.
  describe('adaptive density (ADR 0020)', () => {
    it('keeps the focused slider visible at both densities', () => {
      renderEditor()

      focusTool('brightness')

      expect(document.querySelector('[data-tool="brightness"]')).toHaveClass('block')
    })

    it('holds the sibling sliders back until sm, where the group reads at once', () => {
      renderEditor()

      focusTool('brightness')

      const contrast = document.querySelector('[data-tool="contrast"]')
      expect(contrast?.className).toContain('hidden')
      expect(contrast?.className).toContain('sm:block')
    })

    it('hides the sliders outright while a chip group is focused', () => {
      renderEditor()

      focusTool('charset')

      const contrast = document.querySelector('[data-tool="contrast"]')
      expect(contrast?.className).toContain('hidden')
      expect(contrast?.className).not.toContain('sm:block')
    })
  })

  describe('Charset grouping', () => {
    it('renders charset category headers', () => {
      renderEditor()

      for (const label of [
        /ascii gradient/i,
        /unicode blocks/i,
        /writing systems/i,
        /shapes/i,
        /specialized/i,
      ]) {
        expect(screen.getByText(label)).toBeInTheDocument()
      }
    })

    it('every charset chip includes the last char of its CHARSET_MAPS entry (covers full ramp)', () => {
      renderEditor()

      for (const [charset, map] of Object.entries(CHARSET_MAPS)) {
        const btn = screen.getByRole('button', { name: charset })
        const chars = [...map]
        const lastChar = chars[chars.length - 1] ?? ''
        expect(btn.textContent).toContain(lastChar)
      }
    })

    it('renders every charset chip', () => {
      renderEditor()

      for (const charset of Object.keys(CHARSET_MAPS)) {
        expect(screen.getByRole('button', { name: charset })).toBeInTheDocument()
      }
    })
  })

  describe('Color Mode swatches', () => {
    it('renders a [data-swatch] for every color mode', () => {
      renderEditor()
      focusTool('color mode')

      for (const mode of COLOR_MODES) {
        expect(
          screen.getByRole('button', { name: mode }).querySelector('[data-swatch]'),
        ).toBeInTheDocument()
      }
    })

    it('single-color modes render a swatch with a solid background', () => {
      renderEditor()
      focusTool('color mode')

      const swatch = screen
        .getByRole('button', { name: 'matrix' })
        .querySelector('[data-swatch]') as HTMLElement
      expect(swatch.style.background || swatch.style.backgroundColor).toBeTruthy()
    })

    it('gradient color modes render a swatch with a gradient background', () => {
      renderEditor()
      focusTool('color mode')

      for (const mode of ['synthwave', 'matrix-dual', 'acid', 'infrared']) {
        const swatch = screen
          .getByRole('button', { name: mode })
          .querySelector('[data-swatch]') as HTMLElement
        expect(swatch.style.background).toContain('gradient')
      }
    })

    it('original color mode renders a multicolor gradient swatch', () => {
      renderEditor()
      focusTool('color mode')

      const swatch = screen
        .getByRole('button', { name: 'original' })
        .querySelector('[data-swatch]') as HTMLElement
      expect(swatch.style.background).toContain('gradient')
    })
  })
})
