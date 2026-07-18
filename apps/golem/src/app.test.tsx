import { render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { describe, expect, it } from 'vitest'
import App from './app'

/** Drives the Console the way an operator does — it is the only way in (ADR 0018). */
async function type(command: string) {
  const user = userEvent.setup()
  await user.type(screen.getByRole('textbox', { name: 'Console input' }), `${command}{Enter}`)
}

const editor = () => screen.getByRole('textbox', { name: 'Assembly source' })

describe('App', () => {
  it('renders a region for each surface the program needs', () => {
    render(<App />)

    for (const region of ['Console', 'Registers', 'Flags', 'Memory', 'Terminal']) {
      expect(screen.getByRole('region', { name: region })).toBeInTheDocument()
    }
    expect(screen.getByRole('region', { name: /^Source/ })).toBeInTheDocument()
  })

  // ADR 0018: the Console is the only control grammar, so the shell ships no buttons.
  it('exposes no interactive control outside the Console', () => {
    render(<App />)

    expect(screen.queryAllByRole('button')).toHaveLength(0)
  })
})

describe('the three-state model', () => {
  it('starts with a writable editor and no machine', () => {
    render(<App />)

    expect(editor()).not.toHaveAttribute('readonly')
    expect(screen.getByText(/No machine/)).toBeInTheDocument()
  })

  it('locks the editor once asm creates a Machine, and says why', async () => {
    render(<App />)

    await type('asm')

    expect(editor()).toHaveAttribute('readonly')
    expect(screen.getByRole('region', { name: 'Source — locked' })).toBeInTheDocument()
    expect(screen.getByText(/A Machine is running this code/)).toBeInTheDocument()
  })

  it('unlocks the editor on reset', async () => {
    render(<App />)

    await type('asm')
    await type('reset')

    expect(editor()).not.toHaveAttribute('readonly')
  })
})

describe('stepping', () => {
  it('advances one instruction and shows the register change', async () => {
    render(<App />)

    await type('asm')
    await type('step')

    // The starter program's first instruction is `addi r1, r0, 20`.
    expect(screen.getByText('0x00000014')).toBeInTheDocument()
  })

  it('reports that there is no machine rather than failing silently', async () => {
    render(<App />)

    await type('step')

    expect(screen.getByText(/no machine/)).toBeInTheDocument()
  })

  it('does something sensible when the machine has halted', async () => {
    render(<App />)

    await type('asm')
    // Sequential by design — the starter program is four instructions, then one step too many.
    await type('step')
    await type('step')
    await type('step')
    await type('step')
    await type('step')

    expect(screen.getByText('machine halted — reset to run again')).toBeInTheDocument()
  })

  it('suggests the nearest command for a typo', async () => {
    render(<App />)

    await type('stp')

    expect(screen.getByText(/did you mean "step"/)).toBeInTheDocument()
  })
})
