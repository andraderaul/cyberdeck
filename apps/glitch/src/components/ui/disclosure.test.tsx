import { fireEvent, render, screen } from '@testing-library/react'
import { describe, expect, it } from 'vitest'
import Disclosure from './disclosure'

function renderDisclosure() {
  return render(
    <Disclosure label="advanced">
      <p>tweakables</p>
    </Disclosure>,
  )
}

describe('Disclosure', () => {
  it('starts collapsed, so the content is not the primary surface', () => {
    renderDisclosure()

    expect(screen.getByRole('button', { name: /advanced/i })).toHaveAttribute(
      'aria-expanded',
      'false',
    )
    expect(screen.queryByText('tweakables')).not.toBeInTheDocument()
  })

  it('reveals the content when the trigger is activated', () => {
    renderDisclosure()

    fireEvent.click(screen.getByRole('button', { name: /advanced/i }))

    expect(screen.getByRole('button', { name: /advanced/i })).toHaveAttribute(
      'aria-expanded',
      'true',
    )
    expect(screen.getByText('tweakables')).toBeInTheDocument()
  })

  it('collapses again when the trigger is activated a second time', () => {
    renderDisclosure()

    fireEvent.click(screen.getByRole('button', { name: /advanced/i }))
    fireEvent.click(screen.getByRole('button', { name: /advanced/i }))

    expect(screen.queryByText('tweakables')).not.toBeInTheDocument()
  })

  it('points aria-controls at the revealed region', () => {
    renderDisclosure()

    fireEvent.click(screen.getByRole('button', { name: /advanced/i }))

    const controlled = screen
      .getByRole('button', { name: /advanced/i })
      .getAttribute('aria-controls')
    expect(controlled).toBeTruthy()
    expect(document.getElementById(controlled as string)).toContainElement(
      screen.getByText('tweakables'),
    )
  })

  // An aria-controls pointing at an unmounted region would hand AT a dangling reference.
  it('drops aria-controls while collapsed', () => {
    renderDisclosure()

    expect(screen.getByRole('button', { name: /advanced/i })).not.toHaveAttribute('aria-controls')
  })

  // Reached through aria-controls, an unlabelled region would announce as a bare group.
  it('names the revealed region after its trigger', () => {
    renderDisclosure()

    fireEvent.click(screen.getByRole('button', { name: /advanced/i }))

    expect(screen.getByRole('region', { name: /advanced/i })).toContainElement(
      screen.getByText('tweakables'),
    )
  })
})
