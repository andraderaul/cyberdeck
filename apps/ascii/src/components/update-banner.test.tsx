import { render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { describe, expect, it, vi } from 'vitest'
import UpdateBanner from './update-banner'

describe('UpdateBanner', () => {
  it('announces the new build without interrupting', () => {
    render(<UpdateBanner onApply={vi.fn()} />)

    // `status`, not `alert`: a parked build is news, not something to break a session over.
    expect(screen.getByRole('status')).toHaveTextContent('a new version is ready')
  })

  it('applies only on the user’s move', async () => {
    const onApply = vi.fn()
    render(<UpdateBanner onApply={onApply} />)

    expect(onApply).not.toHaveBeenCalled()
    await userEvent.click(screen.getByRole('button', { name: 'reload now' }))
    expect(onApply).toHaveBeenCalledTimes(1)
  })
})
