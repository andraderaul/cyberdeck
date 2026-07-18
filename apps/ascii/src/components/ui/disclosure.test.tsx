import { render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { describe, expect, it } from 'vitest'
import Disclosure from './disclosure'

describe('Disclosure', () => {
  it('is closed by default — the content is not mounted', () => {
    render(<Disclosure label="advanced">panel body</Disclosure>)
    expect(screen.queryByText('panel body')).not.toBeInTheDocument()
  })

  it('reveals the content when the trigger is clicked', async () => {
    const user = userEvent.setup()
    render(<Disclosure label="advanced">panel body</Disclosure>)
    await user.click(screen.getByRole('button', { name: /advanced/i }))
    expect(screen.getByText('panel body')).toBeVisible()
  })

  it('reflects open state on aria-expanded and links the region while open', async () => {
    const user = userEvent.setup()
    render(<Disclosure label="advanced">panel body</Disclosure>)
    const trigger = screen.getByRole('button', { name: /advanced/i })

    expect(trigger).toHaveAttribute('aria-expanded', 'false')
    expect(trigger).not.toHaveAttribute('aria-controls')

    await user.click(trigger)

    expect(trigger).toHaveAttribute('aria-expanded', 'true')
    expect(trigger).toHaveAttribute('aria-controls')
    expect(screen.getByRole('region')).toBeInTheDocument()
  })

  it('collapses again on a second click', async () => {
    const user = userEvent.setup()
    render(<Disclosure label="advanced">panel body</Disclosure>)
    const trigger = screen.getByRole('button', { name: /advanced/i })
    await user.click(trigger)
    await user.click(trigger)
    expect(screen.queryByText('panel body')).not.toBeInTheDocument()
  })
})
