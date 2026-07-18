import { fireEvent, render, screen } from '@testing-library/react'
import { describe, expect, it, vi } from 'vitest'
import { DEFAULT_PRESET } from '../glitch/presets'
import MobileControls from './mobile-controls'

vi.mock('./preset-picker', () => ({
  default: () => <div>Presets content</div>,
}))

vi.mock('./control-panel', () => ({
  default: () => <div>Advanced content</div>,
}))

const defaultProps = {
  chain: DEFAULT_PRESET.chain,
  activePresetId: DEFAULT_PRESET.id,
  onSelect: vi.fn(),
  onRandomize: vi.fn(),
  onLinkChange: vi.fn(),
  onReorder: vi.fn(),
  onAdd: vi.fn(),
  onRemove: vi.fn(),
  onDuplicate: vi.fn(),
  onReroll: vi.fn(),
}

describe('MobileControls', () => {
  it('renders a controls trigger button', () => {
    render(<MobileControls {...defaultProps} />)

    expect(screen.getByRole('button', { name: /controls/i })).toBeInTheDocument()
  })

  it('keeps the sheet closed until the trigger is clicked', () => {
    render(<MobileControls {...defaultProps} />)

    expect(screen.queryByText('Presets content')).not.toBeInTheDocument()
  })

  // Presets are the front door, so they show the moment the sheet opens — the per-Effect panel
  // stays folded behind `advanced`.
  it('opens the sheet on the Presets, with the advanced panel folded away', () => {
    render(<MobileControls {...defaultProps} />)

    fireEvent.click(screen.getByRole('button', { name: /controls/i }))

    expect(screen.getByText('Presets content')).toBeVisible()
    expect(screen.queryByText('Advanced content')).not.toBeInTheDocument()
  })

  it('reveals the advanced panel once the affordance is opened', () => {
    render(<MobileControls {...defaultProps} />)
    fireEvent.click(screen.getByRole('button', { name: /controls/i }))

    fireEvent.click(screen.getByRole('button', { name: /advanced/i }))

    expect(screen.getByText('Advanced content')).toBeVisible()
  })

  it('closes the sheet when the backdrop is clicked', () => {
    render(<MobileControls {...defaultProps} />)
    fireEvent.click(screen.getByRole('button', { name: /controls/i }))
    expect(screen.getByText('Presets content')).toBeInTheDocument()

    fireEvent.click(screen.getByTestId('sheet-backdrop'))

    expect(screen.queryByText('Presets content')).not.toBeInTheDocument()
  })
})
