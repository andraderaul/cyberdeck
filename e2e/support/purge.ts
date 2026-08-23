// The Tailwind purge, which the unit suite structurally cannot see: every workspace must list
// `../../packages/deck-kit/src/**/*.{ts,tsx}` in its Tailwind `content`, or the kit primitives'
// classes are dropped at build and the workspace renders unstyled (ADR 0014). Nothing errors.
// Testing Library asserts on `className` strings, which are byte-identical whether or not the class
// has a rule behind it — only a computed style, taken from a browser that has loaded the built
// stylesheet, tells the two apart.
//
// PICKING A CANARY, which is the part that goes wrong quietly.
//
// A canary has to be a utility that the workspace under test CANNOT keep alive on its own globs, so
// there is no single one for the deck: what each workspace draws from the kit differs, and a class
// the workspace also spells would survive the purge and leave the guard passing over a broken build.
// `min-h-[44px]` is the obvious universal candidate and is exactly that trap — ASCII//Convert and
// GLITCH//Studio both spell it in their own components.
//
// The nastier version, and the one to actually watch for: a workspace's Tailwind `content` includes
// its own `*.test.tsx`, so a class named inside a **negative** assertion is generated anyway. A test
// written to prove a class is absent resurrects it. `after:h-[44px]` is the live example — it is a
// kit-only utility everywhere except GLITCH//Studio, where
// `glitch-canvas.test.tsx` asserts `.not.toContain('after:h-[44px]')` and thereby keeps the rule in
// GLITCH's stylesheet. Building GLITCH with the deck-kit glob deleted shows both halves at once:
// `min-h-[160px]` is gone, and `after\:h-\[44px\]:after{content:var(--tw-content);height:44px}` is
// still there. A canary picked that way is a guard that cannot fail.
//
// So the check is not "is this spelled only under `packages/deck-kit/src`" — it is "does anything
// inside THIS workspace's `content` globs spell it", `.test.tsx` and negative assertions included.

import { expect, type Page } from '@playwright/test'

/**
 * The Theme popover's own width. Spelled only in
 * `packages/deck-kit/src/ui/theme-control.tsx`, and nothing under `apps/` names it.
 */
const MENU_MIN_WIDTH = '128px' // `min-w-[8rem]`

/** Each Theme's row in that popover, from the same file and equally unspelled outside the kit. */
const MENU_ITEM_MIN_HEIGHT = '36px' // `min-h-[36px]`

/**
 * The Theme control's popover, which is the whole of the kit that GOLEM//Console and the hub draw:
 * neither renders a hero, a Chip or a Modal, so the sizes in there are the only deck-kit-only
 * utilities either one puts on screen.
 *
 * It costs a click, because the menu is closed until asked for. That is the point of the click: the
 * popover is also the surface #317 watched fall over sideways when the kit's classes went, so
 * reaching it at all is part of what is being checked.
 */
export async function expectThemeMenuKeptItsSizes(page: Page): Promise<void> {
  await page.goto('/')
  await page.getByRole('button', { name: /^theme:/ }).click()

  const menu = page.getByRole('menu', { name: 'theme' })
  await expect(menu).toHaveCSS('min-width', MENU_MIN_WIDTH)
  await expect(menu.getByRole('menuitemradio').first()).toHaveCSS(
    'min-height',
    MENU_ITEM_MIN_HEIGHT,
  )
}
