// Pure naming decisions for PNG Export. Blob construction stays in the shells.

/** Domain terms (CONTEXT.md). Capture and Recording arrive with Live Source. */
export type OutputKind = 'png-export'

export function outputFilename(kind: OutputKind): string {
  switch (kind) {
    case 'png-export':
      return 'glitch.png'
  }
}
