import { formatMemoryDump } from '../golem/inspect'
import type { Machine } from '../golem/machine'
import Panel from './panel'

type MemoryProps = {
  machine: Machine | null
}

// Word 0 is the interrupt vector, so a program's own code starts right here — the region worth
// watching by default. `mem` reaches anywhere else.
const PANEL_START = 0
const PANEL_WORDS = 32

/**
 * A window on memory that updates as the machine runs. Deliberately a fixed region: the Console's
 * `mem` command is how you look elsewhere, because no panel accepts input (ADR 0018).
 */
export default function Memory({ machine }: MemoryProps) {
  if (machine === null) {
    return (
      <Panel title="Memory">
        <p className="text-fg-muted text-xs">No machine. Run `asm` to create one.</p>
      </Panel>
    )
  }

  const lines = formatMemoryDump(machine.memory, PANEL_START, PANEL_WORDS, 'words')

  return (
    <Panel title="Memory">
      <pre className="max-w-full overflow-x-auto font-mono text-xs leading-relaxed">
        {lines.join('\n')}
      </pre>
    </Panel>
  )
}
