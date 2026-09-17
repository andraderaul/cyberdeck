// The mute is the header's control that sheds its word below `sm` — see the table in
// `apps/ascii/src/header-type.ts` for what that buys and what still overflows in the tightest of
// the four headers. This file pins that the control actually wears it, and that the name a screen
// reader hears does not move with the breakpoint.
//
// Every assertion here is positive. A `not.toContain` over a class name would resurrect that class
// in the built CSS — every app's Tailwind content glob reads the kit's sources, tests included.

import { render, screen } from '@testing-library/react'
import { afterEach, describe, expect, it } from 'vitest'
import { ICON_GLYPH_SIZE } from '../ui/icon-glyph'
import SoundControl from './sound-control'

afterEach(() => {
  localStorage.clear()
})

describe('the mute', () => {
  it('draws its glyph icon-only below `sm` and at the inherited step from `sm` up', () => {
    render(<SoundControl />)

    const glyph = screen.getByText('◉')
    expect(glyph.className.split(/\s+/)).toEqual(
      expect.arrayContaining([...ICON_GLYPH_SIZE.split(' '), 'sm:text-xs']),
    )
  })

  it('carries its word in an element that hides below `sm`', () => {
    render(<SoundControl />)

    expect(screen.getByText('sound').className.split(/\s+/)).toEqual(['hidden', 'sm:block'])
  })

  // The word disappears below `sm`, so WCAG 2.5.3 stops constraining the name there — but the name
  // is the `aria-label` at every width, and where there *is* a visible word it is inside it.
  it('keeps one accessible name at every width, containing the word it shows at `sm`', () => {
    render(<SoundControl />)

    const name = screen.getByRole('button').getAttribute('aria-label') ?? ''
    expect(name).toBe('sound on — press to mute')
    expect(name).toContain(screen.getByText('sound').textContent)
  })
})
