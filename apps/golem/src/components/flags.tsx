import { cn } from '@cyberdeck/deck-kit/utils'
import { flagsOf } from '../golem/inspect'
import type { Machine } from '../golem/machine'
import Panel from './panel'

type FlagsProps = {
  machine: Machine | null
}

/**
 * The flags by name rather than as a hex value, so it is readable at a glance why a branch was
 * or was not taken. Read-only, like every panel but the Source (ADR 0018).
 */
export default function Flags({ machine }: FlagsProps) {
  const flags = flagsOf(machine)

  return (
    <Panel title="Flags">
      <ul className="flex flex-wrap gap-1.5 font-mono text-xs">
        {flags.map((flag) => (
          <li
            key={flag.name}
            title={flag.meaning}
            className={cn(
              'border px-1.5 py-0.5',
              flag.set ? 'border-violet bg-violet/15 text-violet' : 'border-base text-fg-subtle',
            )}
          >
            {flag.name}
          </li>
        ))}
      </ul>
    </Panel>
  )
}
