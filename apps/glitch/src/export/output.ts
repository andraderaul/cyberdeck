// Pure naming decisions for PNG Export, Capture and Recording. Blob construction stays in the shells.

/** Domain terms (CONTEXT.md). */
export type OutputKind = 'png-export' | 'capture' | 'recording'

/**
 * A Recording's container isn't known until MediaRecorder picks one, so the extension is injected
 * rather than assumed; the timestamp is injected too (shells pass `Date.now()`) so this stays
 * deterministic. The overloads keep an under-specified call from compiling.
 *
 * Only a Recording is stamped. A PNG Export or Capture is one click to redo, so a stable name is
 * the kinder default — but a take is minutes of someone's performance, and two of them colliding
 * would leave the browser to sort it out as "glitch-recording (1).webm".
 */
export function outputFilename(kind: 'png-export' | 'capture'): string
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
    case 'recording':
      return `glitch-recording-${opts.timestamp}.${opts.ext}`
  }
}
