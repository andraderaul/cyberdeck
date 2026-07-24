// The machine. Pure by contract: `step` knows nothing about time, the DOM or formatting, which
// is what makes "program X halts with R2 = 30" a test with no timers (ADR 0018).
//
// Memory is indexed by **word**. `ldw`/`stw` and the instruction fetch address words directly;
// `ldb`/`stb` address bytes and resolve to a word plus an offset, big-endian within the word
// (byte 0 is the most significant). That distinction is the ISA's main source of confusion.

import type { Image } from './assembler'
import { floatBits, referenceExponent } from './float'
import {
  byteShift,
  CAUSE_FPU,
  CAUSE_INVALID_INSTRUCTION,
  CAUSE_WATCHDOG,
  CAUSE_ZERO_DIVISION,
  CR,
  EQ,
  ER,
  FPU_CONTROL,
  FPU_ERROR,
  FPU_OPERATIONS,
  FPU_X,
  FPU_Y,
  FPU_Z,
  FR,
  GT,
  HARDWARE_1_VECTOR,
  HARDWARE_2_VECTOR,
  IE,
  IPC,
  IR,
  IV,
  LT,
  MEMORY_WORDS,
  OV,
  PC,
  REGISTER_COUNT,
  SOFTWARE_VECTOR,
  TERMINAL_ADDRESS,
  unpackU,
  WATCHDOG_ADDRESS,
  WATCHDOG_COUNTER,
  WATCHDOG_ENABLE,
  ZD,
} from './isa'

/**
 * The FPU's state. Unlike the Watchdog — whose register simply *is* a memory word — the FPU keeps
 * its own, because its registers do not round-trip: a write converts an integer to a float, and a
 * read converts back by a different rule. Memory could not hold both meanings at once.
 */
export interface Fpu {
  /** Held as the float they denote, not as the word that was written. */
  readonly x: number
  readonly y: number
  readonly z: number
  /** Reads back as zero, or `FPU_ERROR` after a faulted operation. */
  readonly control: number
  /** The operation in flight, or `0` when idle. */
  readonly operation: number
  /** Cycles left before it completes, consumed one per Step. */
  readonly remaining: number
  /** Whether an operation is running — distinguishes idle from "completing this Step". */
  readonly busy: boolean
}

export interface Machine {
  readonly registers: readonly number[]
  readonly memory: readonly number[]
  readonly halted: boolean
  /** Characters written to the memory-mapped Terminal, in the order the program emitted them. */
  readonly terminal: string
  readonly fpu: Fpu
}

const fround = Math.fround

const IDLE_FPU: Fpu = {
  x: 0,
  y: 0,
  z: 0,
  control: 0,
  operation: 0,
  remaining: 0,
  busy: false,
}

/**
 * Something that happened *to* the program during a Step, as opposed to something the program
 * did. Reported rather than inferred because a dispatch is **not derivable from a state diff**:
 * `int 1` and a division by zero leave byte-identical machines behind, same cause in `CR`, same
 * vector in `PC`. The trace formatter and the Console narration read this one stream.
 */
export type StepEvent =
  | { kind: 'software-interrupt'; cause: number }
  /** Raised whether or not a dispatch follows, since the PC it names is the useful part. */
  | { kind: 'invalid-instruction'; pc: number }
  /**
   * A Device demanding attention: 1 is the Watchdog, 2 the FPU. `resume` is the PC the
   * instruction had settled on before the device took over — what `IPC` received, and what the
   * trace must print as that instruction's effect, since the dispatch happened after it.
   */
  | { kind: 'hardware-interrupt'; line: 1 | 2; resume: number }

export interface StepResult {
  readonly machine: Machine
  readonly events: readonly StepEvent[]
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
    fpu: IDLE_FPU,
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
  events: StepEvent[]
  fpu: Fpu
}

/**
 * Executes one instruction and returns the resulting machine alongside anything that happened
 * *to* it. Stepping a halted machine returns it unchanged — the Console reports that, rather than
 * the machine crashing on a dead program.
 */
export function step(machine: Machine): StepResult {
  if (machine.halted) {
    return { machine, events: [] }
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
    events: [],
    fpu: machine.fpu,
  }
  cycle.registers[IR] = instruction

  execute(cycle, instruction)

  if (!cycle.jumped && !cycle.halted) {
    cycle.registers[PC] = (machine.registers[PC] + 4) >>> 0
  }

  // One Step is one Device tick, in lockstep with execution — inherited from the reference
  // emulator's main loop, and the reason the Step stays the machine's only unit of time.
  // After the PC has settled, so a hardware dispatch saves the address the program would have
  // run next rather than the one it just left.
  if (!cycle.halted) {
    tickWatchdog(cycle)
    tickFpu(cycle)
  }

  return {
    machine: {
      registers: cycle.registers,
      memory: cycle.writable ?? cycle.memory,
      halted: cycle.halted,
      terminal: cycle.terminal,
      fpu: cycle.fpu,
    },
    events: cycle.events,
  }
}

/**
 * Diverts control to the software vector: the cause lands in `CR`, the return address in `IPC`,
 * and the PC jumps. `IPC` holds the address of the instruction *after* the one interrupted, which
 * is what lets an ISR return past it with a plain `ret`.
 */
function softwareInterrupt(cycle: Cycle, cause: number): void {
  divert(cycle, SOFTWARE_VECTOR, cause, (cycle.registers[PC] + 4) >>> 0, {
    kind: 'software-interrupt',
    cause,
  })
}

/**
 * Dispatches a Device's interrupt — unless the other Device already took this Step, in which case
 * it refuses and returns false. **One hardware dispatch per Step**: the reference checks both
 * devices in sequence and lets the second overwrite `CR`/`IPC` with the first vector as the
 * return address — an interrupt lost to a clobber that no fixture exercises, the same category as
 * its broken `ble`. The caller decides what a refusal means; the FPU holds its completion pending.
 */
function dispatchHardware(cycle: Cycle, line: 1 | 2): boolean {
  if (cycle.events.some((event) => event.kind === 'hardware-interrupt')) {
    return false
  }

  const resume = cycle.registers[PC] >>> 0
  divert(
    cycle,
    line === 1 ? HARDWARE_1_VECTOR : HARDWARE_2_VECTOR,
    line === 1 ? CAUSE_WATCHDOG : CAUSE_FPU,
    resume,
    { kind: 'hardware-interrupt', line, resume },
  )
  return true
}

/**
 * The common half of a dispatch. `resume` is the address the ISR will return to, and it is the
 * one thing the two kinds disagree about: a *software* interrupt is raised mid-instruction, with
 * the PC still on the instruction that raised it, so the resume address is that PC plus four. A
 * *hardware* interrupt arrives after the PC has already settled, so the resume address is the PC
 * as it stands — which for a taken branch is the branch target, not the branch.
 */
function divert(
  cycle: Cycle,
  vector: number,
  cause: number,
  resume: number,
  event: StepEvent,
): void {
  cycle.registers[CR] = cause >>> 0
  cycle.registers[IPC] = resume >>> 0
  cycle.registers[PC] = vector >>> 0
  cycle.jumped = true
  cycle.events.push(event)
}

/**
 * The Watchdog: one tick per Step, firing hardware interrupt 1 when an armed countdown runs out.
 *
 * The register *is* memory word `WATCHDOG_ADDRESS` rather than a field beside it, which is what
 * makes it readable by the program and dumpable by `mem` for free — a memory-mapped device whose
 * state lived somewhere other than memory would be a lie.
 *
 * Expiry **disarms** it. Nothing in the oracle pins that — the reference program halts three
 * instructions later — but the alternative re-fires on every subsequent Step, and the fixture
 * shows exactly one dispatch. See ISA.md.
 */
function tickWatchdog(cycle: Cycle): void {
  const register = readWord(cycle, WATCHDOG_ADDRESS)
  if ((register & WATCHDOG_ENABLE) === 0) {
    return
  }

  const counter = register & WATCHDOG_COUNTER
  if (counter !== 0) {
    writeWord(cycle, WATCHDOG_ADDRESS, (WATCHDOG_ENABLE | (counter - 1)) >>> 0)
    return
  }

  // Armed and already at zero: the countdown is spent. Disarm either way — the countdown ran out
  // whether or not anyone was listening — and dispatch only if interrupts are enabled.
  writeWord(cycle, WATCHDOG_ADDRESS, 0)
  if ((cycle.registers[FR] & IE) !== 0) {
    dispatchHardware(cycle, 1)
  }
}

/**
 * Starts the operation a write to `control` asked for. The reference computes the whole result
 * up front and then merely *counts down* to the interrupt — the cycles are theatre, not work —
 * so the same is done here, and the panel showing cycles tick away is showing exactly that.
 */
function startFpu(cycle: Cycle, control: number): void {
  const operation = control & 0x0f
  const { x, y, z } = cycle.fpu

  // `|expX - expY| + 1` for the arithmetic operations; everything else costs one.
  const spread = Math.abs(referenceExponent(x) - referenceExponent(y)) + 1
  const started = (next: Partial<Fpu>, cycles = 1): void => {
    cycle.fpu = { ...cycle.fpu, control: 0, operation, remaining: cycles, busy: true, ...next }
  }

  switch (operation) {
    case FPU_OPERATIONS.none:
      started({})
      return
    case FPU_OPERATIONS.add:
      started({ z: fround(x + y) }, spread)
      return
    case FPU_OPERATIONS.subtract:
      started({ z: fround(x - y) }, spread)
      return
    case FPU_OPERATIONS.multiply:
      started({ z: fround(x * y) }, spread)
      return
    case FPU_OPERATIONS.divide:
      // A zero divisor leaves `z` alone and raises the error bit, at the base cost.
      if (y === 0) {
        started({ control: FPU_ERROR })
        return
      }
      started({ z: fround(x / y) }, spread)
      return
    case FPU_OPERATIONS.assignX:
      started({ x: z })
      return
    case FPU_OPERATIONS.assignY:
      started({ y: z })
      return
    case FPU_OPERATIONS.ceiling:
      started({ z: Math.ceil(z) })
      return
    case FPU_OPERATIONS.floor:
      started({ z: Math.floor(z) })
      return
    case FPU_OPERATIONS.round:
      started({ z: Math.round(z) })
      return
    default:
      started({ control: FPU_ERROR })
  }
}

/**
 * The FPU's clock: one cycle consumed per Step, firing hardware interrupt 2 when the operation
 * lands. Same shape as the Watchdog, including that the Step which *starts* the work consumes a
 * cycle of it — which is what makes the reference's timings come out exact.
 */
function tickFpu(cycle: Cycle): void {
  if (!cycle.fpu.busy) {
    return
  }

  if (cycle.fpu.remaining !== 0) {
    cycle.fpu = { ...cycle.fpu, remaining: cycle.fpu.remaining - 1 }
    return
  }

  // Completing. With IE clear it completes silently (see ISA.md); with IE set it must dispatch,
  // and when the Watchdog already took this Step the completion *waits* — the operation holds at
  // zero cycles and dispatches whole on the next Step, instead of clobbering the Watchdog's.
  const enabled = (cycle.registers[FR] & IE) !== 0
  if (enabled && !dispatchHardware(cycle, 2)) {
    return
  }
  cycle.fpu = { ...cycle.fpu, operation: 0, busy: false }
}

// Only x, y and z name a Fpu field; CONTROL is a command, not a value — a read returns the last
// control word, a write starts an operation — so it stays a special case on both paths below.
const FPU_FIELD: Record<number, 'x' | 'y' | 'z'> = {
  [FPU_X]: 'x',
  [FPU_Y]: 'y',
  [FPU_Z]: 'z',
}

/**
 * What a read of an FPU register yields, and the strangest thing inherited from the reference:
 * **the encoding depends on the value.** A whole number comes back as that integer, anything else
 * as its IEEE-754 bit pattern. So `z = 9.25` reads as `0x41140000` while `z = 19` reads as `0x13`.
 *
 * Faithfully replicated — `2_fpu` reads back both kinds and would go red on either alone. See
 * ISA.md, where it is written down as the quirk it is.
 */
function readFpuRegister(fpu: Fpu, address: number): number {
  if (address === FPU_CONTROL) {
    return fpu.control >>> 0
  }

  return fpuWord(fpu[FPU_FIELD[address]])
}

/**
 * The value-dependent encoding on its own — exported so the DEVICES panel can show, as a
 * register's raw word, the word a program would actually read back.
 */
export function fpuWord(value: number): number {
  return Number.isInteger(value) && value >= 0 ? value >>> 0 : floatBits(value)
}

/** A write converts the other way: the word is read as an integer and held as the float it names. */
function writeFpuRegister(cycle: Cycle, address: number, word: number): void {
  if (address === FPU_CONTROL) {
    startFpu(cycle, word >>> 0)
    return
  }

  cycle.fpu = { ...cycle.fpu, [FPU_FIELD[address]]: fround(word >>> 0) }
}

const isFpuRegister = (address: number): boolean => address >= FPU_X && address <= FPU_CONTROL

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
    // The ISR preamble: capture what the dispatch left behind, then jump to the handler body.
    // `isr` jumps — it is not merely two register reads, which is what makes a vector one word.
    case 0x27:
      write(cycle, fx, r[IPC] >>> 2)
      write(cycle, fy, r[CR])
      cycle.registers[PC] = (im16 << 2) >>> 0
      cycle.jumped = true
      break

    // `int 0` ends the simulation — that meaning is unchanged from v1, and `halt` is still its
    // alias. A nonzero code is a software interrupt carrying the code as its cause, which is what
    // makes system-call dispatch from an ISR writable.
    case 0x3f:
      if (im26 === 0) {
        cycle.registers[CR] = 0
        cycle.registers[PC] = 0
        cycle.halted = true
        break
      }
      // Gated on IE. With interrupts off the instruction is a no-op rather than a deferred or
      // partial dispatch — see ISA.md, "Divergências deliberadas": no fixture pins this, and a
      // half-dispatch that wrote CR without jumping would be a state no ISR could explain.
      if ((r[FR] & IE) !== 0) {
        softwareInterrupt(cycle, im26)
      }
      break

    // An unassigned opcode. `IV` is raised whatever the state of IE, so `biv`/`bni` still work on
    // a machine with interrupts off; the dispatch on top of that is what lets a program survive
    // garbage by handling it. The event carries the PC because the trace line names it.
    default: {
      cycle.registers[FR] = r[FR] | IV
      cycle.events.push({ kind: 'invalid-instruction', pc: r[PC] >>> 0 })
      if ((r[FR] & IE) !== 0) {
        softwareInterrupt(cycle, CAUSE_INVALID_INSTRUCTION)
      }
      break
    }
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
// The destination is left untouched on a fault, which the reference trace pins: `2_interruption`
// shows `R1 = R1 / R0 = 0x00000020`, the value R1 already held.
function divide(cycle: Cycle, destination: number, a: number, b: number): void {
  if (b >>> 0 === 0) {
    cycle.registers[FR] = cycle.registers[FR] | ZD
    if ((cycle.registers[FR] & IE) !== 0) {
      softwareInterrupt(cycle, CAUSE_ZERO_DIVISION)
    }
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

// Devices are intercepted here, on the single memory-access path, rather than in each instruction
// that touches memory. That is what makes `ldw`, `stw`, `push` and `pop` agree about them without
// four copies of the same check — and it is where v3's cache attaches, as a layer rather than
// surgery.
function readWord(cycle: Cycle, wordIndex: number): number {
  const index = wordIndex >>> 0
  if (isFpuRegister(index)) {
    return readFpuRegister(cycle.fpu, index)
  }

  const memory = cycle.writable ?? cycle.memory
  return (memory[index] ?? 0) >>> 0
}

function writeWord(cycle: Cycle, wordIndex: number, value: number): void {
  const index = wordIndex >>> 0
  if (isFpuRegister(index)) {
    writeFpuRegister(cycle, index, value)
    return
  }

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

  // The Terminal is a device *and* an address: the byte is emitted as a character and stays
  // readable where it was written, so a program can `ldb` back what it just printed. Falling
  // through to the ordinary word write is what gives that readback (#206).
  if (address === TERMINAL_ADDRESS) {
    cycle.terminal += String.fromCharCode(value & 0xff)
  }

  const wordIndex = address >>> 2
  if (wordIndex >= MEMORY_WORDS) {
    return
  }
  const shift = byteShift(address)
  const word = readWord(cycle, wordIndex)
  mutableMemory(cycle)[wordIndex] = ((word & ~(0xff << shift)) | ((value & 0xff) << shift)) >>> 0
}
