import { render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { describe, expect, it, vi } from 'vitest'
import Footer from './footer'

const SOURCE = 'https://github.com/andraderaul/cyberdeck'

describe('Footer', () => {
  it('carries the attribution links, each opening away from the program', () => {
    render(<Footer sourceHref={SOURCE} />)

    const source = screen.getByRole('link', { name: /source code/i })
    expect(source).toHaveAttribute('href', SOURCE)
    for (const link of screen.getAllByRole('link')) {
      expect(link).toHaveAttribute('target', '_blank')
      expect(link).toHaveAttribute('rel', 'noopener noreferrer')
    }
  })

  it('omits the About trigger for a workspace that has no About to open', () => {
    render(<Footer sourceHref={SOURCE} />)
    expect(screen.queryByRole('button', { name: 'about' })).not.toBeInTheDocument()
  })

  it('offers the About trigger when a workspace hands it a handler', async () => {
    const onAbout = vi.fn()
    render(<Footer sourceHref={SOURCE} onAbout={onAbout} />)

    await userEvent.click(screen.getByRole('button', { name: 'about' }))
    expect(onAbout).toHaveBeenCalledOnce()
  })

  // The bar is ultra-thin but sits in the thumb zone, so the target floor is per-control
  it('holds every control to min-h-[44px] despite the thin bar', () => {
    render(<Footer sourceHref={SOURCE} onAbout={() => {}} />)

    const controls = [
      screen.getByRole('button', { name: 'about' }),
      screen.getByRole('link', { name: /source code/i }),
      screen.getByRole('link', { name: /author/i }),
    ]
    for (const control of controls) {
      expect(control.className).toContain('min-h-[44px]')
    }
  })

  // The half #288 missed and #297 had already found in `Chip`: "about" is five characters and drew
  // 37.4px wide, because only the height was ever held (#355).
  it('holds the about trigger on the axis its label leaves short', () => {
    render(<Footer sourceHref={SOURCE} onAbout={() => {}} />)
    const classes = new Set(screen.getByRole('button', { name: 'about' }).className.split(/\s+/))

    expect(classes).toContain('min-w-[44px]')
    // Without this the stretched width all falls to one side of a label that no longer fills it.
    expect(classes).toContain('justify-center')
  })

  it('keeps the about button off --fg-dim, which sits below the contrast floor', () => {
    render(<Footer sourceHref={SOURCE} onAbout={() => {}} />)
    const about = screen.getByRole('button', { name: 'about' })
    expect(about.className.split(/\s+/)).not.toContain('text-fg-dim')
  })
})
