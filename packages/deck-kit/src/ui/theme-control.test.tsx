import { render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { beforeEach, describe, expect, it } from 'vitest'
import { THEME_ATTRIBUTE, THEME_STORAGE_KEY } from '../theme/themes'
import ThemeControl from './theme-control'

beforeEach(() => {
  localStorage.clear()
  document.documentElement.removeAttribute(THEME_ATTRIBUTE)
})

describe('ThemeControl', () => {
  it('opens on the default and says which Theme that is', () => {
    render(<ThemeControl />)
    expect(screen.getByRole('button', { name: 'theme: ice' })).toHaveTextContent('ice')
  })

  it('cycles the roster in order, wrapping', async () => {
    const user = userEvent.setup()
    render(<ThemeControl />)
    const control = screen.getByRole('button')

    await user.click(control)
    expect(control).toHaveAccessibleName('theme: construct')

    await user.click(control)
    expect(control).toHaveAccessibleName('theme: chiba')

    await user.click(control)
    expect(control).toHaveAccessibleName('theme: ice')
  })

  it('puts the Theme on the document element, which is what the Theme blocks select on', async () => {
    const user = userEvent.setup()
    render(<ThemeControl />)

    await user.click(screen.getByRole('button'))
    expect(document.documentElement.getAttribute(THEME_ATTRIBUTE)).toBe('construct')
  })

  it('remembers the choice for next time', async () => {
    const user = userEvent.setup()
    const { unmount } = render(<ThemeControl />)
    await user.click(screen.getByRole('button'))
    unmount()

    render(<ThemeControl />)
    expect(screen.getByRole('button')).toHaveAccessibleName('theme: construct')
  })

  it('writes nothing until somebody picks', () => {
    render(<ThemeControl />)
    expect(localStorage.getItem(THEME_STORAGE_KEY)).toBeNull()
  })

  it('falls back to the default when the stored value is not a Theme', () => {
    localStorage.setItem(THEME_STORAGE_KEY, 'neon')
    render(<ThemeControl />)
    expect(screen.getByRole('button')).toHaveAccessibleName('theme: ice')
  })

  // The name has to carry the current value as well as what the control is: this is the only
  // handle a screen reader has on a purely visual feature.
  it('is reachable and operable from the keyboard', async () => {
    const user = userEvent.setup()
    render(<ThemeControl />)
    const control = screen.getByRole('button')

    await user.tab()
    expect(control).toHaveFocus()

    await user.keyboard('{Enter}')
    expect(control).toHaveAccessibleName('theme: construct')
  })
})
