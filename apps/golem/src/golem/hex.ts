// The one hex shape every surface prints bits in — the trace, the Console and the panels must
// agree, since a value is often read in one and compared against another.

/** `value` as unsigned upper-case hex, zero-padded to `width` digits, no prefix. */
export const hex = (value: number, width = 8) =>
  (value >>> 0).toString(16).toUpperCase().padStart(width, '0')
