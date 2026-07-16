// Functional core for Export & Capture: the pure naming and sizing decisions that were previously
// re-derived across export-bar, live-source-bar and use-recording. Blob construction stays in the
// shells (DOM/runtime-bound); share.ts remains the delivery shell.

export const MAX_EXPORT_DIM = 8192

export type PngScale = 1 | 2 | 4

export interface Dimensions {
  w: number
  h: number
}

// The four output flows are domain terms (see CONTEXT.md): PNG Export, TXT Export, Capture, Recording.
export type OutputKind = 'png-export' | 'txt-export' | 'capture' | 'recording'

// Pure: given the canvas dimensions and a PNG scale, decide whether the scaled result busts the
// export cap and what the resulting pixel dimensions would be.
export function planPngExport(
  dimensions: Dimensions | null | undefined,
  scale: PngScale,
): { exceedsCap: boolean; targetDimensions: Dimensions | null } {
  if (dimensions == null) {
    return { exceedsCap: false, targetDimensions: null }
  }
  const targetDimensions: Dimensions = { w: dimensions.w * scale, h: dimensions.h * scale }
  const exceedsCap = targetDimensions.w > MAX_EXPORT_DIM || targetDimensions.h > MAX_EXPORT_DIM
  return { exceedsCap, targetDimensions }
}

// Pure: the single home for every output filename. Timestamp is injected so the function stays
// deterministic — the shells pass Date.now(). Overloads make each kind carry exactly the fields it
// needs, so an under-specified call (e.g. a Capture with no timestamp) can't compile.
export function outputFilename(kind: 'png-export' | 'txt-export'): string
export function outputFilename(kind: 'capture', opts: { timestamp: number }): string
export function outputFilename(kind: 'recording', opts: { timestamp: number; ext: string }): string
export function outputFilename(
  kind: OutputKind,
  opts: { timestamp?: number; ext?: string } = {},
): string {
  switch (kind) {
    case 'png-export':
      return 'ascii-art.png'
    case 'txt-export':
      return 'ascii-art.txt'
    case 'capture':
      return `ascii-capture-${opts.timestamp}.png`
    case 'recording':
      return `ascii-recording-${opts.timestamp}.${opts.ext}`
  }
}

// Pure: maps a MediaRecorder mime type to the file extension used when naming a Recording.
export function mimeToExtension(mimeType: string): string {
  if (mimeType.startsWith('video/mp4')) {
    return 'mp4'
  }
  return 'webm'
}
