// Pure naming decisions for PNG Export, Capture, Recording and the exported Chain. Blob
// construction stays in the shells.

/** Domain terms (CONTEXT.md). */
export type OutputKind = 'png-export' | 'capture' | 'recording' | 'chain'

/**
 * A Recording's container isn't known until MediaRecorder picks one, so the extension is injected
 * rather than assumed; the timestamp is injected too (shells pass `Date.now()`) so this stays
 * deterministic. The overloads keep an under-specified call from compiling.
 *
 * Only a Recording is stamped. A PNG Export or Capture is one click to redo, so a stable name is
 * the kinder default — but a take is minutes of someone's performance, and two of them colliding
 * would leave the browser to sort it out as "glitch-recording (1).webm".
 */
export function outputFilename(kind: 'png-export' | 'capture' | 'chain'): string
export function outputFilename(kind: 'recording', opts: { timestamp: number; ext: string }): string
export function outputFilename(
  kind: OutputKind,
  opts: { timestamp?: number; ext?: string } = {},
): string {
  switch (kind) {
    case 'png-export':
      return 'glitch.png'
    case 'capture':
      return 'glitch-capture.png'
    // Not stamped, for the same reason a PNG Export isn't: the Chain is still in the editor, so
    // re-exporting it is one click. Two *different* Chains saved in one session collide — and that
    // is the moment a user is deliberately keeping two looks and will name them themselves.
    case 'chain':
      return 'glitch-chain.json'
    case 'recording':
      return `glitch-recording-${opts.timestamp}.${opts.ext}`
  }
}
