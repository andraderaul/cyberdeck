import { TOUCH_TARGET_HEIGHT } from '@cyberdeck/deck-kit/ui'
import { render, screen } from '@testing-library/react'
import { createRef } from 'react'
import { describe, expect, it } from 'vitest'
import ExportControls from './export-controls'

function renderControls() {
  render(
    <ExportControls position={0.5} basemap={false} canvasRef={createRef<HTMLCanvasElement>()} />,
  )
}

describe('ExportControls', () => {
  it('foregrounds the link and keeps the PNG beside it (ADR 0021)', () => {
    renderControls()
    expect(screen.getByRole('button', { name: /share link/i })).toBeInTheDocument()
    expect(screen.getByRole('button', { name: /png/i })).toBeInTheDocument()
  })

  // Both sit on the piece, so each reaches a 44px target through an overlay rather than by taking
  // room from the light. The PNG also needs real width: `PNG` is narrower than 44px on its own.
  // Asserted against the constant rather than the classes it expands to, so respelling a target
  // cannot red these without an actual regression behind it.
  describe('touch targets', () => {
    it('gives the link 44px of height without growing it', () => {
      renderControls()
      const button = screen.getByRole('button', { name: /share link/i })

      expect(button.className.split(/\s+/)).toEqual(
        expect.arrayContaining(TOUCH_TARGET_HEIGHT.split(' ')),
      )
      expect(button.className).toContain('py-2xs')
    })

    it('gives the PNG real width as well, since its label is narrower than the target', () => {
      renderControls()
      const button = screen.getByRole('button', { name: /png/i })

      expect(button.className.split(/\s+/)).toEqual(
        expect.arrayContaining(TOUCH_TARGET_HEIGHT.split(' ')),
      )
      expect(button.className).toContain('min-w-[44px]')
    })
  })
})
