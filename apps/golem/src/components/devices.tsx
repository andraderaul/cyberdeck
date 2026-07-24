import { type DeviceReading, devicesOf } from '../golem/inspect'
import type { Machine } from '../golem/machine'
import Panel from './panel'

type DevicesProps = {
  machine: Machine | null
}

/**
 * Where the invisible machinery becomes watchable: the Watchdog's countdown descending a tick per
 * Step, and the FPU's registers as decoded floats beside the words a program reads back.
 *
 * Read-only like every panel but the Source, and more strictly than most — even the Console never
 * writes a device register. Talking to Devices is the program's job (ADR 0018).
 */
export default function Devices({ machine }: DevicesProps) {
  const { watchdog, fpu } = devicesOf(machine)

  return (
    <Panel title="Devices">
      <div className="grid gap-sm sm:grid-cols-2">
        <Group name="Watchdog" readings={watchdog} />
        <Group name="FPU" readings={fpu} />
      </div>
    </Panel>
  )
}

function Group({ name, readings }: { name: string; readings: DeviceReading[] }) {
  return (
    <div className="min-w-0">
      <h3 className="mb-1 font-semibold text-fg-muted text-xs uppercase tracking-widest">{name}</h3>
      <dl className="grid grid-cols-[auto_1fr] gap-x-2 font-mono text-xs">
        {readings.map((reading) => (
          <div key={reading.label} className="contents">
            <dt className="text-fg-subtle">{reading.label}</dt>
            <dd className="min-w-0 truncate text-right">
              {reading.value}
              {reading.raw && <span className="ml-1.5 text-fg-subtle">{reading.raw}</span>}
            </dd>
          </div>
        ))}
      </dl>
    </div>
  )
}
