import { fireEvent, render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
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

  // The Strip is bottom-anchored, which puts every tab squarely in the thumb zone.
  it('holds every tab to the 44px target in both axes', () => {
    renderStrip()
    for (const tab of screen.getAllByRole('tab')) {
      expect(tab.className).toContain('min-h-[44px]')
      // A short label — `out` — otherwise leaves the tab 38px wide.
      expect(tab.className).toContain('min-w-[44px]')
    }
  })

  // `role="tab"` promises the APG tablist behaviour, and every tab being its own tab stop meant
  // crossing the Strip cost three Tabs to reach the panel behind it. Mirrors ThemeControl's menu:
  // refs and imperative focus, no extra state, so the arrows never re-render the panels.
  describe('keyboard navigation', () => {
    it('is one tab stop, landing on the selected tab', async () => {
      const user = userEvent.setup()
      renderStrip()

      await user.tab()

      expect(screen.getByRole('tab', { name: 'presets' })).toHaveFocus()
      expect(screen.getByRole('tab', { name: 'edit' })).toHaveAttribute('tabindex', '-1')
    })

    it('moves focus along the row with the arrows, wrapping at each end', async () => {
      const user = userEvent.setup()
      renderStrip()
      await user.tab()

      await user.keyboard('{ArrowRight}')
      expect(screen.getByRole('tab', { name: 'edit' })).toHaveFocus()

      await user.keyboard('{ArrowLeft}{ArrowLeft}')
      expect(screen.getByRole('tab', { name: 'out' })).toHaveFocus()

      await user.keyboard('{ArrowRight}')
      expect(screen.getByRole('tab', { name: 'presets' })).toHaveFocus()
    })

    it('jumps to either end with Home and End', async () => {
      const user = userEvent.setup()
      renderStrip()
      await user.tab()

      await user.keyboard('{End}')
      expect(screen.getByRole('tab', { name: 'out' })).toHaveFocus()

      await user.keyboard('{Home}')
      expect(screen.getByRole('tab', { name: 'presets' })).toHaveFocus()
    })

    // Manual activation: moving through the tabs must not swap the panel under the user, which is
    // also what keeps an arrow press from mounting a panel nobody asked for.
    it('selects on Enter rather than on arrival', async () => {
      const user = userEvent.setup()
      renderStrip()
      await user.tab()

      await user.keyboard('{ArrowRight}')
      expect(screen.getByRole('tab', { name: 'presets' })).toHaveAttribute('aria-selected', 'true')
      expect(screen.getByText('panel: presets')).toBeInTheDocument()

      await user.keyboard('{Enter}')
      expect(screen.getByRole('tab', { name: 'edit' })).toHaveAttribute('aria-selected', 'true')
      expect(screen.getByText('panel: edit')).toBeInTheDocument()
    })

    it('moves the tab stop to whichever tab is selected', () => {
      renderStrip()

      fireEvent.click(screen.getByRole('tab', { name: 'out' }))

      expect(screen.getByRole('tab', { name: 'out' })).toHaveAttribute('tabindex', '0')
      expect(screen.getByRole('tab', { name: 'presets' })).toHaveAttribute('tabindex', '-1')
    })
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
