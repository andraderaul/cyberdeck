import { render, screen, within } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { beforeEach, describe, expect, it } from 'vitest'
import { THEME_ATTRIBUTE, THEME_STORAGE_KEY, THEMES } from '../theme/themes'
import ThemeControl from './theme-control'

beforeEach(() => {
  localStorage.clear()
  document.documentElement.removeAttribute(THEME_ATTRIBUTE)
})

/**
 * The one handle a screen reader has on a purely visual feature is the trigger's name, so it has to
 * carry the Theme in force as well as say what the control is (WCAG 2.5.3).
 */
function trigger() {
  return screen.getByRole('button', { name: /^theme:/ })
}

describe('ThemeControl', () => {
  it('opens on the default and says which Theme that is', () => {
    render(<ThemeControl />)
    expect(trigger()).toHaveAccessibleName('theme: ice')
    expect(trigger()).toHaveTextContent('ice')
  })

  it('keeps the popover closed until the trigger is activated', () => {
    render(<ThemeControl />)
    expect(trigger()).toHaveAttribute('aria-expanded', 'false')
    expect(screen.queryByRole('menu')).not.toBeInTheDocument()
  })

  it('lists the whole roster when opened', async () => {
    const user = userEvent.setup()
    render(<ThemeControl />)

    await user.click(trigger())

    const menu = screen.getByRole('menu')
    const options = within(menu).getAllByRole('menuitemradio')
    // The accessible name is the Theme's own name — the decorative marker is hidden from it.
    expect(options).toHaveLength(THEMES.length)
    for (const name of THEMES) {
      expect(within(menu).getByRole('menuitemradio', { name })).toBeInTheDocument()
    }
  })

  it('marks the Theme in force as the active option', async () => {
    const user = userEvent.setup()
    render(<ThemeControl />)

    await user.click(trigger())
    expect(screen.getByRole('menuitemradio', { name: 'ice' })).toHaveAttribute(
      'aria-checked',
      'true',
    )
    expect(screen.getByRole('menuitemradio', { name: 'construct' })).toHaveAttribute(
      'aria-checked',
      'false',
    )
  })

  it('applies the picked Theme, remembers it, and closes the popover', async () => {
    const user = userEvent.setup()
    render(<ThemeControl />)

    await user.click(trigger())
    await user.click(screen.getByRole('menuitemradio', { name: 'kuang' }))

    // The document attribute is what the Theme blocks select on — the observable effect of a pick.
    expect(document.documentElement.getAttribute(THEME_ATTRIBUTE)).toBe('kuang')
    expect(localStorage.getItem(THEME_STORAGE_KEY)).toBe('kuang')
    expect(screen.queryByRole('menu')).not.toBeInTheDocument()
    expect(trigger()).toHaveAccessibleName('theme: kuang')
  })

  it('returns focus to the trigger after a pick, so the header place is not lost', async () => {
    const user = userEvent.setup()
    render(<ThemeControl />)

    await user.click(trigger())
    await user.click(screen.getByRole('menuitemradio', { name: 'chiba' }))

    expect(trigger()).toHaveFocus()
  })

  it('remembers the choice for next time', async () => {
    const user = userEvent.setup()
    const { unmount } = render(<ThemeControl />)
    await user.click(trigger())
    await user.click(screen.getByRole('menuitemradio', { name: 'ougou' }))
    unmount()

    render(<ThemeControl />)
    expect(trigger()).toHaveAccessibleName('theme: ougou')
  })

  it('writes nothing until somebody picks', () => {
    render(<ThemeControl />)
    expect(localStorage.getItem(THEME_STORAGE_KEY)).toBeNull()
  })

  it('falls back to the default when the stored value is not a Theme', () => {
    localStorage.setItem(THEME_STORAGE_KEY, 'neon')
    render(<ThemeControl />)
    expect(trigger()).toHaveAccessibleName('theme: ice')
  })

  it('names the popover so a screen reader knows what the list is', async () => {
    const user = userEvent.setup()
    render(<ThemeControl />)

    await user.click(trigger())
    expect(screen.getByRole('menu')).toHaveAccessibleName('theme')
  })

  it('opens, moves and picks entirely from the keyboard', async () => {
    const user = userEvent.setup()
    render(<ThemeControl />)

    await user.tab()
    expect(trigger()).toHaveFocus()

    // Opening lands focus on the Theme in force, so a keyboard user starts where they are.
    await user.keyboard('{Enter}')
    expect(screen.getByRole('menuitemradio', { name: 'ice' })).toHaveFocus()

    await user.keyboard('{ArrowDown}')
    expect(screen.getByRole('menuitemradio', { name: 'construct' })).toHaveFocus()

    await user.keyboard('{Enter}')
    expect(document.documentElement.getAttribute(THEME_ATTRIBUTE)).toBe('construct')
    expect(screen.queryByRole('menu')).not.toBeInTheDocument()
    expect(trigger()).toHaveFocus()
  })

  it('dismisses with Escape and returns focus to the trigger, changing nothing', async () => {
    const user = userEvent.setup()
    render(<ThemeControl />)

    await user.click(trigger())
    await user.keyboard('{Escape}')

    expect(screen.queryByRole('menu')).not.toBeInTheDocument()
    expect(trigger()).toHaveFocus()
    expect(document.documentElement.getAttribute(THEME_ATTRIBUTE)).toBe('ice')
    expect(localStorage.getItem(THEME_STORAGE_KEY)).toBeNull()
  })
})
