// What the guards in `a11y.ts` found already broken on the day they landed (#329), written down one
// node at a time.
//
// Every entry here is a real defect. None of them was introduced by the guard — the guard is where
// they became visible, which is the whole point of adding one to a codebase that has been shipping
// for a while. They are accepted rather than fixed because each remedy is app behaviour with a
// changeset behind it and #329 is tooling only; the full write-up, with ratios and measurements,
// is **#355**.
//
// THE RULES THIS FILE PLAYS BY, because a suppression list is one refactor away from being the place
// defects go to be forgotten:
//
//  - One entry is one *node*. There is no way to spell "and every other control like it" here, and
//    that is deliberate — accepting the footer's `about` trigger must not quietly accept the next
//    control that lands 37px wide.
//  - An entry that stops matching **fails the build**. Fix the cause, delete the entry; leave it and
//    the guard says so by name. So the list can only ever shrink, and it cannot silently outlive
//    what it describes.
//  - Every entry carries the reading it was written against (`at`), and covers that reading **and
//    anything better** — never anything worse. Without it an entry would pin presence and not
//    degree, and the footer trigger could slide from 37.4px to 20px inside an acceptance that still
//    said 37.4. `at: null` is for a rule with no degree to slide along: a form control either has a
//    label or it does not.
//  - Every factory below says what the defect *is*, not that it is tolerated. A `why` that reads
//    "known issue" would be worth less than no entry at all.
//
// They are factories rather than constants because the same defect appears at different paths in
// different programs — the Theme menu row is the kit's, and it fails in all four workspaces that
// render the control, under four different ancestors. The prose is written once, on the factory;
// the node is named at the callsite, in the spec for the surface it fails on.

import { THEMES } from '../../packages/deck-kit/src/theme/themes'
import type { Accepted } from './a11y'

/** Where the full inventory lives, quoted in every `why` so a reader never has to hunt for it. */
const WRITTEN_UP = 'see #355'

/**
 * `--accent` used as small text on any surface other than `--void`.
 *
 * ADR 0009's table is unambiguous about this token: `#b829ff` measures 4.51:1 on `--void` and
 * **nothing else** — 4.35:1 on `--abyss`, 3.90:1 on `--shadow`. That ADR granted the
 * cyberpunk-register exception to exactly two labels in `analysis-modal.tsx`, and wrote down that
 * "any future addition of `text-violet text-xs` on `--abyss` or darker backgrounds should be
 * evaluated individually before being granted the same exception". Sixteen later ones exist across
 * four programs — twelve named at a callsite below and four more from `theThemePopover`, one per
 * workspace that renders the control — and none was evaluated. This is that evaluation being
 * deferred, in writing.
 *
 * Not a hole in the kit's Theme Contract guard, which is doing exactly its job: it proves *token
 * pairs* from token values, and an accent foreground over a lit surface is a pair it does not hold.
 * Only a browser that has composited the real surfaces can find these.
 */
export function accentOnALitSurface(element: string, ratio: string): Accepted {
  return {
    rule: 'color-contrast',
    target: element,
    at: ratio,
    why: `--accent as small text off --void reads ${ratio}, under AA-small. ADR 0009 has this token as "PASS on void only" and asked for each later use to be evaluated one at a time; ${WRITTEN_UP}.`,
  }
}

/**
 * A row of the kit's Theme popover, which draws 114x36 — `min-h-[36px]` in `theme-control.tsx`.
 *
 * #288 took twelve controls to 44x44 and did not reach inside a popover, so every Theme row in every
 * program that renders the control is 8px short on the axis a thumb has least of. Deck-wide from one
 * kit component, which is also why fixing it is one line and a changeset per program.
 */
function aThemeMenuRow(element: string): Accepted {
  return {
    rule: 'target-size-44',
    target: element,
    at: '114x36',
    why: `the kit's Theme popover rows draw 114x36 — 8px under the target #288 set, in every program that renders the control; ${WRITTEN_UP}.`,
  }
}

/**
 * The whole of what the kit's Theme popover leaves failing, given the path to the menu in one
 * workspace: a row per Theme at 114x36, plus the checked row's `--accent` label.
 *
 * Still one entry per node — this only spares four specs from transcribing the same list four times,
 * and it reads the roster from the kit so a new Theme arrives with its row already covered rather
 * than reddening four workspaces at once for a reason that has nothing to do with the new Theme.
 */
export function theThemePopover(menu: string): Accepted[] {
  return [
    // Only the checked row carries `--accent`; the other six are `--fg-muted` and clear the bar.
    accentOnALitSurface(`${menu} > button:nth-of-type(1) "${THEMES[0]}"`, '3.89:1'),
    ...THEMES.map((theme, at) =>
      aThemeMenuRow(`${menu} > button:nth-of-type(${at + 1}) "${theme}"`),
    ),
  ]
}

/**
 * The footer's `about` trigger, which measures 37.4x44 in ASCII//Convert and GLITCH//Studio.
 *
 * Precisely the defect #297 found in `Chip`, one layer over: #288 gave this control `min-h-[44px]`
 * and never a width, so the width is held by whatever the label happens to be — and "about" is five
 * characters. The two footers are byte-identical, so one fix covers both.
 */
export function theFooterAboutTrigger(element: string): Accepted {
  return {
    rule: 'target-size-44',
    target: element,
    at: '37.4x44',
    why: `37.4x44 — #288 gave it min-h and no min-w, so the width is whatever "about" happens to measure. Same shape as #297's Chip; ${WRITTEN_UP}.`,
  }
}

/**
 * ASCII//Convert's authored-Charset field, which measures 160x42.8 — 1.2px short.
 *
 * The newest entry in this file and the one that says most about why it exists: the field landed in
 * #356, days after #329 was written and hours before this guard did, and it is the only control on
 * the deck sized purely by its padding and its line box with no floor under either. Nothing in the
 * repo could have said so, which is the argument for the guard in one node.
 */
export function theAuthoredCharsetField(element: string): Accepted {
  return {
    rule: 'target-size-44',
    target: element,
    at: '160x42.8',
    why: `160x42.8 — a text field with no minimum height, so its target is whatever the padding and the line box add up to; ${WRITTEN_UP}.`,
  }
}

/**
 * GOLEM//Console's command line, which measures 794x17.6.
 *
 * The program's whole control grammar is this one input (ADR 0018), and it is the shortest target on
 * the deck. Wide enough to hit is not the same as tall enough to hit.
 */
export function theConsoleCommandLine(element: string): Accepted {
  return {
    rule: 'target-size-44',
    target: element,
    at: '794x17.6',
    why: `794x17.6 — the one control GOLEM//Console has (ADR 0018) is 26px short on its height; ${WRITTEN_UP}.`,
  }
}

/**
 * A panel that scrolls and cannot be reached by keyboard (`scrollable-region-focusable`, WCAG 2.1.1).
 *
 * All five are in GOLEM//Console, which is the program this bites hardest: a keyboard user can drive
 * the machine and cannot scroll back through what it printed, in the one program on the deck whose
 * entire interface is a keyboard.
 */
export function aScrollableRegionWithNoKeyboardAccess(element: string): Accepted {
  return {
    rule: 'scrollable-region-focusable',
    target: element,
    at: null,
    why: `it scrolls and nothing inside it takes focus, so a keyboard cannot reach what has scrolled off — in the program that is nothing but a keyboard; ${WRITTEN_UP}.`,
  }
}

/**
 * SPRAWL//Atlas's `[B]` key hint, dimmed to 60% so the key recedes behind the word it belongs to.
 * Composited it reads `#5f5f79` on `--bg` — 3.19:1.
 *
 * Only while the outline is **off**: turning it on recolours the chip and the hint clears the bar,
 * which is why this is accepted on two of the three SPRAWL surfaces and would be reported as stale
 * on the third.
 */
export function theDimmedKeyHint(element: string): Accepted {
  return {
    rule: 'color-contrast',
    target: element,
    at: '3.19:1',
    why: `opacity-60 over --fg-muted composites to 3.19:1 on --bg, under AA-small, while the outline is off; ${WRITTEN_UP}.`,
  }
}

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

/**
 * A link sitting inside a sentence, whose box is set by the line height of the words around it.
 *
 * The one **permanent** entry in this file, and the only one that is not a defect: WCAG 2.5.5 carries
 * an explicit Inline exception for exactly this, because the alternative is a paragraph whose line
 * spacing is decided by its links. The hub's footer credit is the case — `source` inside a sentence
 * of ordinary text, with the same destination reachable from every card above it.
 */
export function anInlineLinkInASentence(element: string): Accepted {
  return {
    rule: 'target-size-44',
    target: element,
    at: null,
    why: 'WCAG 2.5.5 Inline exception: the target sits in a sentence and its size is set by the line height of the non-target text around it. Not a defect, and not expected to be fixed.',
  }
}
