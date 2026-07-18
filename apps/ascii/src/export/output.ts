// Pure naming and sizing decisions for Export & Capture. Blob construction stays in the shells.

export const MAX_EXPORT_DIM = 8192

export type PngScale = 1 | 2 | 4

export interface Dimensions {
  w: number
  h: number
}

/** Domain terms (CONTEXT.md): PNG Export, TXT Export, Capture, Recording. */
export type OutputKind = 'png-export' | 'txt-export' | 'capture' | 'recording'

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

/**
 * Timestamp is injected (shells pass Date.now()) so the function stays deterministic. Overloads make
 * each kind carry the fields it needs, so an under-specified call can't compile.
 */
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
