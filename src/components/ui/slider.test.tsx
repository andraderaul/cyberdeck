import { fireEvent, render, screen } from '@testing-library/react'
import { beforeEach, describe, expect, it, vi } from 'vitest'
import Slider from './slider'

const baseProps = {
  label: 'volume',
  value: 1.5,
  min: 0.5,
  max: 2.0,
  step: 0.05,
  onChange: vi.fn(),
}

beforeEach(() => vi.clearAllMocks())

describe('Slider', () => {
  it('renders without crashing with required props only', () => {
    render(<Slider {...baseProps} />)
    expect(screen.getByLabelText(/volume/i)).toBeInTheDocument()
  })

  it('renders a default marker when defaultValue is provided', () => {
    render(<Slider {...baseProps} defaultValue={1.0} />)
    expect(screen.getByTestId('default-marker')).toBeInTheDocument()
  })

  it('does not render a default marker when defaultValue is not provided', () => {
    render(<Slider {...baseProps} />)
    expect(screen.queryByTestId('default-marker')).not.toBeInTheDocument()
  })

  it('calls onChange with defaultValue when the range input is double-clicked', () => {
    const onChange = vi.fn()
    render(<Slider {...baseProps} onChange={onChange} defaultValue={1.0} />)
    fireEvent.dblClick(screen.getByLabelText(/volume/i))
    expect(onChange).toHaveBeenCalledWith(1.0)
  })

  it('does not call onChange on double-click when defaultValue is not provided', () => {
    const onChange = vi.fn()
    render(<Slider {...baseProps} onChange={onChange} />)
    fireEvent.dblClick(screen.getByLabelText(/volume/i))
    expect(onChange).not.toHaveBeenCalled()
  })

  it('applies violet style to marker when value equals defaultValue', () => {
    render(<Slider {...baseProps} value={1.0} defaultValue={1.0} />)
    const marker = screen.getByTestId('default-marker')
    expect(marker.className).toMatch(/violet/)
  })

  it('applies slate style to marker when value differs from defaultValue', () => {
    render(<Slider {...baseProps} value={1.5} defaultValue={1.0} />)
    const marker = screen.getByTestId('default-marker')
    expect(marker.className).toMatch(/slate/)
  })

  it('sets title attribute for discoverability when defaultValue is provided', () => {
    render(<Slider {...baseProps} defaultValue={1.0} />)
    const input = screen.getByLabelText(/volume/i)
    expect(input).toHaveAttribute('title', expect.stringContaining('double-click'))
  })

  it('does not set title attribute when defaultValue is not provided', () => {
    render(<Slider {...baseProps} />)
    const input = screen.getByLabelText(/volume/i)
    expect(input).not.toHaveAttribute('title')
  })
})
