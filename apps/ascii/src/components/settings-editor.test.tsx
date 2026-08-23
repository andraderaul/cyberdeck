import { fireEvent, render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { useState } from 'react'
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
  edgeGlyphs: false,
  dithering: 'none',
}

function renderEditor(onChange = vi.fn()) {
  render(<SettingsEditor settings={DEFAULT_SETTINGS} onChange={onChange} />)
  return { onChange }
}

/**
 * The editor with a parent that actually applies the patch. The authored-ramp field mirrors the
 * Charset in ConversionSettings rather than shadowing it, so a parent that never updates would be
 * testing a state the app never reaches.
 */
function renderControlled(initial: ConversionSettings = DEFAULT_SETTINGS) {
  const onChange = vi.fn()
  function Harness() {
    const [settings, setSettings] = useState(initial)
    return (
      <SettingsEditor
        settings={settings}
        onChange={(patch) => {
          onChange(patch)
          setSettings((current) => ({ ...current, ...patch }))
        }}
      />
    )
  }
  render(<Harness />)
  return { onChange, field: screen.getByLabelText('custom charset') }
}

/** Puts a tool's control in the panel — the row only ever selects (ADR 0020). */
function focusTool(label: string) {
  fireEvent.click(screen.getByRole('button', { name: label }))
}

describe('SettingsEditor', () => {
  it('offers every ConversionSettings control as a tool chip', () => {
    renderEditor()

    for (const tool of [
      'charset',
      'edge glyphs',
      'dithering',
      'color mode',
      'resolution',
      'brightness',
      'contrast',
    ]) {
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

  describe('Authored Charset', () => {
    it('converts as the ramp is typed, once it has two characters to spend', async () => {
      const { onChange, field } = renderControlled()

      await userEvent.type(field, ' .@')

      expect(onChange).toHaveBeenLastCalledWith({ charset: 'custom: .@' })
      expect(field).toHaveValue(' .@')
    })

    it('refuses a single character, applying nothing and saying what a Charset needs', () => {
      const { onChange, field } = renderControlled()

      fireEvent.change(field, { target: { value: '@' } })

      expect(onChange).not.toHaveBeenCalled()
      expect(screen.getByText(/2 characters or more, ordered darkest to lightest/)).toBeVisible()
      expect(field).toHaveAttribute('aria-invalid', 'true')
    })

    it('refuses a lone astral character — one glyph, however many UTF-16 units', () => {
      const { onChange, field } = renderControlled()

      fireEvent.change(field, { target: { value: '🌑' } })

      expect(onChange).not.toHaveBeenCalled()
      expect(screen.getByText(/2 characters or more/)).toBeVisible()
    })

    it('accepts a pair of astral characters and hands them over whole', () => {
      const { onChange, field } = renderControlled()

      fireEvent.change(field, { target: { value: '🌑🌕' } })

      expect(onChange).toHaveBeenCalledWith({ charset: 'custom:🌑🌕' })
    })

    it('keeps the last Charset that read cleanly when the ramp is emptied', async () => {
      const { onChange, field } = renderControlled()

      await userEvent.type(field, ' .@')
      await userEvent.clear(field)

      expect(onChange).toHaveBeenLastCalledWith({ charset: 'custom: .@' })
      expect(screen.getByText(/2 characters or more/)).toBeVisible()
    })

    it('mirrors the authored ramp already in ConversionSettings', () => {
      const { field } = renderControlled({ ...DEFAULT_SETTINGS, charset: 'custom: .:@' })

      expect(field).toHaveValue(' .:@')
    })

    it('empties the field and the refusal when a curated Charset is chosen instead', () => {
      const { field } = renderControlled()

      fireEvent.change(field, { target: { value: '@' } })
      fireEvent.click(screen.getByRole('button', { name: 'braille' }))

      expect(field).toHaveValue('')
      expect(screen.queryByText(/2 characters or more/)).not.toBeInTheDocument()
    })
  })

  describe('Edge Glyphs', () => {
    it('calls onChange with an edgeGlyphs patch when the axis is switched on', async () => {
      const user = userEvent.setup()
      const { onChange } = renderEditor()
      focusTool('edge glyphs')

      await user.click(screen.getByRole('button', { name: 'on' }))

      expect(onChange).toHaveBeenCalledWith({ edgeGlyphs: true })
    })

    it('calls onChange with an edgeGlyphs patch when the axis is switched off', async () => {
      const user = userEvent.setup()
      const onChange = vi.fn()
      render(
        <SettingsEditor settings={{ ...DEFAULT_SETTINGS, edgeGlyphs: true }} onChange={onChange} />,
      )
      focusTool('edge glyphs')

      await user.click(screen.getByRole('button', { name: 'off' }))

      expect(onChange).toHaveBeenCalledWith({ edgeGlyphs: false })
    })

    // Colour and border alone are no state at all to a screen reader (WCAG 4.1.2).
    it('presses the state the ConversionSettings are actually on', () => {
      renderEditor()
      focusTool('edge glyphs')

      expect(screen.getByRole('button', { name: 'off' })).toHaveAttribute('aria-pressed', 'true')
      expect(screen.getByRole('button', { name: 'on' })).toHaveAttribute('aria-pressed', 'false')
    })
  })

  describe('Dithering', () => {
    it('offers every Dithering the conversion knows', () => {
      renderEditor()
      focusTool('dithering')

      for (const label of ['none', 'bayer', 'floyd–steinberg']) {
        expect(screen.getByRole('button', { name: label })).toBeInTheDocument()
      }
    })

    it('calls onChange with a dithering patch when one is picked', async () => {
      const user = userEvent.setup()
      const { onChange } = renderEditor()
      focusTool('dithering')

      await user.click(screen.getByRole('button', { name: 'floyd–steinberg' }))

      expect(onChange).toHaveBeenCalledWith({ dithering: 'floyd' })
    })

    // Colour and border alone are no state at all to a screen reader (WCAG 4.1.2).
    it('presses the Dithering the ConversionSettings are actually on', () => {
      render(
        <SettingsEditor
          settings={{ ...DEFAULT_SETTINGS, dithering: 'bayer' }}
          onChange={vi.fn()}
        />,
      )
      focusTool('dithering')

      expect(screen.getByRole('button', { name: 'bayer' })).toHaveAttribute('aria-pressed', 'true')
      expect(screen.getByRole('button', { name: 'none' })).toHaveAttribute('aria-pressed', 'false')
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

    it('a themed palette renders its one fixed colour as the swatch background', () => {
      renderEditor()
      focusTool('color mode')

      const swatch = screen
        .getByRole('button', { name: 'matrix' })
        .querySelector('[data-swatch]') as HTMLElement
      expect(swatch.style.background || swatch.style.backgroundColor).toBeTruthy()
    })

    // Named for the derivation, like the row itself: a gradient swatch is not what marks this row
    // out — `original` and `adaptive` draw one too, from inside the non-dual row.
    it('a dual mode renders its pair as a gradient swatch', () => {
      renderEditor()
      focusTool('color mode')

      for (const mode of ['synthwave', 'matrix-dual', 'acid', 'infrared']) {
        const swatch = screen
          .getByRole('button', { name: mode })
          .querySelector('[data-swatch]') as HTMLElement
        expect(swatch.style.background).toContain('gradient')
      }
    })

    // The two modes whose colours come out of the Source: their chips can only depict what the mode
    // does, so each one's swatch is a hand-drawn gradient rather than the mode's own palette.
    it.each(['original', 'adaptive'])('%s renders a multicolor gradient swatch', (mode) => {
      renderEditor()
      focusTool('color mode')

      const swatch = screen
        .getByRole('button', { name: mode })
        .querySelector('[data-swatch]') as HTMLElement
      expect(swatch.style.background).toContain('gradient')
    })
  })
})
