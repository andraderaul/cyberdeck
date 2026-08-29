// What GLITCH//Studio's Preset thumbnails are rendered *at*, and what makes a committed one stale
// (ADR 0028). Everything here is pure — numbers and one hash — so the generator that writes the
// images and the test that refuses to let them rot read the same values from one file.
// `scripts/glitch-preset-thumbnails.mjs` is the shell that rasterises them.
//
// The split is the one `scripts/glitch/reference-plate.mjs` uses, applied to a different half of
// the job: there the pure part is the drawing, here it is the *contract* — the box, the Seed, the
// quality, and the fingerprint that says which inputs a committed image was made from.

import { createHash } from 'node:crypto'

/** The box a thumbnail is laid out in, in CSS pixels — matched to ASCII//Convert's chip so the two
 *  Preset rows read as one pattern in two programs (ADR 0015), and pinned against the app's own
 *  copy by `apps/glitch/scripts/preset-thumbnails.test.mjs`. */
export const THUMBNAIL_WIDTH = 96
export const THUMBNAIL_HEIGHT = 60

/**
 * How many device pixels the committed image carries per CSS pixel of the box.
 *
 * The render is 800px wide whatever this is — that is the whole decision (ADR 0028) and this only
 * decides how far the *result* is shrunk. 2x matches ASCII//Convert's `THUMBNAIL_SUPERSAMPLE`, and
 * for the same reason: at 1x the chip is resampled up on the 2x screen most of this app's casual
 * creators are holding, which softens exactly the fine structure — the dot cells, the raster, the
 * grain — that tells one look from another at 96px.
 *
 * It is the expensive half of the row: at `WEBP_QUALITY` the ten weigh 39 KB here against 14 KB at
 * 1x. Bought deliberately, and bought where it is cheapest to pay — the chips are fetched when the
 * Control Strip mounts, which is after a Source has been opened, so none of it is on the first
 * paint.
 */
export const THUMBNAIL_SCALE = 2

/**
 * The one arrangement all ten thumbnails are rendered at.
 *
 * A Preset carries no Seed by design — it is a look, and the arrangement is drawn fresh when the
 * user applies it (`presets.ts`). So a thumbnail has to be shown *some* roll, and the choice made
 * here is that it is always the same one: one Seed across the roster makes the ten images
 * comparable to each other, and committing it makes them reproducible. Which Seed is arbitrary and
 * meant to stay that way — a Seed curated for flattering blocks would be a look nobody receives.
 *
 * It must never be the editor's live Seed. That would be a per-Source render again, which is the
 * thing pre-rendering exists to avoid.
 */
export const THUMBNAIL_SEED = 0x1985_0714 | 0

/**
 * The WebP quality the images are written at. Lossy on purpose: these are *output* — the plate is
 * the input and stays lossless, for the reason its own header gives — and every Preset ends on a
 * Noise Link, which is exactly the signal a lossless codec cannot compress and an eye cannot audit
 * at 96px.
 *
 * Driven over all ten at 192x120 — total bytes for the row: **0.8** 60 KB · **0.7** 48 KB ·
 * **0.6** 43 KB · **0.5** 39 KB · **0.4** 34 KB · **0.3** 29 KB. There is no knee in the curve, so
 * the number is chosen by looking rather than by reading it: the picture decides.
 *
 * **SIGNAL LOSS is what decides it**, being the noisiest look on the roster — "the picture is
 * losing to the static" (`presets.ts`). Its static is intact at 0.5, thinning at 0.4 and *gone* at
 * 0.3, smoothed flat by the codec: the chip stops depicting the one Effect the Preset is named for.
 * That is the failure this whole feature exists to avoid, arriving through the encoder instead of
 * through the render scale. 0.5 sits a clear step above it, and the two dot screens — PHOSPHOR and
 * BILLBOARD, where blocking would show first against a regular grid — carry their cells cleanly
 * there too.
 *
 * Downscaling in two steps was measured as well, on the theory that pre-averaging the grain would
 * leave the codec less to encode. It came back *larger* at every quality (63 KB against 60 at 0.8):
 * Chromium's `imageSmoothingQuality = 'high'` already filters an 8.3x reduction properly, and the
 * second pass only re-introduced resampling noise. One step is both smaller and simpler.
 */
export const WEBP_QUALITY = 0.5

/** Where the committed images live, from the repo root. Inside GLITCH//Studio's Vite root, unlike
 *  the plate: these are what ships (ADR 0028). */
export const THUMBNAIL_DIR = 'apps/glitch/public/presets'

/** The stamp the generator writes and the drift guard reads, from the repo root. Outside every
 *  Vite root — it is a record of a build, not something a browser ever asks for. */
export const STAMP_FILE = 'scripts/glitch/preset-thumbnails.stamp.json'

/** The file one Preset's thumbnail is committed as. Ids are the filenames rather than a table of
 *  their own, so a curated Preset cannot arrive with an image nobody wired up — the guard checks
 *  the directory against `PRESETS` and finds both the missing and the orphaned. */
export function thumbnailFile(id) {
  return `${id}.webp`
}

/**
 * The Links of one Preset as the render sees them — its Effects, their params in a fixed key order,
 * and each Link's bypass.
 *
 * A Link's `id` is left out for the same reason `chainMatch` ignores it (chain.ts): it is plumbing
 * that React keys a list with, and it shifts whenever a Link is inserted anywhere earlier in the
 * file, which would report drift on nine looks that did not move.
 */
function chainFingerprint(chain) {
  return chain.map((link) => ({
    type: link.type,
    bypassed: link.bypassed,
    params: Object.fromEntries(
      Object.keys(link.params)
        .sort()
        .map((key) => [key, link.params[key]]),
    ),
  }))
}

/**
 * The fingerprint of everything a committed thumbnail was rendered from: the Chains, the plate, and
 * the four numbers above.
 *
 * All of it, because each one changes the picture and none of them changes the *filename* — which
 * is what makes a stale thumbnail a silent failure rather than a broken build. A re-curated Preset
 * is the case that motivates it (a Preset is taste and may move, `apps/glitch/CLAUDE.md`), but a
 * re-lit plate or a nudged quality is the same lie by a different route.
 *
 * The Presets are hashed as their *looks*, not as their source text — and only as the parts of a
 * look a render can see. Reformatting `presets.ts`, renaming a Preset or re-ordering the roster
 * changes no pixel of any image, so the fingerprint is taken over Chains keyed by id, sorted, with
 * the display names left out. A guard that cries on a rename is a guard people learn to re-stamp
 * without looking.
 */
export function thumbnailStamp(presets, plate) {
  const inputs = JSON.stringify({
    presets: [...presets]
      .sort((a, b) => a.id.localeCompare(b.id))
      .map((preset) => ({ id: preset.id, chain: chainFingerprint(preset.chain) })),
    seed: THUMBNAIL_SEED,
    width: THUMBNAIL_WIDTH,
    height: THUMBNAIL_HEIGHT,
    scale: THUMBNAIL_SCALE,
    quality: WEBP_QUALITY,
  })

  return createHash('sha256')
    .update(inputs)
    .update(createHash('sha256').update(plate).digest())
    .digest('hex')
}
