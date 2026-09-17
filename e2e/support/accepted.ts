// What the guards in `a11y.ts` found already broken on the day they landed (#329), written down one
// node at a time.
//
// Every entry here was a real defect. None of them was introduced by the guard — the guard is where
// they became visible, which is the whole point of adding one to a codebase that has been shipping
// for a while. They were accepted rather than fixed because each remedy is app behaviour with a
// changeset behind it and #329 is tooling only; the full write-up, with ratios and measurements,
// is **#355**.
//
// THE RULES THIS FILE PLAYS BY, because a suppression list is one refactor away from being the place
// defects go to be forgotten:
//
//  - One entry is one *node*. There is no way to spell "and every other mark like it" here, and
//    that is deliberate — accepting one of SPRAWL//Atlas's city labels must not quietly accept the
//    next mark somebody draws over the map.
//  - An entry that stops matching **fails the build**. Fix the cause, delete the entry; leave it and
//    the guard says so by name. So the list can only ever shrink, and it cannot silently outlive
//    what it describes.
//  - Every entry carries the reading it was written against (`at`), and covers that reading **and
//    anything better** — never anything worse. Without it an entry would pin presence and not
//    degree, and a label accepted at 4.37:1 could slide to 2:1 inside an acceptance that still said
//    4.37. `at: null` is for a rule with no degree to slide along: a form control either has a
//    label or it does not.
//  - Every factory below says what the defect *is*, not that it is tolerated. A `why` that reads
//    "known issue" would be worth less than no entry at all.
//
// They are factories rather than constants because one defect covers many nodes: the piece's ink is
// thirteen marks at thirteen paths. The prose is written once, on the factory; the node is named at
// the callsite, in the spec for the surface it fails on.
//
// **The list has shrunk twice, and by the route above.** #355's sections 2, 3 and 4 were fixed
// rather than carried: the footer's `about` trigger, the Theme popover's seven rows per workspace,
// GOLEM//Console's command line and ASCII//Convert's authored-Charset sibling, the five scrolling
// panels a keyboard could not reach, and SPRAWL//Atlas's dimmed key hint — thirty-eight entries and
// six factories. Section 1 followed: `ice`'s `--accent` was re-derived under the Theme Contract, so
// the sixteen accent labels across four programs went too, the Theme popover's checked row among
// them, and `theThemePopover` went empty and was deleted rather than left returning nothing.
//
// What is left is not a deferral at all — it is ADR 0021's licence, held one node at a time.

import type { Accepted } from './a11y'

/**
 * A mark SPRAWL//Atlas draws straight onto its own render, with no plate under it — a city name, or
 * the dataset line under the map.
 *
 * The licence is **ADR 0021, not ADR 0013**, and the distinction is the whole of it. ADR 0013 is
 * about anything standing on pixels *this program did not choose*; SPRAWL's canvas is the program's
 * own render of a vendored snapshot (ADR 0022), and a city name is positioned by the renderer at the
 * coordinates of the thing it names. An opaque plate behind each one would be a second map drawn
 * over the first — the piece being charged for its own labels, which is what ADR 0021 forbids.
 *
 * Accepted here rather than skipped in the guard, and that is deliberate. An earlier draft had the
 * guard walk past every plateless mark deck-wide, which read as principled and was not: nothing in
 * it was scoped to SPRAWL or to the piece, so it also walked past a GLITCH//Studio chip that had
 * lost its background — the exact defect ADR 0013 exists to catch. The judgement belongs in a list
 * that names nodes, not in a `continue`.
 *
 * One entry per label, and the list grows if the label set does. That is the intended cost: it is
 * what stops "the labels are the piece" quietly becoming "text over the map is exempt".
 */
export function thePiecesOwnInk(element: string): Accepted {
  return {
    rule: 'canvas-overlay-ground',
    target: element,
    at: '0',
    why: "ADR 0021: drawn onto the program's own render at the coordinates of what it names, not chrome standing on pixels this program did not choose. A plate behind each one would charge the piece for its own labels.",
  }
}
