/**
 * Sampling cap, applied to *both* axes — the Chain walks every sampled pixel, so it's the
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

/**
 * What the shell can sample a frame from: a Source Image or a Live Source (webcam). Kept out of
 * `types.ts`, which stays DOM-free — this union is the shell's vocabulary, not the pure core's.
 */
export type GlitchSource = HTMLImageElement | HTMLVideoElement

/** Duck-typed rather than `instanceof`: the shell is handed plain video-shaped objects under test. */
function isLiveSource(source: GlitchSource): source is HTMLVideoElement {
  return 'videoWidth' in source
}

/**
 * Intrinsic pixel dimensions of the Source — the stream's own size for a Live Source, which is
 * not the video element's `width`/`height` (those are its CSS box).
 */
export function sourceDimensions(source: GlitchSource): { w: number; h: number } {
  return isLiveSource(source)
    ? { w: source.videoWidth, h: source.videoHeight }
    : { w: source.naturalWidth, h: source.naturalHeight }
}
