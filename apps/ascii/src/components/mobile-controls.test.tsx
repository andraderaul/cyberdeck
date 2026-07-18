import { fireEvent, render, screen } from '@testing-library/react'
import { describe, expect, it, vi } from 'vitest'
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

describe('MobileControls', () => {
  it('renders controls trigger button', () => {
    render(<MobileControls {...defaultProps} />)
    expect(screen.getByRole('button', { name: /controls/i })).toBeInTheDocument()
  })

  it('keeps the sheet closed until the trigger is clicked', () => {
    render(<MobileControls {...defaultProps} />)
    expect(screen.queryByText('Settings content')).not.toBeInTheDocument()
  })

  // No source/settings tabs (ADR 0015): the sheet opens straight onto the settings surface.
  it('opens the sheet directly on the controls, with no source/settings tabs', () => {
    render(<MobileControls {...defaultProps} />)
    fireEvent.click(screen.getByRole('button', { name: /controls/i }))
    expect(screen.getByText('Settings content')).toBeVisible()
    expect(screen.queryByRole('tab')).not.toBeInTheDocument()
  })

  it('closes the sheet when the backdrop is clicked', () => {
    render(<MobileControls {...defaultProps} />)
    fireEvent.click(screen.getByRole('button', { name: /controls/i }))
    expect(screen.getByText('Settings content')).toBeInTheDocument()
    fireEvent.click(screen.getByTestId('sheet-backdrop'))
    expect(screen.queryByText('Settings content')).not.toBeInTheDocument()
  })
})
