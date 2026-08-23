// What the deck runs, as content rather than as a core (ADR 0025): the hub has no pure pipeline
// and no currency of its own, because a domain is a subject and a subject would make it a program.
// This is the copy on the door, written down once so the page renders it instead of repeating it.

/** ADR 0021's two categories, which is the deck's own vocabulary rather than a label invented here. */
export type Kind = 'tool' | 'piece'

export interface Program {
  /** The workspace directory under `apps/`, which is also the React key. */
  id: string
  name: string
  kind: Kind
  /** The one line under the name — what you do here, in the imperative the program itself uses. */
  tagline: string
  description: string
  /** The live deploy. Its own origin, its own build, its own version (ADR 0011, ADR 0012). */
  url: string
}

/**
 * The four programs, in the order they joined the deck. The three tools come first and the piece
 * last, which is both chronological and the honest reading order: `f(your_input)` three times, then
 * the one thing that asks nothing of you (ADR 0021).
 *
 * The URLs are the live deploys and nothing in CI proves them alive — a renamed Vercel project
 * breaks the door silently (ADR 0025).
 */
export const PROGRAMS: readonly Program[] = [
  {
    id: 'ascii',
    name: 'ASCII//CONVERT',
    kind: 'tool',
    tagline: 'image → ascii art',
    description:
      'Drop an image or open the webcam and watch it resolve into characters, live. Tune the resolution, the glyph set and the colour, then take the result out as PNG, as plain text, or as coloured HTML you can still select.',
    url: 'https://ascii-art-converter-tawny.vercel.app/',
  },
  {
    id: 'glitch',
    name: 'GLITCH//STUDIO',
    kind: 'tool',
    tagline: 'break the picture on purpose',
    description:
      'A chain of eight effects over an image or a webcam feed — pixel sort, channel shift, block displacement, wave and the rest — reordered and retuned live. Seeded, so the same chain gives you the same damage twice.',
    url: 'https://cyberdeck-glitch-studio.vercel.app/',
  },
  {
    id: 'golem',
    name: 'GOLEM//CONSOLE',
    kind: 'tool',
    tagline: 'a 32-bit fantasy computer',
    description:
      'Write assembly, assemble it, and drive execution from a command line while the registers, the memory and the Terminal update under you. Interrupts dispatch to handlers you wrote; the cache tells you Hit or Miss on every access.',
    url: 'https://cyberdeck-golem.vercel.app/',
  },
  {
    id: 'sprawl',
    name: 'SPRAWL//ATLAS',
    kind: 'piece',
    tagline: 'rewrite the map. increase the scale.',
    description:
      "The world's connected capacity as light, one pixel per gigabyte — which is fine enough that the screen whites out under its own load. You repair it by sliding the scale coarser until structure comes back out of the overflow.",
    url: 'https://atlas-sprawl.vercel.app/',
  },
] as const
