import { ErrorBoundary } from '@cyberdeck/deck-kit/ui'
import { useEffect } from 'react'
import Console from './components/console'
import Flags from './components/flags'
import Memory from './components/memory'
import Registers from './components/registers'
import SourceEditor from './components/source-editor'
import Terminal from './components/terminal'
import { useConsole } from './hooks/use-console'
import { useSourceLoading } from './hooks/use-source-loading'

// Prints a string a byte at a time, so the Terminal has something to show on first load. The
// example that teaches the syntax properly, with its own tour, arrives with #140.
const STARTER_SOURCE = [
  '// GOLEM//Console — type `run` to watch it work.',
  'init:',
  '\tbun main',
  '\tnop',
  '\tnop',
  '\tnop',
  '',
  'main:',
  '\taddi r1, r0, message\t// word index of the text',
  '\tshl r1, r1, 2\t\t// word index -> byte address',
  '\taddi r2, r0, 8738\t// the Terminal, at byte 0x0000888B',
  '\tshl r2, r2, 2',
  '\taddi r2, r2, 3',
  '',
  'print:',
  '\tldb r3, r1, 0\t\t// next character',
  '\tcmpi r3, 0\t\t// the assembler NUL-terminated it',
  '\tbeq done',
  '\tstb r2, 0, r3\t\t// writing here emits a character',
  '\taddi r1, r1, 1',
  '\tbun print',
  '',
  'done:',
  '\tint 0',
  '',
  'message:',
  '\t"Hello from GOLEM\\n"',
].join('\n')

export default function App() {
  const loaded = useSourceLoading(STARTER_SOURCE)
  const console = useConsole(STARTER_SOURCE)
  const { replaceSource, note } = console

  // The Source resolves after first render, since reading a share link means decompressing it.
  useEffect(() => {
    if (!loaded.ready) {
      return
    }
    replaceSource(loaded.source)
    if (loaded.problem !== null) {
      note(loaded.problem, 'error')
    }
  }, [loaded, replaceSource, note])

  return (
    <ErrorBoundary>
      <div className="flex h-full flex-col gap-3 p-3">
        <header className="flex shrink-0 items-baseline justify-between gap-3">
          <div>
            <h1 className="font-bold text-lg tracking-widest">
              GOLEM<span className="text-violet">//</span>Console
            </h1>
            <p className="text-fg-muted text-xs">
              a 32-bit fantasy computer — watch the machine think
            </p>
          </div>
          <p className="font-mono text-fg-muted text-xs" aria-live="polite">
            {console.running ? <span className="text-violet">running</span> : 'idle'} · clock{' '}
            {console.rate === 'max' ? 'max' : `${console.rate}/s`}
          </p>
        </header>

        <main className="grid min-h-0 flex-1 grid-cols-1 gap-3 lg:grid-cols-[minmax(0,2fr)_minmax(0,1fr)]">
          <div className="grid min-h-0 grid-rows-[minmax(0,2fr)_minmax(0,1fr)] gap-3">
            <SourceEditor
              source={console.source}
              editable={console.editable}
              onChange={console.setSource}
            />
            {/* The Console is the operator's surface and the Terminal is the machine's. They sit
                apart so no one has to work out which of the two wrote a given line. */}
            <Console lines={console.lines} history={console.history} onSubmit={console.submit} />
          </div>

          <div className="grid min-h-0 grid-rows-[minmax(0,1fr)_auto_minmax(0,1fr)_minmax(0,1fr)] gap-3">
            <Registers machine={console.machine} />
            <Flags machine={console.machine} />
            <Memory machine={console.machine} />
            <Terminal machine={console.machine} />
          </div>
        </main>
      </div>
    </ErrorBoundary>
  )
}
