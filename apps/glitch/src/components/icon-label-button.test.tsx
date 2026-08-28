import { ICON_GLYPH_SIZE } from '@cyberdeck/deck-kit/ui'
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

  // For a control with more to say than the two words that fit beside its glyph — the step-back
  // control names the roll it returns to. The visible label is unchanged, so the two never disagree
  // about what the control *does*, only about how much detail each carries.
  it('takes an accessible name that says more than the visible label', () => {
    render(
      <IconLabelButton
        variant="ghost"
        glyph="↶"
        label="step back"
        name="step back to the previous roll, seed 0x000002c1"
      />,
    )

    expect(
      screen.getByRole('button', { name: 'step back to the previous roll, seed 0x000002c1' }),
    ).toBeInTheDocument()
    expect(screen.getByText('step back')).toBeInTheDocument()
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

  it('sizes the glyph for standing alone, and hands the size back at sm', () => {
    render(<IconLabelButton variant="secondary" glyph="⚄" label="randomize" />)
    const glyph = screen.getByText('⚄')

    expect(glyph.className.split(/\s+/)).toEqual(expect.arrayContaining(ICON_GLYPH_SIZE.split(' ')))
    expect(glyph).toHaveClass('sm:text-sm')
  })
})
