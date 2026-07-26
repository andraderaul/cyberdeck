import { cn } from '@cyberdeck/deck-kit/utils'
import type { CacheAccess, CacheKind, CacheResult } from '../golem/cache'
import {
  type CacheAccessView,
  type CacheSetView,
  type CacheStripCell,
  type CacheView,
  cacheView,
} from '../golem/cache-view'
import type { Machine } from '../golem/machine'
import Panel from './panel'

type CacheProps = {
  machine: Machine | null
  /** The access to foreground this Step, from the last Step's events — see `spotlightOf`. */
  spotlight: CacheAccess | null
}

/**
 * The lens made watchable: the Line the Step touched, spotlit with both Sets in full, plus a
 * compact strip of the other seven. The spotlight follows the action, so a miss becoming a hit and
 * an eviction happen on screen. Read-only like every panel but the Source (ADR 0018) — the cache
 * is not addressable by anyone, so there is not even a device register to write.
 */
export default function Cache({ machine, spotlight }: CacheProps) {
  const view = cacheView(machine, spotlight)

  return (
    <Panel title="Cache">
      {view.status === 'no-machine' ? (
        <p className="text-fg-muted text-xs">No machine. Run `asm` to create one.</p>
      ) : view.status === 'off' ? (
        <p className="text-fg-muted text-xs">
          Cache off for this machine — `reset`, then `cache on`.
        </p>
      ) : (
        <Lens view={view} />
      )}
    </Panel>
  )
}

// HIT is cheap and affirmative; a MISS reached all the way to memory, so it carries the cost —
// amber, and a breath (ADR 0023: the cost of a miss lives here, in the presentation, never in step).
const hitColour = (result: CacheResult) => (result === 'HIT' ? 'text-cyan' : 'text-warning')

function Lens({ view }: { view: CacheView }) {
  return (
    <div className="flex flex-col gap-sm">
      <Header foreground={view.foreground} line={view.line} access={view.access} />
      <div className="grid gap-xs sm:grid-cols-2">
        {view.sets.map((set) => (
          <SetCell key={set.index} set={set} result={view.access?.result ?? null} />
        ))}
      </div>
      <Strip cells={view.strip} foreground={view.foreground} />
    </div>
  )
}

function Header({
  foreground,
  line,
  access,
}: {
  foreground: CacheKind
  line: number
  access: CacheAccessView | null
}) {
  return (
    <div className="flex items-baseline justify-between gap-sm font-mono text-xs">
      <span className="text-fg-muted">
        <span className="text-violet">{foreground === 'D' ? 'DATA' : 'INSTR'}</span> · line {line}
      </span>
      {access === null ? (
        <span className="text-fg-subtle">awaiting first access</span>
      ) : (
        <span
          role="status"
          className={cn(hitColour(access.result), access.result === 'MISS' && 'animate-pulse')}
          aria-label={`${access.op} ${access.result} at ${access.address}`}
        >
          {access.op} {access.result} <span className="text-fg-subtle">@ {access.address}</span>
        </span>
      )}
    </div>
  )
}

function SetCell({ set, result }: { set: CacheSetView; result: CacheResult | null }) {
  return (
    <div
      className={cn(
        'border p-xs font-mono text-xs',
        set.valid ? 'border-base bg-elevated' : 'border-base/50 text-fg-subtle',
      )}
    >
      <div className="mb-1 flex justify-between">
        <span className={set.valid ? 'text-fg-muted' : 'text-fg-subtle'}>set {set.index}</span>
        <span className={cn(set.valid ? 'text-fg-muted' : 'text-fg-subtle')}>
          {set.valid ? 'VALID' : 'INVALID'}
          {result !== null && <span className={cn('ml-1.5', hitColour(result))}>●</span>}
        </span>
      </div>
      <div className="mb-1 flex justify-between text-fg-subtle">
        <span>age {set.age}</span>
        <span>tag {set.tag}</span>
      </div>
      <div className="grid grid-cols-2 gap-x-2 tabular-nums">
        {set.data.map((word, index) => (
          // Positional: the four words of a block have no identity but their slot.
          // biome-ignore lint/suspicious/noArrayIndexKey: fixed 4-word block, index is the slot
          <span key={index} className={set.valid ? 'text-fg' : 'text-fg-subtle'}>
            {word}
          </span>
        ))}
      </div>
    </div>
  )
}

// The whole cache at a glance: eight cells warming as blocks load. Enough to feel the locality
// without the panel drowning in 32 data words — the spotlight above carries the detail.
const HEAT: Record<CacheStripCell['heat'], string> = {
  empty: 'bg-transparent border-base/40',
  cold: 'bg-violet/30 border-base',
  hot: 'bg-violet border-violet',
}

function Strip({ cells, foreground }: { cells: CacheStripCell[]; foreground: CacheKind }) {
  return (
    <div>
      <div className="mb-1 font-mono text-fg-subtle text-xs">
        {foreground === 'D' ? 'D' : 'I'} lines
      </div>
      <div className="flex gap-1">
        {cells.map((cell) => (
          <div
            key={cell.index}
            className={cn(
              'h-4 flex-1 border',
              HEAT[cell.heat],
              cell.spotlit && 'ring-1 ring-cyan ring-offset-0',
            )}
            title={`line ${cell.index}: ${cell.heat}${cell.spotlit ? ' (spotlit)' : ''}`}
          />
        ))}
      </div>
    </div>
  )
}
