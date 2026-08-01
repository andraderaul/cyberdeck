import { render, screen } from '@testing-library/react'
import { describe, expect, it } from 'vitest'
import IconLabelButton from './icon-label-button'

describe('IconLabelButton', () => {
  // The accessible name has to be the label alone: without the aria-label the glyph joins the name,
  // and a screen reader reads a die face before the word.
  it('names itself by its label, never by its glyph', () => {
    render(<IconLabelButton variant="secondary" glyph="⚄" label="randomize" />)

    expect(screen.getByRole('button', { name: 'randomize' })).toBeInTheDocument()
    expect(screen.queryByRole('button', { name: '⚄ randomize' })).not.toBeInTheDocument()
  })

  it('keeps the glyph out of the accessibility tree', () => {
    render(<IconLabelButton variant="secondary" glyph="⚄" label="randomize" />)

    expect(screen.getByText('⚄')).toHaveAttribute('aria-hidden', 'true')
  })

  // happy-dom loads no stylesheet, so `hidden` hides nothing here and the class is the only
  // observable the collapse leaves behind — assert it rather than a computed style that is a
  // constant in this environment.
  it('carries the label in the element that collapses below sm', () => {
    render(<IconLabelButton variant="secondary" glyph="⚄" label="randomize" />)

    expect(screen.getByText('randomize')).toHaveClass('hidden', 'sm:inline')
  })
})
