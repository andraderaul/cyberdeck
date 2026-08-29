// Where the PRESETS row finds the picture of each look, so the roster is browsed by look rather
// than by name (ADR 0015, ADR 0020 — the front door is a good result in one tap).
//
// **Nothing renders here.** ASCII//Convert's `thumbnail.ts` converts each Preset on the Source the
// user brought; this program pre-renders its ten over one fixed plate at build time and ships the
// results, because five of its eight Effects measure in absolute pixels and a Chain run into a 96px
// box is a different, louder look than the chip claims to name (ADR 0028). What survives into the
// running program is this — an id, a URL, and the box they are laid out in.
//
// `npm run glitch:thumbnails` writes the images; `scripts/glitch/preset-thumbnails.mjs` holds the
// numbers they were written at, and `apps/glitch/scripts/preset-thumbnails.test.mjs` refuses to let
// this file and that one drift apart, or either of them drift from the committed images.

/** The box a thumbnail is laid out in, in CSS pixels. The committed image is larger — see
 *  `THUMBNAIL_SCALE` — and the `<img>` draws it down into this. */
export const THUMBNAIL_WIDTH = 96
export const THUMBNAIL_HEIGHT = 60

/**
 * The committed thumbnail for a Preset.
 *
 * Derived from the id rather than looked up in a table, and the id is the filename for exactly that
 * reason: a table is a second list to keep in step with `PRESETS`, and the failure it invites — a
 * newly curated look whose image nobody wired up — is a 404 nothing in the build would catch. The
 * generator writes the directory whole and the drift guard walks it against `PRESETS`, so a missing
 * image and an orphaned one both fail a test instead.
 *
 * Root-absolute, the same shape as every other `public/` asset this program names (`index.html`,
 * `manifest.webmanifest`). These are served as they were committed rather than emitted through
 * Vite: a hashed import would inline them into the entry chunk under its default
 * `assetsInlineLimit`, which is the one place on this program's byte budget with no room (ADR 0028).
 */
export function presetThumbnailUrl(id: string): string {
  return `/presets/${id}.webp`
}
