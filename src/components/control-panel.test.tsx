import { fireEvent, render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { describe, expect, it, vi } from 'vitest'
import type { ConversionSettings } from '../ascii/types'
import { CHARSET_MAPS } from '../ascii/types'
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

    it('each charset chip shows sample chars derived from CHARSET_MAPS', () => {
      renderPanel()
      const classicBtn = screen.getByRole('button', { name: 'classic' })
      const classicMap = CHARSET_MAPS.classic
      // button text should include at least one char from the classic charset
      const hasCharFromMap = [...classicMap].some((ch) => classicBtn.textContent?.includes(ch))
      expect(hasCharFromMap).toBe(true)
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
    it('renders a swatch for each color mode', () => {
      renderPanel()
      const matrixBtn = screen.getByRole('button', { name: 'matrix' })
      expect(matrixBtn.querySelector('[data-swatch]')).toBeInTheDocument()
    })

    it('single-color modes render a swatch with solid background', () => {
      renderPanel()
      const matrixBtn = screen.getByRole('button', { name: 'matrix' })
      const swatch = matrixBtn.querySelector('[data-swatch]') as HTMLElement
      expect(swatch.style.background || swatch.style.backgroundColor).toBeTruthy()
    })

    it('gradient color modes render a swatch with gradient background', () => {
      renderPanel()
      const synthwaveBtn = screen.getByRole('button', { name: 'synthwave' })
      const swatch = synthwaveBtn.querySelector('[data-swatch]') as HTMLElement
      expect(swatch.style.background).toContain('gradient')
    })

    it('original color mode renders a multicolor swatch', () => {
      renderPanel()
      const originalBtn = screen.getByRole('button', { name: 'original' })
      expect(originalBtn.querySelector('[data-swatch]')).toBeInTheDocument()
    })
  })
})
