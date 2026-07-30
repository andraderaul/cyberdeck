import { render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { describe, expect, it, vi } from 'vitest'
import ToggleGroup from './toggle-group'

const OPTIONS = ['rgb', 'hsl', 'lum'] as const

function renderGroup(overrides: Partial<React.ComponentProps<typeof ToggleGroup>> = {}) {
  const onChange = vi.fn()
  render(
    <ToggleGroup
      options={OPTIONS}
      value="hsl"
      onChange={onChange}
      ariaLabel="sort direction"
      {...overrides}
    />,
  )
  return { onChange }
}

describe('ToggleGroup', () => {
  it('renders one button per option', () => {
    renderGroup()
    expect(screen.getAllByRole('button')).toHaveLength(3)
  })

  it('reports the picked option', async () => {
    const user = userEvent.setup()
    const { onChange } = renderGroup()

    await user.click(screen.getByRole('button', { name: 'lum' }))

    expect(onChange).toHaveBeenCalledWith('lum')
  })

  // The selected option used to be spelled in colour and border alone, which is no state at all to a
  // screen reader: three buttons, none of them saying which one is the answer.
  describe('the selected option is announced, not just drawn', () => {
    it('presses the option in force and leaves the others unpressed', () => {
      renderGroup()

      expect(screen.getByRole('button', { name: 'hsl' })).toHaveAttribute('aria-pressed', 'true')
      expect(screen.getByRole('button', { name: 'rgb' })).toHaveAttribute('aria-pressed', 'false')
      expect(screen.getByRole('button', { name: 'lum' })).toHaveAttribute('aria-pressed', 'false')
    })

    it('moves the pressed state with the value', () => {
      renderGroup({ value: 'rgb' })

      expect(screen.getByRole('button', { name: 'rgb' })).toHaveAttribute('aria-pressed', 'true')
      expect(screen.getByRole('button', { name: 'hsl' })).toHaveAttribute('aria-pressed', 'false')
    })
  })

  // Locks the accessible name only — testing-library resolves it from a legend and from an
  // `aria-label` alike, so it cannot see the reason the legend is the one in the markup: a fieldset
  // is spec'd to take its name from its legend, and `aria-label` on one is honoured inconsistently
  // across screen readers. PresetPicker already spells it this way.
  it('names the group', () => {
    renderGroup()
    expect(screen.getByRole('group', { name: 'sort direction' })).toBeInTheDocument()
  })

  it('holds every option to the 44px touch target', () => {
    renderGroup()
    for (const button of screen.getAllByRole('button')) {
      expect(button.className).toContain('min-h-[44px]')
    }
  })

  it('renders a custom label in place of the raw option', () => {
    renderGroup({ labels: { rgb: 'R·G·B' } })
    expect(screen.getByRole('button', { name: 'R·G·B' })).toBeInTheDocument()
  })
})
