/**
 * Sampling cap, applied to *both* axes — the Pipeline walks every sampled pixel, so it's the
 * pixel count that has to stay bounded. ASCII//Convert caps width alone because its char grid
 * bounds the work downstream; here the sampled buffer *is* the work, and a 500×20000 Source
 * would sail past a width-only cap and freeze the tab.
 */
export const MAX_SAMPLE_DIM = 800

/**
 * Pure: the dimensions the Source is sampled at — scaled to fit inside MAX_SAMPLE_DIM², keeping
 * its aspect ratio. The downscale itself rides on the hidden canvas' drawImage: read and resize
 * in one operation (ADR 0001).
 */
export function sampleDimensions(
  sourceWidth: number,
  sourceHeight: number,
): { w: number; h: number } {
  if (sourceWidth <= 0 || sourceHeight <= 0) {
    return { w: 0, h: 0 }
  }

  const ratio = Math.min(1, MAX_SAMPLE_DIM / sourceWidth, MAX_SAMPLE_DIM / sourceHeight)
  if (ratio === 1) {
    return { w: sourceWidth, h: sourceHeight }
  }

  return {
    w: Math.max(1, Math.round(sourceWidth * ratio)),
    h: Math.max(1, Math.round(sourceHeight * ratio)),
  }
}

/** Intrinsic pixel dimensions of the Source Image. Widen when Live Source lands. */
export function sourceDimensions(source: HTMLImageElement): { w: number; h: number } {
  return { w: source.naturalWidth, h: source.naturalHeight }
}
