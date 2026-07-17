// Pure naming decisions for PNG Export, Capture and Recording. Blob construction stays in the shells.

/** Domain terms (CONTEXT.md). */
export type OutputKind = 'png-export' | 'capture' | 'recording'

/**
 * A Recording's container isn't known until MediaRecorder picks one, so the extension is injected
 * rather than assumed. The overloads keep an under-specified call from compiling.
 */
export function outputFilename(kind: 'png-export' | 'capture'): string
export function outputFilename(kind: 'recording', opts: { ext: string }): string
export function outputFilename(kind: OutputKind, opts: { ext?: string } = {}): string {
  switch (kind) {
    case 'png-export':
      return 'glitch.png'
    case 'capture':
      return 'glitch-capture.png'
    case 'recording':
      return `glitch-recording.${opts.ext}`
  }
}

export function mimeToExtension(mimeType: string): string {
  if (mimeType.startsWith('video/mp4')) {
    return 'mp4'
  }
  return 'webm'
}
