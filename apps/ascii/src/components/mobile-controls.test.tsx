import { fireEvent, render, screen } from '@testing-library/react'
import { describe, expect, it, vi } from 'vitest'
import { PRESETS } from '../ascii/presets'
import MobileControls from './mobile-controls'

vi.mock('./control-panel', () => ({
  default: () => <div>Settings content</div>,
}))

const defaultProps = {
  settings: {
    resolution: 12,
    brightness: 1,
    contrast: 1,
    colorMode: 'matrix' as const,
    charset: 'sharp' as const,
  },
  onSettingsChange: vi.fn(),
  activePresetId: null,
  onPresetSelect: vi.fn(),
}

function openSheet() {
  render(<MobileControls {...defaultProps} />)
  fireEvent.click(screen.getByRole('button', { name: /controls/i }))
}

describe('MobileControls', () => {
  it('renders controls trigger button', () => {
    render(<MobileControls {...defaultProps} />)
    expect(screen.getByRole('button', { name: /controls/i })).toBeInTheDocument()
  })

  it('keeps the sheet closed until the trigger is clicked', () => {
    render(<MobileControls {...defaultProps} />)
    expect(screen.queryByText(/^presets$/i)).not.toBeInTheDocument()
  })

  // Converged onto GLITCH's model (ADR 0016): Presets up front, settings behind `advanced`.
  it('opens straight onto the Presets, with no source/settings tabs', () => {
    openSheet()
    expect(screen.getByText(/^presets$/i)).toBeVisible()
    expect(screen.getByRole('button', { name: PRESETS[0].name })).toBeInTheDocument()
    expect(screen.queryByRole('tab')).not.toBeInTheDocument()
  })

  it('keeps the per-setting ControlPanel folded behind `advanced` until expanded', () => {
    openSheet()
    expect(screen.queryByText('Settings content')).not.toBeInTheDocument()
    fireEvent.click(screen.getByRole('button', { name: /advanced/i }))
    expect(screen.getByText('Settings content')).toBeVisible()
  })

  it('closes the sheet when the backdrop is clicked', () => {
    openSheet()
    expect(screen.getByText(/^presets$/i)).toBeInTheDocument()
    fireEvent.click(screen.getByTestId('sheet-backdrop'))
    expect(screen.queryByText(/^presets$/i)).not.toBeInTheDocument()
  })
})
