// The accessibility work of #288 and #297, which nothing in the repo currently holds: every control
// made operable and taken to a 44x44 pointer target, and a Chip held to 44px on the axis its label
// leaves short. Both were found in a browser and fixed in a browser, and both regress the first time
// a control is restyled — nothing objects, because nothing measures.
//
// THREE GUARDS, because one tool does not cover the three failures.
//
// `expectNoAxeViolations` is the broad sweep: names, roles, contrast, landmarks — the rules an
// engine already encodes better than a hand-written assertion would. It is deliberately not given
// the last word on the other two.
//
// `expectEveryControlHoldsTheTarget` is the 44x44 of #288 and #297, and it is ours to write for two
// reasons. axe's own `target-size` measures the AA floor of 24px, not the 44px this deck holds
// itself to; and half the deck's targets are not the element's box at all. A control standing on the
// user's artwork (ADR 0013) or on SPRAWL's piece (ADR 0021) buys its 44px as an invisible `::after`
// overlay precisely so the visible chrome does not grow (`ui/touch-target.ts`), and a measurement
// that read only `getBoundingClientRect` would report the chrome it was designed to leave small.
//
// `expectEveryMarkOnTheCanvasStandsOnItsOwnGround` is ADR 0013: over the user's pixels a chip's
// backdrop is whatever the Pipeline just painted, so it carries an opaque background of its own or
// it holds no ratio at all. Its counterpart `expectTheCanvasIsItsOwnGround` is the *other* branch of
// the same ADR rather than an exemption from it — see that function.
//
// WHY GEOMETRY AND COMPUTED COLOUR RATHER THAN CLASS NAMES. Two of the three could have been
// written as className assertions and both would have been worthless: #288 found the `out` tab
// carrying every target class it was supposed to and laying out 38px wide, and #297 found three
// Chips the same way. A class list is byte-identical whether or not the box it describes measures
// 44px. So the technique is chosen for what it can *see*, not for what it avoids naming.
//
// The safety around `support/purge.ts`'s trap — a negative assertion resurrecting the very class it
// denied, because Tailwind scans text and does not know an assertion was a denial — comes from
// somewhere else entirely: **`e2e/` is outside every workspace's `content` glob.** That is the
// durable property, and it is a property of the globs rather than of anything written here. Class
// names do appear in this tree, in comments and in an accepted entry's prose, and they are harmless
// only for that reason. Anyone adding `e2e/` to a workspace's `content` inherits the trap.

import AxeBuilder from '@axe-core/playwright'
import { expect, type Page, test } from '@playwright/test'

/**
 * On every test in this suite, and on nothing else.
 *
 * It is what keeps the deck's two e2e jobs separate checks: `Smoke E2E` runs everything *but* this
 * tag, `Accessibility` runs only it. A red run then says which kind of failure it was in the check
 * name, before anyone opens a log — the same reason those two are separate jobs at all.
 */
export const A11Y = { tag: '@a11y' }

/**
 * WCAG 2.5.5 Target Size (Enhanced), which is the bar #288 set for the deck — not the 24px of
 * 2.5.8 AA, which four controls were under before that PR and which axe's own rule measures.
 */
export const MINIMUM_TARGET_PX = 44

/**
 * The rule set every surface is swept against. WCAG 2.0 through 2.2 at A and AA, matching the level
 * ADR 0009 audited this deck to; `best-practice` is left out on purpose, because a guard that fails
 * the build has to fail it on a standard rather than on an opinion.
 */
const STANDARD = ['wcag2a', 'wcag2aa', 'wcag21a', 'wcag21aa', 'wcag22a', 'wcag22aa']

/** The two hand-written guards' ids, so an accepted entry reads the same shape as an axe one. */
const TARGET_RULE = 'target-size-44'
const GROUND_RULE = 'canvas-overlay-ground'

/**
 * One node this surface is allowed to leave failing, and why.
 *
 * Individual by construction: an entry names one rule *and* one element, so accepting the tooltip
 * trigger's contrast cannot quietly accept the next control's. Disabling a rule outright is not
 * expressible here, which is the point (#329).
 *
 * A stale entry fails too. An accepted violation that no longer occurs is a note about a defect
 * somebody already fixed, and leaving it standing is how a suppression list turns into the place
 * defects go to be forgotten.
 */
export interface Accepted {
  /** The axe rule id, or `target-size-44` / `canvas-overlay-ground` for the two guards below. */
  rule: string
  /** The CSS path the report prints for the node, matched exactly. */
  target: string
  /**
   * What the node measured when it was accepted — `37.4x44`, `3.89:1`, the alpha of a backdrop.
   *
   * The entry covers that reading **and anything better**, never anything worse. Without it an
   * acceptance would pin presence and not degree, and the footer trigger could go from 37.4px to
   * 20px inside an entry that still says 37.4 — a new defect wearing an old defect's name, which is
   * the one thing this list must not absorb. Every scale here reads "higher is better", so the
   * comparison is the same one for pixels, contrast ratios and alpha alike.
   *
   * `null` where the rule reports a fact rather than a degree: a form control either has a label or
   * it does not, and there is no worse version of not having one to guard against.
   */
  at: string | null
  /** Why this one node is accepted. A reason, not a category. */
  why: string
}

/**
 * Which program the failure belongs to, taken from the Playwright project rather than passed in:
 * the projects are one per workspace by design, so the label is already correct and cannot drift
 * from the `dist` the assertion actually ran against (`playwright.config.ts`).
 */
function app(): string {
  return test.info().project.name
}

/**
 * A finding, in the one shape all three guards report in — `[app] rule — element`, then the detail
 * under it. The uniformity is what lets a run's three sections read as one report.
 */
function finding(rule: string, target: string, detail: string[]): string {
  return [`[${app()}] ${rule} — ${target}`, ...detail.map((line) => `    ${line}`)].join('\n')
}

interface Found {
  rule: string
  target: string
  /** What this node measures now, in the same spelling an acceptance carries. */
  measured: string | null
  report: string
}

/**
 * Every number in a measurement, in order — `37.4x44` becomes `[37.4, 44]` and `3.89:1` becomes
 * `[3.89, 1]`. One reader for all three guards, which works because every scale they report on runs
 * the same way up: more pixels, more contrast and more alpha are each the better end.
 */
function scaleOf(measurement: string): number[] {
  return (measurement.match(/[\d.]+/g) ?? []).map(Number)
}

/** Whether `now` is worse than the reading an acceptance was written against, on any axis. */
function slippedBelow(now: string | null, accepted: string | null): boolean {
  if (now === null || accepted === null) {
    return false
  }
  const here = scaleOf(now)
  return scaleOf(accepted).some((was, axis) => here[axis] !== undefined && here[axis] < was)
}

/**
 * Drops the accepted nodes and fails on any acceptance that matched nothing.
 *
 * `owns` is what lets a surface keep **one** acceptance list across all three guards: each guard
 * reads only the entries whose rule it could have raised, so the target guard does not report a
 * contrast acceptance as stale merely because it was never in a position to match it.
 *
 * The removing pass and the stale-entry pass are deliberately the same walk — splitting them is how
 * the second one gets dropped later as redundant.
 */
function applyAcceptances(
  found: Found[],
  accepted: Accepted[],
  owns: (rule: string) => boolean,
): string[] {
  const mine = accepted.filter((entry) => owns(entry.rule))
  const matched = new Set<Accepted>()

  const remaining = found.flatMap((one) => {
    const hit = mine.find((entry) => entry.rule === one.rule && entry.target === one.target)
    if (hit === undefined) {
      return [one.report]
    }
    // A node named by an acceptance still fails when it has got *worse*: the entry is spent, and
    // the reading it was written against is the thing that says so.
    matched.add(hit)
    return slippedBelow(one.measured, hit.at)
      ? [
          finding(one.rule, one.target, [
            `accepted at ${hit.at}, and it now measures ${one.measured} — worse than the entry covers`,
            `it said: ${hit.why}`,
          ]),
        ]
      : []
  })

  const stale = mine
    .filter((entry) => !matched.has(entry))
    .map((entry) =>
      finding(entry.rule, entry.target, [
        'accepted, but this node no longer fails — delete the acceptance',
        `it said: ${entry.why}`,
      ]),
    )

  return [...remaining, ...stale]
}

interface SmallTarget {
  target: string
  /** The union of the two boxes below, which is the hit area a pointer actually gets. */
  width: number
  height: number
  /** The element's own box, `WxH`. */
  drawn: string
  /** Its `::after` target overlay, `WxH`, or `null` where it has none at all. */
  overlay: string | null
}

interface NakedMark {
  target: string
  canvas: string
  /** The alpha of the ground it did find, `0` where it found none at all. */
  alpha: string
  ground: string
}

interface Inspection {
  smallTargets: SmallTarget[]
  nakedMarks: NakedMark[]
  /** A name for each selector handed in, in the order they were given. */
  named: string[]
}

/**
 * One pass over the built page, serving all three guards.
 *
 * It is one function rather than three because all three need the same two things — a name for an
 * element and a walk of its ancestors — and a second copy of either would be a second copy that
 * drifts. axe's findings come through `resolve`: axe names a node with the shortest selector that
 * happens to be unique on *that* screen, so the same header button is `.min-w-[44px]` on one
 * surface and `.px-xs` on the next, and an acceptance written against either would hold on one
 * screen only. Resolving them here gives all three reports one vocabulary.
 */
async function inspect(page: Page, minimum: number, resolve: string[] = []): Promise<Inspection> {
  return page.evaluate(
    ([target, selectors]: [number, string[]]) => {
      const CONTROLS = [
        'a[href]',
        'button',
        'input:not([type="hidden"])',
        'select',
        'textarea',
        'summary',
        '[role="button"]',
        '[role="link"]',
        '[role="tab"]',
        '[role="checkbox"]',
        '[role="radio"]',
        '[role="switch"]',
        '[role="menuitem"]',
        '[role="menuitemradio"]',
        '[role="menuitemcheckbox"]',
        '[role="option"]',
        '[role="slider"]',
        '[tabindex]:not([tabindex="-1"])',
      ].join(', ')

      // A framework-generated id is not an anchor: React's `useId` hands out `:r0:`, `:r1:` in mount
      // order, so a path resting on one moves the day a sibling component mounts a step earlier.
      const AUTHORED_ID = /^[A-Za-z][\w-]*$/

      function cssPath(element: Element): string {
        const parts: string[] = []
        let node: Element | null = element
        while (node !== null && node !== document.body) {
          const here: Element = node
          if (AUTHORED_ID.test(here.id)) {
            parts.unshift(`${here.tagName.toLowerCase()}#${here.id}`)
            break
          }
          const twins =
            here.parentElement === null
              ? []
              : [...here.parentElement.children].filter((child) => child.tagName === here.tagName)
          const nth = twins.length > 1 ? `:nth-of-type(${twins.indexOf(here) + 1})` : ''
          parts.unshift(here.tagName.toLowerCase() + nth)
          node = here.parentElement
        }
        return parts.join(' > ')
      }

      // A region whose whole job is to change. Naming one by what it currently holds would put the
      // machine's own output inside an accepted node's name — GOLEM//Console's Terminal and its
      // Registers are the live example, and an acceptance keyed on `r00x00000051` turns this job
      // red the day the ISA changes, which teaches exactly the wrong lesson.
      const LIVE = 'output, [aria-live], [role="status"], [role="alert"], [role="log"]'

      // Its own text, not its subtree's. A panel is named by its label, never by the dump of rows
      // inside it, and the elements that deserve a text name are the ones that draw the text.
      function ownText(element: Element): string {
        return [...element.childNodes]
          .filter((child) => child.nodeType === Node.TEXT_NODE)
          .map((child) => child.textContent ?? '')
          .join(' ')
          .replace(/\s+/g, ' ')
          .trim()
      }

      function nameOf(element: Element): string {
        const own = element.getAttribute('aria-label') ?? element.getAttribute('title')
        if (own !== null) {
          return own
        }
        const text = element.matches(LIVE) ? '' : ownText(element)
        if (text !== '') {
          return text
        }
        // Nothing of its own to be called: borrow the name of the region it sits in, which is the
        // stable half of an unnamed panel's identity.
        const region = element.closest('[aria-label]')
        return region === null || region === element
          ? ''
          : `within ${region.getAttribute('aria-label')}`
      }

      function describe(element: Element): string {
        const label = nameOf(element)
        return cssPath(element) + (label === '' ? '' : ` "${label.slice(0, 48)}"`)
      }

      function isOnScreen(element: Element): boolean {
        const style = getComputedStyle(element)
        if (style.visibility === 'hidden' || style.display === 'none') {
          return false
        }
        // Clipped to nothing is the screen-reader-only technique, and it is not a small target — it
        // is no target. The Source drop zone's file input is the live example: #288 made it `sr-only`
        // rather than `display: none` precisely so it keeps its place in the accessibility tree, and
        // the target it offers is the zone drawn around it. It measures 1x1 and is invisible, so
        // reading its box would report a 1px control that nobody is aiming at.
        if (style.clip === 'rect(0px, 0px, 0px, 0px)') {
          return false
        }
        const box = element.getBoundingClientRect()
        return box.width > 0 && box.height > 0
      }

      // The pseudo-element a control on the canvas or the piece buys its target with. It is
      // absolutely positioned and centred on the control, so the union of the two boxes is the
      // larger of the two in each axis — measuring only the element would report the chrome that was
      // deliberately left small (`ui/touch-target.ts`). One still in the flow is ordinary decoration
      // and has already grown the element's own box, so it is skipped rather than counted twice.
      //
      // Both pseudo-elements are read even though the kit only ever spells `::after`, and the report
      // names whichever one it found: a guard that looked only where the current constants happen to
      // put the overlay would quietly under-measure the first control that used the other.
      function overlayBox(
        element: Element,
      ): { which: string; width: number; height: number } | null {
        const boxes = ['::before', '::after']
          .map((which) => ({ which, style: getComputedStyle(element, which) }))
          .filter(({ style }) => style.content !== 'none' && style.position !== 'static')
          .map(({ which, style }) => ({
            which,
            width: Number.parseFloat(style.width) || 0,
            height: Number.parseFloat(style.height) || 0,
          }))

        return boxes.length === 0
          ? null
          : {
              which: boxes.map(({ which }) => which).join(' and '),
              width: Math.max(...boxes.map(({ width }) => width)),
              height: Math.max(...boxes.map(({ height }) => height)),
            }
      }

      const round = (value: number): number => Math.round(value * 10) / 10

      const smallTargets = [...document.querySelectorAll(CONTROLS)]
        .filter((element) => {
          // WCAG 2.5.5 exempts a control nothing can press, and so does the deck.
          if (element.matches(':disabled') || element.getAttribute('aria-disabled') === 'true') {
            return false
          }
          return isOnScreen(element)
        })
        .map((element) => {
          const box = element.getBoundingClientRect()
          const overlay = overlayBox(element)
          return {
            target: describe(element),
            width: round(Math.max(box.width, overlay?.width ?? 0)),
            height: round(Math.max(box.height, overlay?.height ?? 0)),
            // Both boxes travel, not a "did the overlay help" flag: a control whose overlay is
            // present but too small reads as "no overlay" under a flag, which is the one wrong
            // answer a report about target overlays must never give.
            drawn: `${round(box.width)}x${round(box.height)}`,
            overlay:
              overlay === null
                ? null
                : `${overlay.which} measures ${round(overlay.width)}x${round(overlay.height)}`,
          }
        })
        .filter(({ width, height }) => width < target || height < target)

      // `rgb(…)` is opaque, `rgba(…, α)` carries its own, and `transparent` computes to α 0.
      function alphaOf(colour: string): number {
        const parts = colour.match(/[\d.]+/g)
        return parts === null || parts.length < 4 ? 1 : Number.parseFloat(parts[3])
      }

      function overlaps(a: DOMRect, b: DOMRect): boolean {
        return a.left < b.right && a.right > b.left && a.top < b.bottom && a.bottom > b.top
      }

      // Whether the mark is stacked *above* the canvas rather than merely near it. Positioning is
      // what decides it: the canvas is in the flow, so any positioned ancestor-or-self of the mark
      // below the canvas's own container paints over it, and an in-flow neighbour never does.
      function isStackedOver(mark: Element, canvas: Element): boolean {
        for (let node: Element | null = mark; node !== null; node = node.parentElement) {
          if (node.contains(canvas)) {
            return false
          }
          const position = getComputedStyle(node).position
          if (position === 'absolute' || position === 'fixed') {
            return true
          }
        }
        return false
      }

      const canvases = [...document.querySelectorAll('canvas')].filter(isOnScreen)

      // Marks, not controls. The LIVE and REC badges are `<span>`s and are the exact chips ADR 0013
      // was written about — REC measured 1.57:1 against a bright feed. So the unit is "an element
      // that draws text of its own", which catches a badge, a control and a label alike.
      const marks = [...document.querySelectorAll('*')].filter(
        (element) =>
          [...element.childNodes].some(
            (child) => child.nodeType === Node.TEXT_NODE && (child.textContent ?? '').trim() !== '',
          ) && isOnScreen(element),
      )

      const nakedMarks: NakedMark[] = []

      for (const mark of marks) {
        const markBox = mark.getBoundingClientRect()
        const canvas = canvases.find(
          (one) => overlaps(markBox, one.getBoundingClientRect()) && isStackedOver(mark, one),
        )
        if (canvas === undefined) {
          continue
        }

        // One walk up from the mark, stopping at the canvas's own container — past that point every
        // ancestor paints *behind* the canvas, so however opaque it is the mark never meets it.
        let ground: Element | null = null
        for (
          let node: Element | null = mark;
          node !== null && !node.contains(canvas);
          node = node.parentElement
        ) {
          if (alphaOf(getComputedStyle(node).backgroundColor) > 0) {
            ground = node
            break
          }
        }

        // No background anywhere above the canvas is the *worst* case, not an excused one, and it
        // gets reported like any other. ADR 0013 states it as a standing constraint — "a control
        // added to the canvas without a background token is a defect even though nothing in the
        // type system objects" — so a mark with nothing behind it is the exact node that rule
        // exists to name. An earlier draft skipped these, and skipping them is what made a whole
        // branch of this guard unable to fail.
        if (ground === null) {
          nakedMarks.push({
            target: describe(mark),
            canvas: describe(canvas),
            alpha: '0',
            ground: 'nothing between it and the canvas carries a background at all',
          })
          continue
        }

        const backdrop = getComputedStyle(ground).backgroundColor
        if (alphaOf(backdrop) < 1) {
          nakedMarks.push({
            target: describe(mark),
            canvas: describe(canvas),
            alpha: String(alphaOf(backdrop)),
            ground: `the nearest background above the canvas is ${backdrop}, on ${cssPath(ground)}`,
          })
        }
      }

      const named = selectors.map((selector) => {
        const element = document.querySelector(selector)
        return element === null ? selector : describe(element)
      })

      return { smallTargets, nakedMarks, named }
    },
    [minimum, resolve] as [number, string[]],
  )
}

/**
 * axe over whatever is currently on screen, at WCAG A and AA.
 *
 * Call it once per *surface*, not once per app: a tab that is not the active one is not in the DOM
 * (ADR 0020), so a single sweep of the opening screen would leave most of a program's controls
 * unswept.
 */
export async function expectNoAxeViolations(page: Page, accepted: Accepted[] = []): Promise<void> {
  const { violations } = await new AxeBuilder({ page }).withTags(STANDARD).analyze()

  const nodes = violations.flatMap((violation) =>
    violation.nodes.map((node) => ({ violation, node })),
  )
  const { named } = await inspect(
    page,
    MINIMUM_TARGET_PX,
    nodes.map(({ node }) => node.target.join(' ')),
  )

  const found = nodes.map(({ violation, node }, at) => {
    // The one axe rule that reports a *degree*. Everything else it raises is a fact — a control
    // either has a name or it does not — so those acceptances pin presence, and say so.
    const ratio = (node.failureSummary ?? '').match(/contrast of ([\d.]+)/)

    return {
      rule: violation.id,
      target: named[at],
      measured: ratio === null ? null : `${ratio[1]}:1`,
      report: finding(violation.id, named[at], [
        violation.help,
        node.html.replace(/\s+/g, ' ').slice(0, 160),
        ...(node.failureSummary ?? '').split('\n').filter((line) => line.trim() !== ''),
        violation.helpUrl,
      ]),
    }
  })

  // Soft, and so are the two below: the three guards catch unrelated failures, and a hard assertion
  // in the first would leave a surface's targets unmeasured until its contrast was fixed. That is
  // not hypothetical — the first run of this suite hid a 37px control behind a contrast finding on
  // the same screen.
  expect
    .soft(
      applyAcceptances(found, accepted, (rule) => rule !== TARGET_RULE && rule !== GROUND_RULE),
      `${app()} — axe`,
    )
    .toEqual([])
}

/**
 * Every interactive control on screen at `MINIMUM_TARGET_PX` in both axes, counting the `::after`
 * overlay a control on the canvas or the piece buys its target with instead of growing.
 */
export async function expectEveryControlHoldsTheTarget(
  page: Page,
  accepted: Accepted[] = [],
): Promise<void> {
  const { smallTargets } = await inspect(page, MINIMUM_TARGET_PX)

  const found = smallTargets.map(({ target, width, height, drawn, overlay }) => ({
    rule: TARGET_RULE,
    target,
    measured: `${width}x${height}`,
    report: finding(TARGET_RULE, target, [
      `the hit area is ${width}x${height}, under the ${MINIMUM_TARGET_PX}x${MINIMUM_TARGET_PX} of #288`,
      overlay === null
        ? `it draws ${drawn} and has no target overlay (ui/touch-target.ts) to add to it`
        : `it draws ${drawn}, and its target overlay ${overlay} (ui/touch-target.ts)`,
    ]),
  }))

  expect
    .soft(
      applyAcceptances(found, accepted, (rule) => rule === TARGET_RULE),
      `${app()} — pointer targets`,
    )
    .toEqual([])
}

/**
 * ADR 0013 over the built page: every mark drawn on top of a canvas stands on an opaque background
 * that is itself above that canvas.
 *
 * "Above that canvas" is the load-bearing half. A chip's ancestors are *behind* the canvas in paint
 * order — the canvas is their child — so an opaque panel three levels up buys the chip nothing, and
 * only a background the chip or an overlay ancestor draws for itself ever meets it. Opaque, not
 * translucent: ADR 0013 works through the alphas, and none of them survives a backdrop chosen by
 * something other than this program.
 *
 * **No mark is skipped**, including one with no background anywhere above the canvas — that is the
 * worst case rather than an excused one, and ADR 0013 names it as a standing constraint. Where a
 * program draws marks straight onto a canvas it owns, they are accepted one at a time in the
 * spec, with the ADR that actually licenses it. SPRAWL//Atlas's city names are the case, and the
 * reason is ADR 0021 rather than anything in here.
 */
export async function expectEveryMarkOnTheCanvasStandsOnItsOwnGround(
  page: Page,
  accepted: Accepted[] = [],
): Promise<void> {
  const { nakedMarks } = await inspect(page, MINIMUM_TARGET_PX)

  const found = nakedMarks.map(({ target, canvas, alpha, ground }) => ({
    rule: GROUND_RULE,
    target,
    measured: alpha,
    report: finding(GROUND_RULE, target, [
      `drawn over ${canvas}, and standing on it rather than on anything this program painted`,
      ground,
      'ADR 0013: it needs an opaque background of its own — no alpha survives an arbitrary backdrop',
    ]),
  }))

  expect
    .soft(
      applyAcceptances(found, accepted, (rule) => rule === GROUND_RULE),
      `${app()} — canvas overlay ground`,
    )
    .toEqual([])
}

/**
 * ADR 0013's *other* branch, and the reason ASCII//Convert's overlays legitimately carry no
 * background of their own: `paintFrame()` fills the canvas with `--void` before drawing a single
 * glyph, so the chips already stand on the pair ADR 0009 audited.
 *
 * That is a premise, not an exemption, so it is asserted rather than granted. Both halves matter —
 * the fill covers every pixel, and the colour it covers them with is the surface the audit signed
 * off. Narrow the `fillRect` or repaint it in another colour and this is what says so.
 *
 * Nothing is passed in, deliberately. An earlier version took the fill as a parameter and the spec
 * imported it from `renderer.ts` — which made the assertion compare the program's constant to
 * itself and pass however far it drifted. The surface is read off the loaded stylesheet instead.
 *
 * **What it does not cover, stated rather than left to be discovered.** The fill is the literal
 * `#0a0a0f`, and `--bg` resolves to that in `ice` alone. Under the other six Themes the two are
 * different colours, so ADR 0013's exemption — "its overlays already sit on the audited pair" — is
 * true in one Theme of seven and this only ever runs in that one. That is a gap in the ADR rather
 * than in the guard, and widening the guard would assert a thing the deck has not decided: whether
 * the artwork's ground is meant to follow the chrome's Theme at all (the HTML Export spells the same
 * literal, which suggests not). Recorded in #355 for whoever decides.
 */
export async function expectTheCanvasIsItsOwnGround(page: Page): Promise<void> {
  // The overlays are on screen a frame or two before the canvas under them is: sizing waits on a
  // ResizeObserver and its debounce, and the Source has to decode first. So wait for ink rather than
  // for the element — and for *ink*, deliberately, not for the fill: a build that stopped filling
  // would still draw its glyphs, so this cannot become the thing that hides the failure below.
  await page.waitForFunction(() => {
    const canvas = document.querySelector('canvas')
    const context = canvas?.getContext('2d', { willReadFrequently: true }) ?? null
    if (canvas === null || context === null || canvas.width === 0) {
      return false
    }
    const { data } = context.getImageData(0, 0, canvas.width, canvas.height)
    for (let at = 3; at < data.length; at += 4) {
      if (data[at] === 255) {
        return true
      }
    }
    return false
  })

  const painted = await page.evaluate(() => {
    const canvas = document.querySelector('canvas')
    const context = canvas?.getContext('2d', { willReadFrequently: true }) ?? null
    if (canvas === null || context === null || canvas.width === 0) {
      return null
    }

    const { data } = context.getImageData(0, 0, canvas.width, canvas.height)
    const tally = new Map<number, number>()
    let seeThrough = 0

    for (let at = 0; at < data.length; at += 4) {
      if (data[at + 3] < 255) {
        seeThrough += 1
      }
      const packed = (data[at] << 16) | (data[at + 1] << 8) | data[at + 2]
      tally.set(packed, (tally.get(packed) ?? 0) + 1)
    }

    let commonest = 0
    let most = 0
    for (const [packed, count] of tally) {
      if (count > most) {
        commonest = packed
        most = count
      }
    }

    // The audited surface, taken from the page rather than from the program: `--bg` is resolved by
    // the stylesheet the browser actually loaded, and the fill is a literal inside `renderer.ts`.
    // Two independent spellings of one colour, which is the only arrangement in which comparing
    // them means anything — read the fill off the module it comes from and the assertion compares a
    // value to itself.
    const probe = document.createElement('div')
    probe.style.backgroundColor = 'var(--bg)'
    document.body.append(probe)
    const [red, green, blue] = (getComputedStyle(probe).backgroundColor.match(/\d+/g) ?? []).map(
      Number,
    )
    probe.remove()

    return {
      seeThrough,
      ground: `rgb(${(commonest >> 16) & 255}, ${(commonest >> 8) & 255}, ${commonest & 255})`,
      audited: `rgb(${red}, ${green}, ${blue})`,
    }
  })

  expect(painted, `[${app()}] the canvas has not painted — there is nothing to stand on`).not.toBe(
    null,
  )
  expect(
    painted?.seeThrough,
    `[${app()}] ${GROUND_RULE} — the canvas is not filled edge to edge, so an overlay carrying no background of its own stands on whatever is behind the page`,
  ).toBe(0)
  // Ink is sparse against a filled ground, so on a converted frame the commonest colour *is* the
  // fill — which is the claim ADR 0013 exempts this program on.
  expect(
    painted?.ground,
    `[${app()}] ${GROUND_RULE} — the canvas ground is no longer the surface the contrast audit signed off`,
  ).toBe(painted?.audited)
}
