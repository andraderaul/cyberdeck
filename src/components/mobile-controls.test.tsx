import { fireEvent, render, screen } from '@testing-library/react'
import { describe, expect, it, vi } from 'vitest'
import MobileControls from './mobile-controls'

vi.mock('./upload-zone', () => ({
  default: () => <div>Source content</div>,
}))

vi.mock('./control-panel', () => ({
  default: () => <div>Settings content</div>,
}))

const defaultProps = {
  onImage: vi.fn(),
  webcamState: {
    mode: 'upload' as const,
    live: false,
    facingMode: 'user' as const,
    error: null,
  },
  onSwitchMode: vi.fn(),
  onSwitchCamera: vi.fn(),
  settings: {
    resolution: 12,
    brightness: 1,
    contrast: 1,
    colorMode: 'matrix' as const,
    charset: 'sharp' as const,
  },
  onSettingsChange: vi.fn(),
}

describe('MobileControls', () => {
  it('renders controls trigger button', () => {
    render(<MobileControls {...defaultProps} />)
    expect(screen.getByRole('button', { name: /controls/i })).toBeInTheDocument()
  })

  it('opens sheet with Source tab active by default when trigger is clicked', () => {
    render(<MobileControls {...defaultProps} />)
    fireEvent.click(screen.getByRole('button', { name: /controls/i }))
    expect(screen.getByText('Source content')).toBeVisible()
  })

  it('switches to Settings tab', () => {
    render(<MobileControls {...defaultProps} />)
    fireEvent.click(screen.getByRole('button', { name: /controls/i }))
    fireEvent.click(screen.getByRole('tab', { name: /settings/i }))
    expect(screen.getByText('Settings content')).toBeVisible()
    expect(screen.getByText('Source content')).not.toBeVisible()
  })

  it('tabs have correct aria-selected state', () => {
    render(<MobileControls {...defaultProps} />)
    fireEvent.click(screen.getByRole('button', { name: /controls/i }))
    const sourceTab = screen.getByRole('tab', { name: /source/i })
    const settingsTab = screen.getByRole('tab', { name: /settings/i })
    expect(sourceTab).toHaveAttribute('aria-selected', 'true')
    expect(settingsTab).toHaveAttribute('aria-selected', 'false')

    fireEvent.click(settingsTab)
    expect(sourceTab).toHaveAttribute('aria-selected', 'false')
    expect(settingsTab).toHaveAttribute('aria-selected', 'true')
  })

  it('closes sheet when backdrop is clicked', () => {
    render(<MobileControls {...defaultProps} />)
    fireEvent.click(screen.getByRole('button', { name: /controls/i }))
    expect(screen.getByText('Source content')).toBeInTheDocument()
    fireEvent.click(screen.getByTestId('sheet-backdrop'))
    expect(screen.queryByText('Source content')).not.toBeInTheDocument()
  })
})
