import { fireEvent, render, screen } from '@testing-library/react'
import { describe, expect, it, vi } from 'vitest'
import TabStrip from './tab-strip'

const TABS = [
  { id: 'presets', label: 'presets' },
  { id: 'edit', label: 'edit' },
  { id: 'out', label: 'out' },
] as const

function renderStrip(children = (tab: string) => <div>panel: {tab}</div>) {
  return render(
    <TabStrip tabs={TABS} ariaLabel="controls">
      {children}
    </TabStrip>,
  )
}

describe('TabStrip', () => {
  it('renders one tab per entry, in the order given', () => {
    renderStrip()

    expect(screen.getAllByRole('tab').map((t) => t.textContent)).toEqual(['presets', 'edit', 'out'])
  })

  it('opens on the first tab', () => {
    renderStrip()

    expect(screen.getByRole('tab', { name: 'presets' })).toHaveAttribute('aria-selected', 'true')
    expect(screen.getByText('panel: presets')).toBeInTheDocument()
  })

  it('moves the selection to the tab that is clicked', () => {
    renderStrip()

    fireEvent.click(screen.getByRole('tab', { name: 'edit' }))

    expect(screen.getByRole('tab', { name: 'edit' })).toHaveAttribute('aria-selected', 'true')
    expect(screen.getByRole('tab', { name: 'presets' })).toHaveAttribute('aria-selected', 'false')
  })

  it('swaps the panel with the tab', () => {
    renderStrip()

    fireEvent.click(screen.getByRole('tab', { name: 'out' }))

    expect(screen.getByText('panel: out')).toBeInTheDocument()
    expect(screen.queryByText('panel: presets')).not.toBeInTheDocument()
  })

  // Mounting one tab at a time is the behaviour, not an optimisation: the others must not reach the
  // accessibility tree or the tab order.
  it('never constructs the inactive panels', () => {
    const children = vi.fn((tab: string) => <div>panel: {tab}</div>)
    renderStrip(children)

    expect(children).toHaveBeenCalledTimes(1)
    expect(children).toHaveBeenCalledWith('presets')
  })

  it('wires the panel to its tab for a screen reader', () => {
    renderStrip()

    const tab = screen.getByRole('tab', { name: 'presets' })
    const panel = screen.getByRole('tabpanel')
    expect(tab).toHaveAttribute('aria-controls', panel.id)
    expect(panel).toHaveAttribute('aria-labelledby', tab.id)
  })

  it('names the tablist in the app’s own words', () => {
    renderStrip()

    expect(screen.getByRole('tablist', { name: 'controls' })).toBeInTheDocument()
  })
})
