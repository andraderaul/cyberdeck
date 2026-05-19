import { fireEvent, render, screen } from '@testing-library/react'
import { describe, expect, it } from 'vitest'
import Tooltip from './tooltip'

const defaultProps = {
  id: 'tooltip-test',
  content: 'some helpful text',
}

describe('Tooltip', () => {
  it('renders trigger button with aria-label="more info"', () => {
    render(<Tooltip {...defaultProps} />)
    expect(screen.getByRole('button', { name: 'more info' })).toBeInTheDocument()
  })

  it('tooltip content is not visible initially (aria-hidden="true")', () => {
    render(<Tooltip {...defaultProps} />)
    const panel = document.getElementById('tooltip-test')
    expect(panel).toBeInTheDocument()
    expect(panel).toHaveAttribute('aria-hidden', 'true')
  })

  it('tooltip content is visible after hovering the trigger', () => {
    render(<Tooltip {...defaultProps} />)
    const trigger = screen.getByRole('button', { name: 'more info' })
    fireEvent.mouseEnter(trigger)
    const panel = document.getElementById('tooltip-test')
    expect(panel).toHaveAttribute('aria-hidden', 'false')
  })

  it('tooltip is hidden again after mousing out', () => {
    render(<Tooltip {...defaultProps} />)
    const trigger = screen.getByRole('button', { name: 'more info' })
    fireEvent.mouseEnter(trigger)
    fireEvent.mouseLeave(trigger)
    const panel = document.getElementById('tooltip-test')
    expect(panel).toHaveAttribute('aria-hidden', 'true')
  })

  it('tooltip content is visible after focusing the trigger', () => {
    render(<Tooltip {...defaultProps} />)
    const trigger = screen.getByRole('button', { name: 'more info' })
    fireEvent.focus(trigger)
    const panel = document.getElementById('tooltip-test')
    expect(panel).toHaveAttribute('aria-hidden', 'false')
  })

  it('tooltip is hidden after blurring the trigger', () => {
    render(<Tooltip {...defaultProps} />)
    const trigger = screen.getByRole('button', { name: 'more info' })
    fireEvent.focus(trigger)
    fireEvent.blur(trigger)
    const panel = document.getElementById('tooltip-test')
    expect(panel).toHaveAttribute('aria-hidden', 'true')
  })

  it('clicking the trigger toggles the tooltip visible', () => {
    render(<Tooltip {...defaultProps} />)
    const trigger = screen.getByRole('button', { name: 'more info' })
    fireEvent.click(trigger)
    const panel = document.getElementById('tooltip-test')
    expect(panel).toHaveAttribute('aria-hidden', 'false')
    fireEvent.click(trigger)
    expect(panel).toHaveAttribute('aria-hidden', 'true')
  })

  it('tooltip div has role="tooltip" and the given id', () => {
    render(<Tooltip {...defaultProps} />)
    const panel = document.getElementById('tooltip-test')
    expect(panel).toHaveAttribute('role', 'tooltip')
    expect(panel).toHaveAttribute('id', 'tooltip-test')
  })

  it('focus then click leaves tooltip visible (touch tap fix)', () => {
    render(<Tooltip {...defaultProps} />)
    const trigger = screen.getByRole('button', { name: 'more info' })
    fireEvent.focus(trigger)
    fireEvent.click(trigger)
    const panel = document.getElementById('tooltip-test')
    expect(panel).toHaveAttribute('aria-hidden', 'false')
  })

  it('Escape key dismisses tooltip while visible', () => {
    render(<Tooltip {...defaultProps} />)
    const trigger = screen.getByRole('button', { name: 'more info' })
    fireEvent.mouseEnter(trigger)
    fireEvent.keyDown(document, { key: 'Escape' })
    const panel = document.getElementById('tooltip-test')
    expect(panel).toHaveAttribute('aria-hidden', 'true')
  })
})
