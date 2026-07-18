import { GENERAL_REGISTERS, PC, registerName } from '../golem/isa'
import type { Machine } from '../golem/machine'
import Panel from './panel'

type RegistersProps = {
  machine: Machine | null
}

const hex = (value: number) => `0x${value.toString(16).toUpperCase().padStart(8, '0')}`

/**
 * The general-purpose registers and the PC, as the machine steps. Read-only, like every panel
 * other than the Source (ADR 0018).
 */
export default function Registers({ machine }: RegistersProps) {
  if (machine === null) {
    return (
      <Panel title="Registers">
        <p className="text-fg-muted text-xs">No machine. Run `asm` to create one.</p>
      </Panel>
    )
  }

  return (
    <Panel title="Registers">
      <dl className="grid grid-cols-[auto_1fr] gap-x-3 gap-y-0.5 font-mono text-xs">
        <dt className="text-violet">{registerName(PC)}</dt>
        <dd className="text-right tabular-nums">{hex(machine.registers[PC])}</dd>

        {Array.from({ length: GENERAL_REGISTERS }, (_, index) => (
          <Row key={registerName(index)} index={index} value={machine.registers[index]} />
        ))}
      </dl>
    </Panel>
  )
}

// A zero register is noise next to one that changed — dim it so a scan finds the live values.
function Row({ index, value }: { index: number; value: number }) {
  const dim = value === 0 ? 'text-fg-muted' : 'text-fg'
  return (
    <>
      <dt className={dim}>{registerName(index)}</dt>
      <dd className={`text-right tabular-nums ${dim}`}>{hex(value)}</dd>
    </>
  )
}
