import { ErrorBoundary } from '@cyberdeck/deck-kit/ui'
import Console from './components/console'
import Panel from './components/panel'
import Registers from './components/registers'
import SourceEditor from './components/source-editor'
import { useConsole } from './hooks/use-console'

// The Terminal, Flags and Memory panels stay shells until #141, #143 and #138 fill them.
const PLACEHOLDER = 'not wired yet'

// A program narrow enough for the slice this ticket supports, and enough to watch a register
// change. The example that teaches the syntax properly arrives with #140.
const STARTER_SOURCE = ['addi r1, r0, 20', 'addi r2, r0, 22', 'add r3, r1, r2', 'int 0'].join('\n')

export default function App() {
  const console = useConsole(STARTER_SOURCE)

  return (
    <ErrorBoundary>
      <div className="flex h-full flex-col gap-3 p-3">
        <header className="shrink-0">
          <h1 className="font-bold text-lg tracking-widest">
            GOLEM<span className="text-violet">//</span>Console
          </h1>
          <p className="text-fg-muted text-xs">
            a 32-bit fantasy computer — watch the machine think
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
            <Console lines={console.lines} onSubmit={console.submit} />
          </div>

          <div className="grid min-h-0 grid-rows-[minmax(0,1fr)_auto_minmax(0,1fr)_minmax(0,1fr)] gap-3">
            <Registers machine={console.machine} />
            <Panel title="Flags">{PLACEHOLDER}</Panel>
            <Panel title="Memory">{PLACEHOLDER}</Panel>
            <Panel title="Terminal">{PLACEHOLDER}</Panel>
          </div>
        </main>
      </div>
    </ErrorBoundary>
  )
}
