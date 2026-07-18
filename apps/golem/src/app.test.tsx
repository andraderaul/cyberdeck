import { fireEvent, render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { describe, expect, it } from 'vitest'
import App from './app'

/** Drives the Console the way an operator does — it is the only way in (ADR 0018). */
async function type(command: string) {
  const user = userEvent.setup()
  await user.type(screen.getByRole('textbox', { name: 'Console input' }), `${command}{Enter}`)
}

const editor = () => screen.getByRole('textbox', { name: 'Assembly source' })

/** Replaces the starter program, so a test does not depend on what the example happens to be. */
function write(source: string) {
  fireEvent.change(editor(), { target: { value: source } })
}

const TINY = ['addi r1, r0, 20', 'addi r2, r0, 22', 'add r3, r1, r2', 'int 0'].join('\n')

/** Walks a NUL-terminated string out to the Terminal, a byte at a time. Halts in ~27 steps. */
const PRINT_HI = [
  'addi r1, r0, message',
  'shl r1, r1, 2',
  'addi r2, r0, 8738', // the Terminal, at byte 0x0000888B
  'shl r2, r2, 2',
  'addi r2, r2, 3',
  'loop:',
  'ldb r3, r1, 0',
  'cmpi r3, 0',
  'beq done',
  'stb r2, 0, r3',
  'addi r1, r1, 1',
  'bun loop',
  'done:',
  'int 0',
  'message:',
  '"Hi\\n"',
].join('\n')

/** Sequential by necessity — each step depends on the machine the one before left behind. */
function stepTimes(count: number): Promise<void> {
  return Array.from({ length: count }).reduce<Promise<void>>(
    (previous) => previous.then(() => type('step')),
    Promise.resolve(),
  )
}

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
    expect(screen.getByRole('region', { name: 'Registers' })).toHaveTextContent(/No machine/)
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
    write(TINY)

    await type('asm')
    await type('step')

    // `addi r1, r0, 20` — the register panel shows the 20 land in r1.
    expect(screen.getByRole('region', { name: 'Registers' })).toHaveTextContent('0x00000014')
  })

  it('reports that there is no machine rather than failing silently', async () => {
    render(<App />)

    await type('step')

    expect(screen.getByText(/no machine/)).toBeInTheDocument()
  })

  it('does something sensible when the machine has halted', async () => {
    render(<App />)
    write(TINY)

    await type('asm')
    // Sequential by design — four instructions, then one step too many.
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

describe('the Terminal', () => {
  it('explains itself before a machine exists', () => {
    render(<App />)

    expect(screen.getByText(/Anything your program prints appears here/)).toBeInTheDocument()
  })

  it('shows what the running program printed, newline included', async () => {
    render(<App />)
    write(PRINT_HI)

    await type('asm')
    await stepTimes(30)

    // `toHaveTextContent` collapses whitespace, so the newline is checked on the raw text.
    const terminal = screen.getByRole('region', { name: 'Terminal' })
    expect(terminal).toHaveTextContent('Hi')
    expect(terminal.textContent).toContain('Hi\n')
  })

  it('accumulates output across steps rather than replacing it', async () => {
    render(<App />)
    write(PRINT_HI)

    await type('asm')
    await stepTimes(12)
    const early = screen.getByRole('region', { name: 'Terminal' }).textContent

    await stepTimes(18)
    const later = screen.getByRole('region', { name: 'Terminal' }).textContent

    expect(early).toContain('H')
    expect(later?.startsWith(early ?? '')).toBe(true)
    expect(later?.length).toBeGreaterThan(early?.length ?? 0)
  })

  it('clears along with the machine on reset', async () => {
    render(<App />)
    write(PRINT_HI)

    await type('asm')
    await stepTimes(30)
    expect(screen.getByRole('region', { name: 'Terminal' })).toHaveTextContent('Hi')

    await type('reset')

    expect(screen.getByText(/Anything your program prints appears here/)).toBeInTheDocument()
  })

  // The separation is the feature: the Console is the tool talking, the Terminal is the program.
  it('keeps the program’s output out of the Console', async () => {
    render(<App />)
    write(PRINT_HI)

    await type('asm')
    await stepTimes(30)

    expect(screen.getByRole('region', { name: 'Console' })).not.toHaveTextContent('Hi\n')
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
