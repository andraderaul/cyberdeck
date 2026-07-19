import { fireEvent, render, screen, waitFor } from '@testing-library/react'
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
    expect(editor().value).toMatch(/message:/)
    expect(editor().value).toMatch(/"Hello from GOLEM/)
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

  it('exports the trace of the run so far', async () => {
    const written = captureDownloads()
    render(<App />)
    write(TINY)

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
