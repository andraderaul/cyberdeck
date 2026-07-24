import { fireEvent, render, screen, waitFor, within } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { afterEach, describe, expect, it, vi } from 'vitest'
import App from './app'
import { decode, encode } from './golem/share'

/** Reads a share URL back to the source it carries. */
async function decodeFragment(url: string): Promise<string> {
  const result = await decode(url.slice(url.indexOf('#') + 1))
  if (!result.ok) {
    throw new Error(result.message)
  }
  return result.source
}

/** Drives the Console the way an operator does — it is the only way in (ADR 0018). */
async function type(command: string) {
  const user = userEvent.setup()
  await user.type(screen.getByRole('textbox', { name: 'Console input' }), `${command}{Enter}`)
}

const editor = () => screen.getByRole('textbox', { name: 'Assembly source' }) as HTMLTextAreaElement

/**
 * Locked means the Source is no longer editable at all: it becomes a listing with a gutter, so
 * there is no textbox to type into rather than a disabled one.
 */
const locked = () =>
  screen.queryByRole('textbox', { name: 'Assembly source' }) === null &&
  screen.queryByRole('region', { name: 'Source — locked' }) !== null

/** The Source as it reads on screen, whether it is a textarea or a locked listing. */
const sourceText = () =>
  (screen.queryByRole('textbox', { name: 'Assembly source' }) as HTMLTextAreaElement | null)
    ?.value ??
  screen.getByRole('region', { name: /^Source/ }).textContent ??
  ''

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

    for (const region of ['Console', 'Registers', 'Flags', 'Devices', 'Memory', 'Terminal']) {
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

    expect(locked()).toBe(true)
    expect(screen.getByText(/A Machine is running this code/)).toBeInTheDocument()
  })

  it('unlocks the editor on reset', async () => {
    render(<App />)

    await type('asm')
    await type('reset')

    expect(editor()).not.toHaveAttribute('readonly')
  })

  // An empty Source assembles to zero words without error, and a machine over that image never
  // halts — every fetch is an implicit nop and no `int 0` ever arrives. Both commands refuse
  // instead of locking the editor over nothing.
  it('refuses to assemble a Source with no instructions', async () => {
    render(<App />)

    write('')
    await type('asm')

    expect(
      screen.getByText('nothing to assemble — the Source has no instructions'),
    ).toBeInTheDocument()
    expect(locked()).toBe(false)
  })

  it('refuses to run a Source of only comments, rather than running forever', async () => {
    render(<App />)

    write('// no instructions here\n\n')
    await type('run')

    expect(
      screen.getByText('nothing to assemble — the Source has no instructions'),
    ).toBeInTheDocument()
    expect(locked()).toBe(false)
    expect(screen.queryByText(/running at/)).not.toBeInTheDocument()
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

describe('the cache command', () => {
  it('reports the mode on by default when no machine exists', async () => {
    render(<App />)

    await type('cache')

    expect(screen.getByText(/cache is on/)).toBeInTheDocument()
  })

  it('toggles the mode while no machine exists, and the next run obeys it', async () => {
    render(<App />)
    write(TINY)

    await type('cache off')
    expect(screen.getByText('cache off — the next run runs without the lens')).toBeInTheDocument()

    await type('asm')
    await type('cache')

    // A machine created with the mode off carries no cache to report.
    expect(screen.getByText('cache is off for this machine')).toBeInTheDocument()
  })

  it('reports the live machine statistics for a cache-on run', async () => {
    render(<App />)
    write(TINY)

    await type('asm')
    await type('step')
    await type('cache')

    // The instruction cache always has at least the fetches, so its boletim is present.
    expect(screen.getByText(/\[CACHE I STATISTICS\]/)).toBeInTheDocument()
  })

  it('refuses to toggle while a machine exists — a trace is never half-wrapped', async () => {
    render(<App />)
    write(TINY)

    await type('asm')
    await type('cache off')

    expect(screen.getByText(/a machine exists — reset first/)).toBeInTheDocument()
  })

  it('suggests cache on a near miss', async () => {
    render(<App />)

    await type('cach')

    expect(screen.getByText(/did you mean "cache"/)).toBeInTheDocument()
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

describe('load', () => {
  it('lists the programs when given no name', async () => {
    render(<App />)

    await type('load')

    expect(screen.getByText(/watchdog/)).toBeInTheDocument()
    expect(screen.getByText(/an infinite loop losing to a countdown/)).toBeInTheDocument()
  })

  it('puts the named program in the editor', async () => {
    render(<App />)

    await type('load watchdog')

    expect(sourceText()).toContain('forever_loop')
    expect(screen.getByText(/loaded watchdog/)).toBeInTheDocument()
  })

  // The three-state model holds by construction: with a Machine alive the editor is locked, so
  // there is nothing to load into and running code can never change underneath the operator.
  it('refuses while a machine exists, and says what to do about it', async () => {
    render(<App />)
    write(TINY)

    await type('asm')
    await type('load watchdog')

    expect(screen.getByText(/a machine is running — reset first/)).toBeInTheDocument()
    expect(sourceText()).not.toContain('forever_loop')
  })

  it('loads after a reset', async () => {
    render(<App />)

    await type('asm')
    await type('reset')
    await type('load watchdog')

    expect(sourceText()).toContain('forever_loop')
  })

  it('suggests the nearest name for a typo', async () => {
    render(<App />)

    await type('load watchdg')

    expect(screen.getByText(/did you mean "watchdog"/)).toBeInTheDocument()
  })

  it('points at the listing when a name is nothing like a real one', async () => {
    render(<App />)

    await type('load elephant')

    expect(screen.getByText(/try "load" to list them/)).toBeInTheDocument()
  })

  // The signature scene is meant to be one command from a cold start, so the untouched starter
  // example does not count as work worth protecting.
  it('replaces the starter example without ceremony', async () => {
    render(<App />)

    await type('load watchdog')

    expect(sourceText()).toContain('forever_loop')
  })

  it('refuses once before overwriting something the operator wrote', async () => {
    render(<App />)
    write(TINY)

    await type('load watchdog')

    expect(screen.getByText(/would replace what you have written/)).toBeInTheDocument()
    expect(sourceText()).toContain('addi r1, r0, 20')
  })

  it('goes through when the same load is confirmed', async () => {
    render(<App />)
    write(TINY)

    await type('load watchdog')
    await type('load watchdog')

    expect(sourceText()).toContain('forever_loop')
  })

  it('forgets a pending confirmation once something else is typed', async () => {
    render(<App />)
    write(TINY)

    await type('load watchdog')
    await type('breaks')
    await type('load watchdog')

    expect(sourceText()).toContain('addi r1, r0, 20')
  })

  it('assembles what it loaded', async () => {
    render(<App />)

    await type('load hello_world')
    await type('asm')

    expect(screen.getByText(/assembled \d+ words/)).toBeInTheDocument()
  })
})

describe('the Devices panel', () => {
  const panel = () => screen.getByRole('region', { name: 'Devices' })

  it('is there before a machine exists, reading as idle', () => {
    render(<App />)

    expect(panel()).toHaveTextContent(/off/)
    expect(panel()).toHaveTextContent(/idle/)
  })

  // The signature scene, end to end: a countdown racing an infinite loop.
  it('shows the watchdog counting down during a run', async () => {
    render(<App />)

    await type('load watchdog')
    await type('asm')
    await stepTimes(12)

    expect(panel()).toHaveTextContent(/armed/)
    const early = panel().textContent
    await stepTimes(5)

    expect(panel().textContent).not.toBe(early)
  })

  it('shows the FPU registers as decoded floats, raw word beside them', async () => {
    render(<App />)

    await type('load fpu')
    await type('asm')
    await stepTimes(40)

    // 74 / 8 — the value the reference program computes first.
    expect(panel()).toHaveTextContent(/9\.25/)
    expect(panel()).toHaveTextContent(/0x41140000/)
  })

  // ADR 0018: every surface but the Source editor is read-only, and Devices more strictly than
  // most — even the Console never writes a device register.
  it('offers no interactive affordance at all', () => {
    render(<App />)

    expect(within(panel()).queryByRole('button')).not.toBeInTheDocument()
    expect(within(panel()).queryByRole('textbox')).not.toBeInTheDocument()
    expect(within(panel()).queryByRole('checkbox')).not.toBeInTheDocument()
  })
})

describe('debugging an ISR', () => {
  // An ISR is code on a line like any other, so it needs no new grammar to debug — `break` on the
  // handler's line is the whole feature.
  const WITH_HANDLER = [
    'bun main', // 1
    'nop', // 2
    'nop', // 3
    'isr r31, r30, handler', // 4
    'handler:', // 5
    'addi r9, r0, 1', // 6
    'reti r31', // 7
    'main:', // 8
    'enai r1', // 9
    'int 7', // 10
    'int 0', // 11
  ].join('\n')

  it('pauses a run inside the handler', async () => {
    render(<App />)
    write(WITH_HANDLER)

    await type('break 6')
    await type('run')

    expect(await screen.findByText(/paused at line 6/)).toBeInTheDocument()
  })

  it('narrates the dispatch that got it there', async () => {
    render(<App />)
    write(WITH_HANDLER)

    await type('break 6')
    await type('run')

    expect(await screen.findByText(/software interrupt — cause 0x00000007/)).toBeInTheDocument()
  })
})

describe('interrupt narration', () => {
  // `enai` is #208's; this enables IE the way the macro will expand, so the narration can be
  // tested on the semantics that already exist.
  const DISPATCHES = [
    'addi r1, r0, 64',
    'or fr, fr, r1',
    'int 2',
    'int 0',
    'int 0',
    'sw:',
    'int 0',
  ].join('\n')

  it('narrates a dispatch on the Console, naming cause and vector', async () => {
    render(<App />)
    write(DISPATCHES)

    await type('asm')
    await stepTimes(3)

    expect(
      screen.getByText(/software interrupt — cause 0x00000002, vector 0x0000000C/),
    ).toBeInTheDocument()
  })

  // The Terminal is the program's own output; a dispatch is something that happened *to* it.
  // The v1 separation of the two surfaces holds in v2 (ADR 0018).
  it('keeps the narration off the Terminal', async () => {
    render(<App />)
    write(DISPATCHES)

    await type('asm')
    await stepTimes(3)

    expect(screen.getByRole('region', { name: 'Terminal' }).textContent).not.toMatch(
      /software interrupt/,
    )
  })

  it('says nothing when a step interrupts nothing', async () => {
    render(<App />)
    write(TINY)

    await type('asm')
    await stepTimes(3)

    expect(screen.queryByText(/software interrupt/)).not.toBeInTheDocument()
  })

  it('shows the dispatch in cr and ipc like any other register', async () => {
    render(<App />)
    write(DISPATCHES)

    await type('asm')
    await stepTimes(3)
    await type('reg cr')
    await type('reg ipc')

    expect(screen.getByText(/cr\s*=\s*0x00000002/i)).toBeInTheDocument()
    expect(screen.getByText(/ipc\s*=\s*0x0000000C/i)).toBeInTheDocument()
  })
})

describe('breakpoints and the current line', () => {
  /** The line the PC is on, as the listing marks it. */
  const markedLine = () => document.querySelector('[aria-current="step"]')

  it('marks the line the PC is on, and moves it as the machine steps', async () => {
    render(<App />)
    write(TINY)

    await type('asm')
    expect(markedLine()?.textContent).toContain('addi r1, r0, 20')

    await type('step')
    expect(markedLine()?.textContent).toContain('addi r2, r0, 22')

    await type('step')
    expect(markedLine()?.textContent).toContain('add r3, r1, r2')
  })

  it('sets a breakpoint and pauses a run there', async () => {
    render(<App />)
    write(TINY)

    await type('asm')
    await type('break 3')
    await type('clock max')
    await type('run')

    await waitFor(() => expect(screen.getByText('paused at line 3')).toBeInTheDocument())
    // Paused *before* running line 3, so r3 has not been written yet.
    expect(markedLine()?.textContent).toContain('add r3, r1, r2')
  })

  // The check runs before the step, so even the first instruction of a fresh run can pause.
  it('pauses a fresh run at a breakpoint on the entry line', async () => {
    render(<App />)
    write(TINY)

    await type('asm')
    await type('break 1')
    await type('run')

    await waitFor(() => expect(screen.getByText('paused at line 1')).toBeInTheDocument())
    expect(markedLine()?.textContent).toContain('addi r1, r0, 20')

    await type('run')
    await waitFor(() => expect(screen.getByText('halted')).toBeInTheDocument())
  })

  it('leaves the machine steppable and runnable from a pause', async () => {
    render(<App />)
    write(TINY)

    await type('asm')
    await type('break 3')
    await type('run')
    await waitFor(() => expect(screen.getByText('paused at line 3')).toBeInTheDocument())

    await type('step')

    expect(markedLine()?.textContent).toContain('int 0')
  })

  it('does not trip the same breakpoint again on resume', async () => {
    render(<App />)
    write(TINY)

    await type('asm')
    await type('break 3')
    await type('clock max')
    await type('run')
    await waitFor(() => expect(screen.getByText('paused at line 3')).toBeInTheDocument())

    await type('run')

    await waitFor(() => expect(screen.getByText('halted')).toBeInTheDocument())
  })

  it('reports a line with no instruction rather than ignoring it', async () => {
    render(<App />)
    write('addi r1, r0, 1\n\n// just a comment\nint 0')

    await type('asm')
    await type('break 3')

    expect(screen.getByText(/line 3 has no instruction to stop at/)).toBeInTheDocument()
  })

  it('lists and clears breakpoints', async () => {
    render(<App />)
    write(TINY)

    await type('asm')
    await type('break 1')
    await type('break 3')
    await type('breaks')
    expect(screen.getByText('breakpoints: 1, 3')).toBeInTheDocument()

    await type('unbreak 1')
    await type('breaks')
    expect(screen.getByText('breakpoints: 3')).toBeInTheDocument()

    await type('unbreak all')
    await type('breaks')
    expect(screen.getByText('no breakpoints')).toBeInTheDocument()
  })

  it('says so when clearing a breakpoint that is not set', async () => {
    render(<App />)

    await type('unbreak 9')

    expect(screen.getByText(/no breakpoint at line 9/)).toBeInTheDocument()
  })

  // Repeated debugging runs are the normal case; re-entering them each time would be useless.
  it('keeps breakpoints across a reset', async () => {
    render(<App />)
    write(TINY)

    await type('asm')
    await type('break 3')
    await type('reset')
    await type('breaks')

    expect(screen.getByText('breakpoints: 3')).toBeInTheDocument()
  })
})

describe('discoverability', () => {
  it('names help in the Console’s first line', () => {
    render(<App />)

    expect(screen.getByRole('region', { name: 'Console' })).toHaveTextContent(/help/)
  })

  it('prints the command reference on help', async () => {
    render(<App />)

    await type('help')

    const console = screen.getByRole('region', { name: 'Console' })
    for (const name of ['asm', 'run', 'stop', 'step', 'clock', 'reg', 'mem', 'export', 'share']) {
      expect(console).toHaveTextContent(name)
    }
  })

  it('explains a single command on help <command>', async () => {
    render(<App />)

    await type('help clock')

    expect(screen.getByRole('region', { name: 'Console' })).toHaveTextContent(
      /clock max.*frame budget/s,
    )
  })

  it('nudges on help for something that is not a command', async () => {
    render(<App />)

    await type('help banana')

    expect(screen.getByText(/no command called "banana"/)).toBeInTheDocument()
  })

  it('loads an example that assembles and runs', async () => {
    render(<App />)

    await type('asm')

    // The example demonstrates labels, data, a string and the Terminal.
    expect(sourceText()).toMatch(/message:/)
    expect(sourceText()).toMatch(/"Hello from GOLEM/)
    expect(screen.getByText(/assembled \d+ words/)).toBeInTheDocument()
  })

  it('walks history with the arrow keys', async () => {
    const user = userEvent.setup()
    render(<App />)

    await type('clock 30')
    await type('help')

    const input = screen.getByRole('textbox', { name: 'Console input' })
    input.focus()

    await user.keyboard('{ArrowUp}')
    expect(input).toHaveValue('help')

    await user.keyboard('{ArrowUp}')
    expect(input).toHaveValue('clock 30')

    await user.keyboard('{ArrowDown}')
    expect(input).toHaveValue('help')
  })

  it('returns to what was being typed on the way back down', async () => {
    const user = userEvent.setup()
    render(<App />)

    await type('help')

    const input = screen.getByRole('textbox', { name: 'Console input' })
    await user.type(input, 'reg r')
    await user.keyboard('{ArrowUp}')
    expect(input).toHaveValue('help')

    await user.keyboard('{ArrowDown}')
    expect(input).toHaveValue('reg r')
  })
})

// Each of these came out of the review of the v1 branch — they were all silent failures.
describe('regressions', () => {
  it('prints the command reference on load, not merely a pointer to it', () => {
    render(<App />)

    // "discover commands without a manual" means the list itself, not a mention of `help`.
    const console = screen.getByRole('region', { name: 'Console' })
    expect(console).toHaveTextContent('commands:')
    expect(console).toHaveTextContent('mem <start> [count] [words|bytes]')
  })

  it('answers a second asm instead of going silent', async () => {
    render(<App />)

    await type('asm')
    await type('asm')

    expect(screen.getByText(/already assembled/)).toBeInTheDocument()
  })

  it('says a breakpoint set before assembling has not been checked yet', async () => {
    render(<App />)

    await type('break 999')

    expect(screen.getByText(/unchecked until you assemble/)).toBeInTheDocument()
  })

  it('shows registers through the same formatter the Console uses', async () => {
    render(<App />)
    write(TINY)

    await type('asm')
    await type('step')
    await type('reg r1')

    // Both surfaces render 20 as 0x00000014; the panel used to hand-roll its own padding.
    expect(screen.getByRole('region', { name: 'Registers' })).toHaveTextContent('0x00000014')
    expect(screen.getByRole('region', { name: 'Console' }).textContent).toContain('0x00000014')
  })
})

describe('sharing and persistence', () => {
  afterEach(() => {
    window.location.hash = ''
    window.localStorage.clear()
  })

  /** The URL `share` printed. Read from the Console rather than the clipboard, because
   *  `userEvent.setup()` installs its own clipboard stub over any spy a test puts there. */
  async function sharedUrl(): Promise<string> {
    const link = await screen.findByText(/^https?:\/\//)
    return link.textContent ?? ''
  }

  it('produces a share link carrying the program', async () => {
    render(<App />)
    write(TINY)

    await type('share')

    expect(await decodeFragment(await sharedUrl())).toBe(TINY)
  })

  it('copies the link and says so', async () => {
    render(<App />)

    await type('share')

    expect(await screen.findByText(/copied to the clipboard/)).toBeInTheDocument()
  })

  it('puts the link in the address bar so a reload keeps it', async () => {
    render(<App />)
    write(TINY)

    await type('share')
    await sharedUrl()

    expect(await decodeFragment(window.location.hash)).toBe(TINY)
  })

  it('loads the program from a share link, unlocked and ready', async () => {
    window.location.hash = `#${await encode(TINY)}`

    render(<App />)

    await waitFor(() => expect(editor()).toHaveValue(TINY))
    expect(editor()).not.toHaveAttribute('readonly')
  })

  it('reports a corrupt link rather than showing a blank page', async () => {
    window.location.hash = '#not-a-real-fragment'

    render(<App />)

    expect(await screen.findByText(/corrupt or truncated/)).toBeInTheDocument()
    // Still usable: the editor falls back to something runnable.
    expect(editor()).not.toHaveAttribute('readonly')
  })

  it('restores the source after a reload', async () => {
    const { unmount } = render(<App />)
    write('addi r9, r0, 99\nint 0')
    unmount()

    render(<App />)

    await waitFor(() => expect(editor()).toHaveValue('addi r9, r0, 99\nint 0'))
  })

  // A link someone sent is an explicit request to see *their* program.
  it('lets a share link win over saved work', async () => {
    const { unmount } = render(<App />)
    write('addi r9, r0, 99\nint 0')
    unmount()

    window.location.hash = `#${await encode(TINY)}`
    render(<App />)

    await waitFor(() => expect(editor()).toHaveValue(TINY))
  })

  // Story 39: an edit makes the fragment stale, so a reload restores the newer work rather than
  // silently reverting to the shared snapshot.
  it('lets edited work win over the share link on reload', async () => {
    window.location.hash = `#${await encode(TINY)}`
    const { unmount } = render(<App />)
    await waitFor(() => expect(editor()).toHaveValue(TINY))

    write('addi r9, r0, 99\nint 0')
    expect(window.location.hash).toBe('')
    unmount()

    render(<App />)

    await waitFor(() => expect(editor()).toHaveValue('addi r9, r0, 99\nint 0'))
  })
})

describe('exporting', () => {
  /** Captures what a download would have written, without touching the filesystem. */
  function captureDownloads() {
    const written: { filename: string; contents: string }[] = []

    vi.spyOn(URL, 'createObjectURL').mockReturnValue('blob:stub')
    vi.spyOn(URL, 'revokeObjectURL').mockImplementation(() => {})
    vi.spyOn(HTMLAnchorElement.prototype, 'click').mockImplementation(function (
      this: HTMLAnchorElement,
    ) {
      written.push({ filename: this.download, contents: lastBlobText })
    })

    let lastBlobText = ''
    const RealBlob = globalThis.Blob
    vi.stubGlobal(
      'Blob',
      class extends RealBlob {
        constructor(parts: BlobPart[], options?: BlobPropertyBag) {
          super(parts, options)
          lastBlobText = parts.join('')
        }
      },
    )

    return written
  }

  afterEach(() => {
    vi.restoreAllMocks()
    vi.unstubAllGlobals()
  })

  it('exports the assembled image in the reference hex format', async () => {
    const written = captureDownloads()
    render(<App />)
    write(TINY)

    await type('asm')
    await type('export hex')

    expect(written[0].filename).toBe('golem-image.hex')
    // add r3, r1, r2 -> z=3, x=1, y=2, so 0xC22 in the low bits.
    expect(written[0].contents).toBe(
      ['0x04005020', '0x04005840', '0x00000C22', '0xFC000000', ''].join('\n'),
    )
  })

  // With the cache off the trace is the v2 log, unchanged — the toggle is additive, never
  // retroactive (spec story 20). The cache-on export is exercised just below.
  it('exports the trace of the run so far, byte-identical to v2 with the cache off', async () => {
    const written = captureDownloads()
    render(<App />)
    write(TINY)

    await type('cache off')
    await type('asm')
    await type('step')
    await type('step')
    await type('export trace')

    const lines = written[0].contents.trimEnd().split('\n')
    expect(written[0].filename).toBe('golem-trace.txt')
    expect(lines[0]).toBe('[START OF SIMULATION]')
    expect(lines[lines.length - 1]).toBe('[END OF SIMULATION]')
    expect(lines[1]).toBe('addi r1, r0, 20')
    expect(lines[2]).toMatch(/^\[F\] FR = 0x00000000, R1 = R0 \+ 0x0014 = 0x00000014$/)
  })

  // Default on: the exported trace carries the cache event lines before each instruction (story 19).
  it('exports the cache event lines when the mode is on', async () => {
    const written = captureDownloads()
    render(<App />)
    write(TINY)

    await type('asm')
    await type('step')
    await type('export trace')

    const lines = written[0].contents.trimEnd().split('\n')
    expect(lines[1]).toBe('[CACHE I LINE 0 READ MISS @ 0x00000000]')
    expect(lines).toContain('addi r1, r0, 20')
    expect(lines[lines.length - 2]).toMatch(/^\[CACHE D STATISTICS\]/)
    expect(lines[lines.length - 1]).toMatch(/^\[CACHE I STATISTICS\]/)
  })

  it.each([
    ['export hex', /no image/],
    ['export trace', /no machine/],
  ])('reports clearly when %s has nothing to write', async (command, message) => {
    render(<App />)

    await type(command)

    expect(screen.getByText(message)).toBeInTheDocument()
  })

  it('explains the usage for an unknown export', async () => {
    render(<App />)

    await type('export everything')

    expect(screen.getByText(/usage: export hex/)).toBeInTheDocument()
  })
})

describe('state inspection', () => {
  it('prints one register in hex and decimal', async () => {
    render(<App />)
    write(TINY)

    await type('asm')
    await type('step')
    await type('reg r1')

    expect(screen.getByRole('region', { name: 'Console' }).textContent).toContain(
      'r1 = 0x00000014  (20)',
    )
  })

  it('reports an unknown register name clearly', async () => {
    render(<App />)

    await type('asm')
    await type('reg banana')

    expect(screen.getByText(/no register called "banana"/)).toBeInTheDocument()
  })

  it('dumps a range of memory as words', async () => {
    render(<App />)
    write(TINY)

    await type('asm')
    await type('mem 0 4')

    // The first word of TINY is `addi r1, r0, 20`.
    expect(screen.getByRole('region', { name: 'Console' })).toHaveTextContent('0x04005020')
  })

  it('dumps the same region as bytes when asked', async () => {
    render(<App />)

    await type('asm')
    await type('mem 0 16 bytes')

    // A byte dump carries an ASCII gutter, which a word dump does not.
    expect(screen.getByRole('region', { name: 'Console' }).textContent).toMatch(/\|.{16}\|/)
  })

  it('explains the usage rather than guessing at a bad range', async () => {
    render(<App />)

    await type('mem nowhere')

    expect(screen.getByText(/usage: mem/)).toBeInTheDocument()
  })

  it('shows flags by name rather than as a hex value', async () => {
    render(<App />)

    const flags = screen.getByRole('region', { name: 'Flags' })
    for (const name of ['EQ', 'LT', 'GT', 'ZD', 'OV', 'IV']) {
      expect(flags).toHaveTextContent(name)
    }
  })

  it('lights the flag a comparison sets', async () => {
    render(<App />)
    write(['addi r1, r0, 1', 'cmp r1, r1', 'int 0'].join('\n'))

    await type('asm')
    await type('step')
    await type('step')
    await type('reg fr')

    // cmp of equal values sets EQ, which is bit 0.
    expect(screen.getByText(/fr = 0x00000001/)).toBeInTheDocument()
  })

  it('shows a memory window that follows the machine', async () => {
    render(<App />)
    write(TINY)

    await type('asm')

    expect(screen.getByRole('region', { name: 'Memory' })).toHaveTextContent('0x04005020')
  })

  // ADR 0018: no panel is interactive; the Console is the only way to look elsewhere.
  it('keeps every state panel free of controls', () => {
    render(<App />)

    for (const name of ['Registers', 'Flags', 'Memory', 'Terminal']) {
      const panel = screen.getByRole('region', { name })
      expect(panel.querySelectorAll('button, a, input, textarea, select')).toHaveLength(0)
    }
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

    expect(screen.getByText(/takes a whole number of steps per second/)).toBeInTheDocument()
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

    expect(locked()).toBe(true)
  })
})
