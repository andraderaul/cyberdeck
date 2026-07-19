// Download naming and plumbing. Deliberately a copy of the shape ASCII//Convert and
// GLITCH//Studio use rather than an extraction — ADR 0014 records that `output.ts` stays
// duplicated until a seam is proven, and a third copy is the signal, not the trigger.

type OutputKind = 'hex-export' | 'trace-export'

/** The downloaded file's name, following the deck's `<program>-<what>.<ext>` convention. */
export function outputFilename(kind: OutputKind): string {
  switch (kind) {
    case 'hex-export':
      return 'golem-image.hex'
    case 'trace-export':
      return 'golem-trace.txt'
  }
}

/** Saves text to the user's machine. Nothing leaves the browser — the deck has no backend. */
export function downloadText(filename: string, contents: string): void {
  const blob = new Blob([contents], { type: 'text/plain' })
  const link = document.createElement('a')
  link.href = URL.createObjectURL(blob)
  link.download = filename
  link.click()
  URL.revokeObjectURL(link.href)
}
