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

    await type('stepp')

    expect(screen.getByText(/did you mean "step"/)).toBeInTheDocument()
  })
})

// The driver itself is verified by running the app — testing rAF scheduling would test the
// browser. What is worth asserting here is the grammar around it and the state it leaves behind.
describe('the clock', () => {
  it('reports the default rate before anything runs', () => {
    render(<App />)

    expect(screen.getByText(/clock 8\/s/)).toBeInTheDocument()
  })

  it('changes the rate on command', async () => {
    render(<App />)

    await type('clock 40')

    expect(screen.getByText(/clock 40\/s/)).toBeInTheDocument()
  })

  it('accepts max', async () => {
    render(<App />)

    await type('clock max')

    expect(screen.getByText('clock set to max')).toBeInTheDocument()
  })

  it('explains the usage rather than guessing at a bad rate', async () => {
    render(<App />)

    await type('clock fast')

    expect(screen.getByText(/steps per second/)).toBeInTheDocument()
  })

  // The Clock is presentation state, not part of the Machine.
  it('keeps the rate across a reset', async () => {
    render(<App />)

    await type('clock 40')
    await type('asm')
    await type('reset')

    expect(screen.getByText(/clock 40\/s/)).toBeInTheDocument()
  })

  it('says so when stop is typed with nothing running', async () => {
    render(<App />)

    await type('stop')

    expect(screen.getByText('not running')).toBeInTheDocument()
  })

  it('assembles on run, so the editor locks without a separate asm', async () => {
    render(<App />)

    await type('run')

    expect(editor()).toHaveAttribute('readonly')
  })
})
