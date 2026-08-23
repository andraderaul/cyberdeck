// The Tailwind purge, which the unit suite structurally cannot see: every workspace must list
// `../../packages/deck-kit/src/**/*.{ts,tsx}` in its Tailwind `content`, or the kit primitives'
// classes are dropped at build and the workspace renders unstyled (ADR 0014). Nothing errors.
// Testing Library asserts on `className` strings, which are byte-identical whether or not the class
// has a rule behind it — only a computed style, taken from a browser that has loaded the built
// stylesheet, tells the two apart.
//
// A canary has to be a utility that workspace's OWN globs cannot keep alive, which is why there is
// no single one for the deck: what each workspace renders from the kit differs, and a class the
// workspace also spells would survive the purge and leave the guard passing over a broken build. The
// helper below is for the two workspaces whose only kit surface is the Theme control.

import { expect, type Page } from '@playwright/test'

// Both spelled ONLY in `packages/deck-kit/src/ui/theme-control.tsx` — nothing under `apps/` names
// either, so no workspace-side glob can keep them alive.
const MENU_MIN_WIDTH = '128px' // `min-w-[8rem]` — the popover
const MENU_ITEM_MIN_HEIGHT = '36px' // `min-h-[36px]` — each Theme in it

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
