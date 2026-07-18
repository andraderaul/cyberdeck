import { ErrorBoundary } from '@cyberdeck/deck-kit/ui'
import Panel from './components/panel'

// Scaffold only: every region below is an inert shell. The Source editor, the Console grammar,
// the Machine and the panels' contents each land in their own ticket.
const PLACEHOLDER = 'not wired yet'

export default function App() {
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
            <Panel title="Source">{PLACEHOLDER}</Panel>
            {/* The Console is the operator's surface and the Terminal is the machine's. They sit
                apart so no one has to work out which of the two wrote a given line. */}
            <Panel title="Console">{PLACEHOLDER}</Panel>
          </div>

          <div className="grid min-h-0 grid-rows-[minmax(0,1fr)_auto_minmax(0,1fr)_minmax(0,1fr)] gap-3">
            <Panel title="Registers">{PLACEHOLDER}</Panel>
            <Panel title="Flags">{PLACEHOLDER}</Panel>
            <Panel title="Memory">{PLACEHOLDER}</Panel>
            <Panel title="Terminal">{PLACEHOLDER}</Panel>
          </div>
        </main>
      </div>
    </ErrorBoundary>
  )
}
