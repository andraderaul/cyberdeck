// The machine. Pure by contract: `step` knows nothing about time, the DOM or formatting, which
// is what makes "program X halts with R2 = 30" a test with no timers (ADR 0018).
//
// Memory is indexed by **word**. `ldw`/`stw` and the instruction fetch address words directly;
// `ldb`/`stb` address bytes and resolve to a word plus an offset, big-endian within the word
// (byte 0 is the most significant). That distinction is the ISA's main source of confusion.

import type { Image } from './assembler'
import {
  byteShift,
  CR,
  EQ,
  ER,
  FR,
  GT,
  IPC,
  IR,
  IV,
  LT,
  MEMORY_WORDS,
  OV,
  PC,
  REGISTER_COUNT,
  TERMINAL_ADDRESS,
  unpackU,
  ZD,
} from './isa'

export interface Machine {
  readonly registers: readonly number[]
  readonly memory: readonly number[]
  readonly halted: boolean
  /** Characters written to the memory-mapped Terminal, in the order the program emitted them. */
  readonly terminal: string
}

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

/** Mutable working state for one instruction, collapsed back into a Machine at the end of `step`. */
interface Cycle {
  registers: number[]
  memory: readonly number[]
  /** Written lazily: most instructions touch no memory, and cloning it every step is wasteful. */
  writable: number[] | null
  terminal: string
  halted: boolean
  /** Set by a branch or call, so the fall-through PC increment is skipped. */
  jumped: boolean
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
  const instruction = (machine.memory[wordIndex] ?? 0) >>> 0

  const cycle: Cycle = {
    registers: [...machine.registers],
    memory: machine.memory,
    writable: null,
    terminal: machine.terminal,
    halted: false,
    jumped: false,
  }
  cycle.registers[IR] = instruction

  execute(cycle, instruction)

  if (!cycle.jumped && !cycle.halted) {
    cycle.registers[PC] = (machine.registers[PC] + 4) >>> 0
  }

  return {
    registers: cycle.registers,
    memory: cycle.writable ?? cycle.memory,
    halted: cycle.halted,
    terminal: cycle.terminal,
  }
}

function execute(cycle: Cycle, instruction: number): void {
  const opcode = instruction >>> 26
  const r = cycle.registers

  // Type U reads six-bit register fields; type F reads five, plus an im16.
  const z = unpackU('z', instruction)
  const ux = unpackU('x', instruction)
  const uy = unpackU('y', instruction)
  const fx = (instruction >>> 5) & 0x1f
  const fy = instruction & 0x1f
  const im16 = (instruction >>> 10) & 0xffff
  const im26 = instruction & 0x3ffffff

  switch (opcode) {
    case 0x00:
      arithmetic(cycle, z, r[ux] + r[uy])
      break
    case 0x01:
      arithmetic(cycle, fx, r[fy] + im16)
      break
    case 0x02:
      arithmetic(cycle, z, r[ux] - r[uy])
      break
    case 0x03:
      arithmetic(cycle, fx, r[fy] - im16)
      break

    // The high half of a product lands in ER. The reference's type U `mul` truncates it to zero
    // through a C widening slip its `muli` does not share; GOLEM computes both at 64 bits, which
    // no fixture contradicts and which keeps the pair coherent.
    case 0x04:
      multiply(cycle, z, r[ux], r[uy])
      break
    case 0x05:
      multiply(cycle, fx, r[fy], im16)
      break

    case 0x06:
      divide(cycle, z, r[ux], r[uy])
      break
    case 0x07:
      divide(cycle, fx, r[fy], im16)
      break

    case 0x08:
      compare(cycle, r[ux], r[uy])
      break
    case 0x09:
      compare(cycle, r[fx], im16)
      break

    // A shift displaces N+1 places — the field counts from one, so there is no shift of zero.
    case 0x0a: {
      const shifted = BigInt(r[ux] >>> 0) << BigInt(uy + 1)
      write(cycle, z, Number(shifted & 0xffffffffn))
      r[ER] = Number((shifted >> 32n) & 0xffffffffn)
      break
    }
    case 0x0b: {
      const wide = (BigInt(r[ER] >>> 0) << 32n) | BigInt(r[ux] >>> 0)
      write(cycle, z, Number((wide >> BigInt(uy + 1)) & 0xffffffffn))
      // The reference keeps only the high half and then truncates it away, so ER always ends zero.
      r[ER] = 0
      break
    }

    case 0x0c:
      write(cycle, z, r[ux] & r[uy])
      break
    case 0x0d:
      write(cycle, fx, r[fy] & im16)
      break
    case 0x0e:
      write(cycle, ux, ~r[uy])
      break
    case 0x0f:
      write(cycle, fx, ~im16)
      break
    case 0x10:
      write(cycle, z, r[ux] | r[uy])
      break
    case 0x11:
      write(cycle, fx, r[fy] | im16)
      break
    case 0x12:
      write(cycle, z, r[ux] ^ r[uy])
      break
    case 0x13:
      write(cycle, fx, r[fy] ^ im16)
      break

    case 0x14:
      write(cycle, fx, readWord(cycle, r[fy] + im16))
      break
    case 0x15:
      write(cycle, fx, readByte(cycle, r[fy] + im16))
      break
    case 0x16:
      writeWord(cycle, r[fx] + im16, r[fy])
      break
    case 0x17:
      writeByte(cycle, r[fx] + im16, r[fy] & 0xff)
      break

    // MEM[Rx--] = Ry, and MEM[++Ry] on the way back out.
    case 0x18:
      writeWord(cycle, r[ux], r[uy])
      write(cycle, ux, r[ux] - 1)
      break
    case 0x19:
      write(cycle, uy, r[uy] + 1)
      write(cycle, ux, readWord(cycle, cycle.registers[uy]))
      break

    case 0x1a:
      branch(cycle, im26, true)
      break
    case 0x1b:
      branch(cycle, im26, (r[FR] & EQ) !== 0)
      break
    case 0x1c:
      branch(cycle, im26, (r[FR] & LT) !== 0)
      break
    case 0x1d:
      branch(cycle, im26, (r[FR] & GT) !== 0)
      break
    case 0x1e:
      branch(cycle, im26, (r[FR] & EQ) === 0)
      break
    // GOLEM implements `ble` as LT ∨ EQ. The reference tests `(FR & 0x02) == 0x20`, a typo that
    // never branches on "less than" — deliberately not replicated (ADR 0019).
    case 0x1f:
      branch(cycle, im26, (r[FR] & (LT | EQ)) !== 0)
      break
    case 0x20:
      branch(cycle, im26, (r[FR] & (GT | EQ)) !== 0)
      break
    case 0x21:
      branch(cycle, im26, (r[FR] & ZD) !== 0)
      break
    case 0x22:
      branch(cycle, im26, (r[FR] & ZD) === 0)
      break
    case 0x23:
      branch(cycle, im26, (r[FR] & IV) !== 0)
      break
    case 0x24:
      branch(cycle, im26, (r[FR] & IV) === 0)
      break

    // The return address is stored as a word index, which is why `ret` shifts it back.
    case 0x25:
      write(cycle, fx, (r[PC] + 4) >>> 2)
      cycle.registers[PC] = ((r[fy] + im16) << 2) >>> 0
      cycle.jumped = true
      break
    case 0x26:
    case 0x28:
      cycle.registers[PC] = (r[fx] << 2) >>> 0
      cycle.jumped = true
      break
    case 0x27:
      write(cycle, fx, r[IPC] >>> 2)
      write(cycle, fy, r[CR])
      break

    // `int 0` ends the simulation.
    case 0x3f:
      cycle.registers[CR] = 0
      cycle.registers[PC] = 0
      cycle.halted = true
      break

    default:
      cycle.registers[FR] = r[FR] | IV
      break
  }
}

// R0 reads as zero however often it is written — the same contract as MIPS, not a bug.
function write(cycle: Cycle, index: number, value: number): void {
  if (index === 0) {
    return
  }
  cycle.registers[index] = value >>> 0
}

function arithmetic(cycle: Cycle, destination: number, result: number): void {
  setOverflow(cycle, result)
  write(cycle, destination, result)
}

function multiply(cycle: Cycle, destination: number, a: number, b: number): void {
  const product = BigInt(a >>> 0) * BigInt(b >>> 0)
  cycle.registers[FR] = product > 0xffffffffn ? cycle.registers[FR] | OV : cycle.registers[FR] & ~OV
  cycle.registers[ER] = Number((product >> 32n) & 0xffffffffn)
  write(cycle, destination, Number(product & 0xffffffffn))
}

// Sets ZD on a divide by zero and leaves OV alone — see ISA.md, "Divergências deliberadas".
function divide(cycle: Cycle, destination: number, a: number, b: number): void {
  if (b >>> 0 === 0) {
    cycle.registers[FR] = cycle.registers[FR] | ZD
    return
  }
  cycle.registers[FR] = cycle.registers[FR] & ~ZD
  cycle.registers[ER] = (a >>> 0) % (b >>> 0)
  write(cycle, destination, Math.floor((a >>> 0) / (b >>> 0)))
}

// Comparison clears the three comparison bits before writing, and touches nothing else.
function compare(cycle: Cycle, a: number, b: number): void {
  const left = a >>> 0
  const right = b >>> 0
  let flags = cycle.registers[FR] & ~(EQ | LT | GT)

  if (left === right) {
    flags |= EQ
  }
  if (left < right) {
    flags |= LT
  }
  if (left > right) {
    flags |= GT
  }

  cycle.registers[FR] = flags >>> 0
}

function setOverflow(cycle: Cycle, result: number): void {
  cycle.registers[FR] =
    result > 0xffffffff || result < 0 ? cycle.registers[FR] | OV : cycle.registers[FR] & ~OV
}

function branch(cycle: Cycle, target: number, taken: boolean): void {
  if (!taken) {
    return
  }
  cycle.registers[PC] = (target << 2) >>> 0
  cycle.jumped = true
}

function mutableMemory(cycle: Cycle): number[] {
  if (cycle.writable === null) {
    cycle.writable = [...cycle.memory]
  }
  return cycle.writable
}

function readWord(cycle: Cycle, wordIndex: number): number {
  const memory = cycle.writable ?? cycle.memory
  return (memory[wordIndex >>> 0] ?? 0) >>> 0
}

function writeWord(cycle: Cycle, wordIndex: number, value: number): void {
  const index = wordIndex >>> 0
  if (index >= MEMORY_WORDS) {
    return
  }
  mutableMemory(cycle)[index] = value >>> 0
}

function readByte(cycle: Cycle, byteAddress: number): number {
  const address = byteAddress >>> 0
  return (readWord(cycle, address >>> 2) >>> byteShift(address)) & 0xff
}

function writeByte(cycle: Cycle, byteAddress: number, value: number): void {
  const address = byteAddress >>> 0

  // The Terminal is a device, not storage: a byte written here is emitted as a character.
  if (address === TERMINAL_ADDRESS) {
    cycle.terminal += String.fromCharCode(value & 0xff)
    return
  }

  const wordIndex = address >>> 2
  if (wordIndex >= MEMORY_WORDS) {
    return
  }
  const shift = byteShift(address)
  const word = readWord(cycle, wordIndex)
  mutableMemory(cycle)[wordIndex] = ((word & ~(0xff << shift)) | ((value & 0xff) << shift)) >>> 0
}
