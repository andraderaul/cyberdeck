import { fireEvent, render, screen, within } from '@testing-library/react'
import { describe, expect, it, vi } from 'vitest'
import { type Chain, createLink, type Link, MAX_CHAIN_LENGTH } from '../glitch/chain'
import type { ChainActions, SeedControls } from '../glitch/editor-state'
import ChainEditor from './chain-editor'

/** `link`, bypassed — the state the toggle leaves a Link in, so a fixture can start in it. */
function silenced(link: Link): Link {
  return { ...link, bypassed: true }
}

const SORT = createLink('pixelSort', { direction: 'horizontal', threshold: 0.4, runLength: 30 })

const GRAIN = createLink('noise', { amount: 0.25, tint: 'mono' })

/**
 * The editor with the Chain it is given, and every action stubbed.
 *
 * Rendered directly rather than through App: what these tests are about is the affordance — the
 * name a chip announces, the state a toggle reports — and the wiring from the toggle to the canvas
 * is app.test.tsx's to prove.
 */
function renderEditor(chain: Chain) {
  const actions: ChainActions = {
    onLinkChange: vi.fn(),
    onReorder: vi.fn(),
    onAdd: vi.fn(),
    onRemove: vi.fn(),
    onDuplicate: vi.fn(),
    onToggleBypass: vi.fn(),
  }
  const seedControls: SeedControls = {
    isAnimated: false,
    onReroll: vi.fn(),
    onToggleAnimation: vi.fn(),
  }
  render(<ChainEditor chain={chain} actions={actions} seedControls={seedControls} isLive={false} />)
  return actions
}

/** The Link chips, in Chain order — each is both the selection control and the drag handle. */
function linkChips() {
  return screen.getAllByRole('button', { name: /, position \d+ of \d+$/ })
}

function names() {
  return linkChips().map((chip) => chip.getAttribute('aria-label'))
}

describe('a bypassed Link in the editor', () => {
  // The chip's whole sentence, not a symbol beside it: the dashed border and the ⊘ are cues a
  // screen reader never receives, so the state has to reach the accessible name itself.
  it('says so in the chip’s accessible name, before the position it qualifies', () => {
    renderEditor([silenced(SORT), GRAIN])

    expect(names()).toEqual(['pixel sort, bypassed, position 1 of 2', 'noise, position 2 of 2'])
  })

  // The Link is silenced, not on its way out: it keeps its label, its place in the row and its
  // full strength. Half-fading it would collide with the drag ghost, which is the one thing in
  // this row that *does* mean "leaving".
  it('reads as present rather than removed, and unlike a focused or an unfocused Link', () => {
    renderEditor([silenced(SORT), GRAIN])
    const [bypassed, audible] = linkChips()

    expect(bypassed).toHaveTextContent('pixel sort')
    expect(bypassed).toHaveClass('border-dashed')
    expect(bypassed).not.toHaveClass('opacity-50')
    expect(audible).not.toHaveClass('border-dashed')
  })

  // The same mark the toggle carries, so the control and the state it produces read as one thing —
  // and hidden from the accessibility tree in both places, because the name already says it.
  it('carries a visible mark that is kept out of the accessibility tree', () => {
    renderEditor([silenced(SORT), GRAIN])

    expect(within(linkChips()[0]).getByText('⊘')).toHaveAttribute('aria-hidden', 'true')
    expect(names()[0]).not.toContain('⊘')
  })

  // It occupies a slot: the count is the Chain's length, whatever each Link is contributing.
  it('is still counted by the live region', () => {
    renderEditor([silenced(SORT), silenced(GRAIN)])

    expect(screen.getByRole('status')).toHaveTextContent(`2 of ${MAX_CHAIN_LENGTH} effects`)
  })

  // The params are exactly what removing used to cost, so they stay in reach while the Link is
  // silent — tuning a Link you cannot hear yet is half of why the toggle is worth having.
  it('keeps its params editable in the panel', () => {
    renderEditor([silenced(SORT), GRAIN])

    expect(screen.getByLabelText('threshold')).toHaveValue('0.4')
    expect(screen.getByLabelText('run length')).toHaveValue('30')
  })
})

describe('the bypass toggle', () => {
  it('acts on the focused Link', () => {
    const actions = renderEditor([SORT, GRAIN])

    fireEvent.click(screen.getByRole('button', { name: 'bypass pixel sort' }))

    expect(actions.onToggleBypass).toHaveBeenCalledWith(SORT.id)
  })

  // A fixed name and a pressed state, the way animate is: a label flipping to "un-bypass" would
  // rename the control under a screen reader every time it was used.
  it('reports whether it is engaged rather than renaming itself', () => {
    renderEditor([SORT, GRAIN])

    expect(screen.getByRole('button', { name: 'bypass pixel sort' })).toHaveAttribute(
      'aria-pressed',
      'false',
    )
  })

  it('reports itself engaged for a Link that is bypassed', () => {
    renderEditor([silenced(SORT), GRAIN])

    expect(screen.getByRole('button', { name: 'bypass pixel sort' })).toHaveAttribute(
      'aria-pressed',
      'true',
    )
  })

  it('holds a 44x44 target', () => {
    renderEditor([SORT, GRAIN])

    expect(screen.getByRole('button', { name: 'bypass pixel sort' })).toHaveClass(
      'min-h-[44px]',
      'min-w-[44px]',
    )
  })

  // Unlike duplicate, which the cap and idempotence can withhold: silencing a Link is available
  // for every Link in every Chain, because it never adds anything.
  it('is offered for every Link, including the ones duplicate is withheld from', () => {
    renderEditor([SORT, GRAIN])

    expect(screen.getByRole('button', { name: /^duplicate pixel sort/ })).toBeDisabled()
    expect(screen.getByRole('button', { name: 'bypass pixel sort' })).toBeEnabled()
  })
})
