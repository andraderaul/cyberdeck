// The path that proves the built bundle is a working program and not just a passing test suite:
// it boots, it reaches its empty state, and it says nothing to the console on the way.

import { expect, test } from '@playwright/test'

test('the app loads to its empty state with no console error', async ({ page }) => {
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

  await expect(page.getByRole('banner')).toContainText('ASCII//CONVERT')
  await expect(page.getByText('drag & drop or click to upload')).toBeVisible()
  await expect(page.getByRole('button', { name: /use webcam/i })).toBeVisible()

  expect(errors).toEqual([])
})
