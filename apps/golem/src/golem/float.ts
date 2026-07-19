// IEEE-754 single precision, in the two directions the FPU needs. Kept apart from the machine
// because the DEVICES panel decodes the same values for display, and a second copy of the bit
// twiddling would be a second chance to disagree.

const buffer = new ArrayBuffer(4)
const asFloat = new Float32Array(buffer)
const asWord = new Uint32Array(buffer)

/** The 32-bit pattern of a value held as a single-precision float — `9.25` → `0x41140000`. */
export function floatBits(value: number): number {
  asFloat[0] = value
  return asWord[0] >>> 0
}

/** The float a 32-bit pattern denotes — the inverse of `floatBits`. */
export function bitsAsFloat(word: number): number {
  asWord[0] = word >>> 0
  return asFloat[0]
}

/**
 * The exponent field the reference emulator reads, **mask bug and all**: it writes `0x7F80000`
 * where IEEE-754 puts the exponent at `0x7F800000`, one hex digit short, so it reads four bits
 * from the middle of the mantissa instead of the eight-bit exponent.
 *
 * Replicated rather than corrected. Unlike the broken `ble`, this one cannot poison a program:
 * it only decides how many cycles an operation is *said* to cost, which is didactic fiction with
 * no ground truth. Correcting it would turn every unit-2 trace red for nothing. See ISA.md.
 */
export function referenceExponent(value: number): number {
  return (floatBits(value) & 0x07f80000) >>> 23
}
