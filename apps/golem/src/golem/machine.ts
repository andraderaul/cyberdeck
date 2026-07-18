// The machine. Pure by contract: `step` knows nothing about time, the DOM or formatting, which
// is what makes "program X halts with R2 = 30" a test with no timers (ADR 0018).

import type { Image } from './assembler'
import { FR, IR, MEMORY_WORDS, PC, REGISTER_COUNT } from './isa'

export interface Machine {
  readonly registers: readonly number[]
  readonly memory: readonly number[]
  readonly halted: boolean
  /** Characters written to the memory-mapped Terminal, in the order the program emitted them. */
  readonly terminal: string
}

export const OVERFLOW = 0x10

/** Instantiates a machine with the Image loaded at word 0 and every register cleared. */
export function createMachine(image: Image): Machine {
  const memory = new Array<number>(MEMORY_WORDS).fill(0)
  image.words.forEach((word, index) => {
    memory[index] = word >>> 0
  })

  return {
    registers: new Array<number>(REGISTER_COUNT).fill(0),
    memory,
    halted: false,
    terminal: '',
  }
}

/**
 * Executes one instruction and returns the resulting machine. Stepping a halted machine returns
 * it unchanged — the Console reports that, rather than the machine crashing on a dead program.
 */
export function step(machine: Machine): Machine {
  if (machine.halted) {
    return machine
  }

  const wordIndex = machine.registers[PC] >>> 2
  const instruction = machine.memory[wordIndex] >>> 0
  const opcode = instruction >>> 26

  const registers = [...machine.registers]
  registers[IR] = instruction

  switch (opcode) {
    // add — `z` is the destination (ISA.md's operand-order trap)
    case 0x00: {
      const z = (instruction >>> 10) & 0x1f
      const x = (instruction >>> 5) & 0x1f
      const y = instruction & 0x1f
      const sum = registers[x] + registers[y]
      write(registers, z, sum)
      setOverflow(registers, sum)
      break
    }

    // addi — `Rx = Ry + N`. `N` is unsigned: the reference reads im16 with no sign extension,
    // which is why the ISA carries a separate `subi` instead of negative immediates.
    case 0x01: {
      const x = (instruction >>> 5) & 0x1f
      const y = instruction & 0x1f
      const immediate = (instruction >>> 10) & 0xffff
      const sum = registers[y] + immediate
      write(registers, x, sum)
      setOverflow(registers, sum)
      break
    }

    // int — `int 0` ends the simulation
    case 0x3f: {
      registers[PC] = 0
      return { ...machine, registers, halted: true }
    }

    default:
      // #138 fills in the rest; until then an unimplemented opcode halts instead of running on
      // through memory as if it had executed.
      return { ...machine, registers, halted: true }
  }

  registers[PC] = (machine.registers[PC] + 4) >>> 0
  return { ...machine, registers }
}

// R0 reads as zero however often it is written — the same contract as MIPS, not a bug.
function write(registers: number[], index: number, value: number): void {
  if (index === 0) {
    return
  }
  registers[index] = value >>> 0
}

function setOverflow(registers: number[], result: number): void {
  registers[FR] =
    result > 0xffffffff || result < 0 ? registers[FR] | OVERFLOW : registers[FR] & ~OVERFLOW
}
