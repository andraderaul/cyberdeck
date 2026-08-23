// The hub's front door is a list of doors, so its smoke path is the list and the doors: every
// program in the roster is on the page as a link, each pointing at that program's own deploy, and a
// click on one is really followed.
//
// The roster is imported rather than transcribed — `roster.test.ts` already pins the URLs, and a
// second copy here would only record which of the two was edited last. What this adds is that the
// built page renders all of it, and that the card is a link a press actually leaves on: the whole
// card is one `<a>` (ADR 0025), and a card that laid out wrong — an overlay above the anchor, a
// zero-height row — would still pass every assertion the unit suite can make about its `href`.

import { expect, test } from '@playwright/test'
import { PROGRAMS } from '../../apps/deck/src/roster'

test('the door lists every program with no console error', async ({ page }) => {
  const errors: string[] = []
  page.on('console', (message) => {
    if (message.type() === 'error') {
      errors.push(message.text())
    }
  })
  page.on('pageerror', (error) => {
    errors.push(error.message)
  })

  await page.goto('/')

  await expect(page.getByRole('banner')).toContainText('CYBERDECK')
  await expect(page.getByRole('heading', { name: 'what the deck runs' })).toBeVisible()

  await Promise.all(
    PROGRAMS.map(async ({ name, url }) => {
      const card = page.getByRole('link', { name: new RegExp(name, 'i') })
      await expect(card).toBeVisible()
      await expect(card).toHaveAttribute('href', url)
    }),
  )

  expect(errors).toEqual([])
})

test('a card is a link a press is really followed to', async ({ page }) => {
  const [first] = PROGRAMS

  // Every program is on its own origin (ADR 0011), so following the link for real would mean
  // reaching the network and a red check the day a deploy is slow. The route stands in for the
  // program: what is under test is that the press leaves the hub for that exact URL.
  //
  // Which is also the limit of this test, and worth saying where the stub is rather than only in
  // `roster.ts`: it proves the anchor is real and followable, never that anything is listening at
  // the other end. A renamed Vercel project still breaks the door in silence (ADR 0025).
  await page.route(first.url, (route) =>
    route.fulfill({ contentType: 'text/html', body: '<title>the program</title>' }),
  )

  await page.goto('/')
  await page.getByRole('link', { name: new RegExp(first.name, 'i') }).click()

  await expect(page).toHaveURL(first.url)
})
