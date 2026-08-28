import { useEffect, useState } from 'react'
import { derivePresetThumbnails } from '../ascii/thumbnail'

/**
 * What a Source Image was already drawn as. It is immutable for the session (CONTEXT.md), so its
 * seven thumbnails are too, and keying them on the element lets them survive the PRESETS panel
 * being torn down and rebuilt as the user moves between tabs (ADR 0020 — one panel at a time).
 * Weak so clearing the Source is what frees them; nothing here has a lifetime to manage.
 *
 * A Live Source is deliberately not in here. Its scene is not the same twice, and a cache would
 * pin the row to whatever the camera had warmed up to — the asymmetry the `adaptive` Color Mode
 * already names for the same reason.
 */
const derivedForImage = new WeakMap<HTMLImageElement, Record<string, string>>()

/**
 * The PRESETS row's thumbnails — derived once per Source, never once per frame.
 *
 * The Source is the effect's only dependency, and there is nothing else it could be: a Preset is a
 * fixed ConversionSettings snapshot, so nothing the user tunes afterwards changes what a thumbnail
 * should show. Under a Live Source the derivation reads one frozen frame rather than the running
 * stream (`snapshotSource`) — the alternative is seven extra conversions every 15th of a second,
 * for a row that is being *looked at* rather than filmed.
 */
export function usePresetThumbnails(
  source: HTMLImageElement | HTMLVideoElement | null,
): Record<string, string> {
  const [thumbnails, setThumbnails] = useState<Record<string, string>>({})

  useEffect(() => {
    if (!source) {
      setThumbnails({})
      return
    }

    const remembered = source instanceof HTMLImageElement ? derivedForImage.get(source) : undefined
    const derived = remembered ?? derivePresetThumbnails(source)
    setThumbnails(derived)
    if (source instanceof HTMLImageElement && Object.keys(derived).length > 0) {
      derivedForImage.set(source, derived)
    }

    // A Live Source the camera has decoded no frame for yet has nothing to snapshot, and the
    // derivation says so by handing back nothing rather than seven blank chips — so wait for
    // `loadeddata`, the event that promises there is now a frame to read, and ask again. Asking
    // first costs nothing: the refusal lands before any conversion runs.
    if (!(source instanceof HTMLVideoElement) || Object.keys(derived).length > 0) {
      return
    }
    const onFirstFrame = () => setThumbnails(derivePresetThumbnails(source))
    source.addEventListener('loadeddata', onFirstFrame, { once: true })
    return () => source.removeEventListener('loadeddata', onFirstFrame)
  }, [source])

  return thumbnails
}
