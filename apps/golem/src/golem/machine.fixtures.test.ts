import { describe, expect, it } from 'vitest'
import {
  GENERATED_PROGRAMS,
  INHERITED_PROGRAMS,
  loadFixture,
  parseHex,
  UNIT_2_RUNNABLE,
} from './__fixtures__/load'
import type { Image } from './assembler'
import { CR, ER, FR, PC, registerIndex } from './isa'
import { createMachine, step } from './machine'

/**
 * One assertion lifted from a reference trace: after the instruction on this line, this target
 * held this value.
 *
 * Checking the reference's own numbers step by step is a much sharper instrument than comparing
 * final state — a wrong flag shows up on the instruction that set it, not fifty steps later.
 */
interface Expectation {
  step: number
  target: string
  value: number
}

// `[F] FR = 0x00000000, R1 = R0 + 0x0017 = 0x00000017` — each comma-separated clause names a
// target and ends in the value it took. The last `0x…` in the clause is that value.
function parseTrace(out: string): Expectation[] {
  const expectations: Expectation[] = []
  const lines = out.split('\n').map((line) => line.trim())
  let index = 0

  lines.forEach((line, position) => {
    // An invalid instruction still costs a Step, but the reference prints no effects line for it
    // — there is no instruction to disassemble. Counting it keeps this parser's step numbering
    // aligned with the machine's from that point on.
    if (line.startsWith('[INVALID INSTRUCTION')) {
      index++
      return
    }

    const effects = /^\[[UFS]\]\s*(.*)$/.exec(line)
    if (!effects) {
      return
    }
    index++

    // A hardware interrupt fires *after* the instruction settled, so this line's `PC` is the
    // instruction's own result and the machine has since moved on to the vector. Only the PC
    // clause is affected; `trace.test.ts` compares the rendered line itself and covers it exactly.
    const preempted = lines[position + 1]?.startsWith('[HARDWARE INTERRUPTION') ?? false

    for (const clause of effects[1].split(', ')) {
      const target = /^(R\d+|FR|ER|PC|CR)\s*=/.exec(clause)
      if (!target) {
        continue
      }
      if (preempted && target[1] === 'PC') {
        continue
      }
      const values = clause.match(/0x[0-9A-Fa-f]+/g)
      if (!values) {
        continue
      }
      expectations.push({
        step: index,
        target: target[1],
        value: Number.parseInt(values[values.length - 1], 16) >>> 0,
      })
    }
  })

  return expectations
}

const SPECIAL_TARGETS: Record<string, number> = { FR, ER, PC, CR }

function indexOfTarget(target: string): number {
  const index = SPECIAL_TARGETS[target] ?? registerIndex(target.toLowerCase())
  if (index === null || index === undefined) {
    throw new Error(`trace names an unknown target: ${target}`)
  }
  return index
}

const ALL = [...INHERITED_PROGRAMS, ...UNIT_2_RUNNABLE, ...GENERATED_PROGRAMS]

describe.each(ALL)('%s', (name) => {
  it('executes exactly as the reference emulator traced it', () => {
    const fixture = loadFixture(name)
    const image: Image = {
      words: parseHex(fixture.hex),
      lineForWord: [],
    }
    const expectations = parseTrace(fixture.out)

    // A trace that parsed to nothing would make this test vacuously green.
    expect(expectations.length).toBeGreaterThan(10)

    const byStep = new Map<number, Expectation[]>()
    for (const expectation of expectations) {
      const bucket = byStep.get(expectation.step) ?? []
      bucket.push(expectation)
      byStep.set(expectation.step, bucket)
    }

    let machine = createMachine(image)
    const failures: string[] = []
    const total = Math.max(...byStep.keys())

    for (let index = 1; index <= total; index++) {
      machine = step(machine).machine

      for (const { target, value } of byStep.get(index) ?? []) {
        const actual = machine.registers[indexOfTarget(target)] >>> 0
        if (actual !== value) {
          failures.push(
            `step ${index}: ${target} = 0x${actual.toString(16).padStart(8, '0')}, ` +
              `reference says 0x${value.toString(16).padStart(8, '0')}`,
          )
        }
      }
    }

    expect(failures.slice(0, 10)).toEqual([])
    expect(machine.halted).toBe(true)
  })
})
