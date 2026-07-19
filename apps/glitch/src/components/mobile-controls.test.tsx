import { fireEvent, render, screen } from '@testing-library/react'
import { describe, expect, it, vi } from 'vitest'
import { DEFAULT_PRESET } from '../glitch/presets'
import MobileControls from './mobile-controls'

vi.mock('./control-panel', () => ({
  default: () => <div>Advanced content</div>,
}))

const defaultProps = {
  chain: DEFAULT_PRESET.chain,
  actions: {
    onLinkChange: vi.fn(),
    onReorder: vi.fn(),
    onAdd: vi.fn(),
    onRemove: vi.fn(),
    onDuplicate: vi.fn(),
  },
  onReroll: vi.fn(),
}

describe('MobileControls', () => {
  it('renders a controls trigger button', () => {
    render(<MobileControls {...defaultProps} />)

    expect(screen.getByRole('button', { name: /controls/i })).toBeInTheDocument()
  })

  it('keeps the sheet closed until the trigger is clicked', () => {
    render(<MobileControls {...defaultProps} />)

    expect(screen.queryByRole('button', { name: /advanced/i })).not.toBeInTheDocument()
  })

  // The Presets went to the Strip (ADR 0020), so the sheet is the tweak layer alone — and the fold
  // is still what stands between opening it and the Chain editor.
  it('opens the sheet on the advanced fold, still folded away', () => {
    render(<MobileControls {...defaultProps} />)

    fireEvent.click(screen.getByRole('button', { name: /controls/i }))

    expect(screen.getByRole('button', { name: /advanced/i })).toBeVisible()
    expect(screen.queryByText('Advanced content')).not.toBeInTheDocument()
  })

  it('carries no Preset picker — that surface belongs to the Strip', () => {
    render(<MobileControls {...defaultProps} />)

    fireEvent.click(screen.getByRole('button', { name: /controls/i }))

    expect(screen.queryByRole('button', { name: /randomize/i })).not.toBeInTheDocument()
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
    expect(screen.getByRole('button', { name: /advanced/i })).toBeInTheDocument()

    fireEvent.click(screen.getByTestId('sheet-backdrop'))

    expect(screen.queryByRole('button', { name: /advanced/i })).not.toBeInTheDocument()
  })
})
