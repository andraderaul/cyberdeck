import { TOUCH_TARGET_HEIGHT } from '@cyberdeck/deck-kit/ui'
import { render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { describe, expect, it, vi } from 'vitest'
import BasemapToggle from './basemap-toggle'

describe('BasemapToggle', () => {
  it('reports the outline state it is offering to leave', () => {
    render(<BasemapToggle on={false} onToggle={() => {}} />)
    expect(screen.getByRole('button', { name: /outline off/i })).toHaveAttribute(
      'aria-pressed',
      'false',
    )
  })

  it('presses once the outline is on', () => {
    render(<BasemapToggle on={true} onToggle={() => {}} />)
    expect(screen.getByRole('button', { name: /outline on/i })).toHaveAttribute(
      'aria-pressed',
      'true',
    )
  })

  it('toggles on press', async () => {
    const user = userEvent.setup()
    const onToggle = vi.fn()
    render(<BasemapToggle on={false} onToggle={onToggle} />)

    await user.click(screen.getByRole('button'))

    expect(onToggle).toHaveBeenCalledOnce()
  })

  // The chip stands on the piece (ADR 0021), so the target grows without the chrome growing with it.
  // Asserted against the constant rather than the classes it expands to, minus the `relative` the
  // chip's own `absolute` displaces — either one anchors the overlay, and `cn` keeps only the last.
  it('carries a 44px target without growing the chip', () => {
    render(<BasemapToggle on={false} onToggle={() => {}} />)
    const classes = screen.getByRole('button').className.split(/\s+/)
    const overlay = TOUCH_TARGET_HEIGHT.split(' ').filter((name) => name !== 'relative')

    expect(classes).toEqual(expect.arrayContaining(overlay))
    // The visible box keeps the padding it always had — the overlay is what reaches 44.
    expect(classes).toContain('py-2xs')
  })

  // The regression the class-name assertion above cannot see on its own: `TOUCH_TARGET_HEIGHT` opens
  // with `relative`, and naming it after the chip's own `absolute` drops the chip out of its corner
  // and back into the flow, with every target class still present and correct.
  it('stays pinned to its corner over the map', () => {
    render(<BasemapToggle on={false} onToggle={() => {}} />)
    const classes = screen.getByRole('button').className.split(/\s+/)

    expect(classes).toContain('absolute')
    expect(classes).not.toContain('relative')
  })
})
