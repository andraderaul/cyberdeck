// The class of break nothing else on the deck can see: the build is green, the program boots, axe
// is quiet, every control holds its 44px — and it *looks* wrong. A spacing step the preset never
// defined generates no class (`gap-3xs`), a Theme token that resolves to nothing paints the parent's
// colour through, an overlay loses the opaque ground ADR 0013 requires it to carry. Each of those is
// a diff in pixels and in nothing else, so a picture is the only assertion that holds them.
//
// WHY ONE APP, AND WHY THIS ONE. ASCII//Convert has the deck's richest Control Strip — three tabs,
// ten Preset chips each drawing a real conversion of the Source, a settings editor of six fieldsets
// — and it is the program where a Theme has the most surface to break on. It is also, and this is
// the load-bearing half, the only program on the deck whose canvas is *deterministic*:
// GLITCH//Studio's Chain is Seed-driven, SPRAWL//Atlas animates its own render, GOLEM//Console
// prints a machine that is running. ASCII//Convert converts one image to the same glyphs every
// time. A screenshot suite is worth exactly what its determinism is worth, so it goes where the
// determinism already is.
//
// WHAT IS DELIBERATELY NOT HERE. No Live Source — a camera's scene is not the same twice. No
// Recording — it has a running timer in it. No Seed. No `Date.now()`. The Source is a committed
// fixture and the look is a named Preset, which is the whole of what makes these eight files
// reviewable rather than a pile of noise somebody re-baselines on every red run.
//
// THE FONT RACE, which is the criterion most worth being explicit about. **The deck ships no
// webfont at all** — `--font-mono` names "IBM Plex Mono" and "Departure Mono" and the repo contains
// neither, no `@font-face` and no `fonts.googleapis.com` link, which ADR 0024 records under
// "Questions / Future Work". So every glyph in every baseline is the *system* monospace of whatever
// machine took the picture, and there is no download for a screenshot to race. Two things follow,
// and both are written into the harness rather than into a comment only:
//
//  - `settled()` still awaits `document.fonts.ready` before every shot. It resolves on the next
//    microtask today, and it is what keeps that true — the day a webfont does land, the wait is
//    already in the right place instead of being remembered afterwards.
//  - `theDeckShipsNoWebfont` asserts the premise itself, which is the half a wait cannot cover. A
//    `@font-face` added tomorrow would not fail `fonts.ready`; it would quietly make every baseline
//    a picture of one machine's font cache. So the fact is pinned, and whoever adds the first
//    webfont is told, by name, that this suite's baselines must be retaken in the same breath.
//
// THE ENVIRONMENT, which the font situation forces. System monospace means macOS draws Menlo and
// Linux draws DejaVu Sans Mono, and no amount of waiting reconciles those — a baseline taken on a
// developer's laptop cannot be the baseline CI checks. So the pictures are taken in **one pinned
// environment and only one**: `mcr.microsoft.com/playwright:v<lockfile version>-noble` on
// **linux/arm64**, which is what `scripts/screens.sh` runs and what the `Visual regression` job
// runs inside on an `ubuntu-24.04-arm` runner. Same image, same architecture, same fonts, both
// native.
//
// The architecture is not a detail and it is not amd64 by accident. Chromium **cannot run under
// qemu-user**: an `linux/amd64` container on an Apple Silicon machine aborts every browser launch
// with `qemu: Assertion failed: p_rcu_reader->depth != 0`, which was tried and is why this is
// written down. Pinning to amd64 would therefore have meant baselines that can only ever be taken
// inside CI — nobody able to look at a picture before pushing it — while arm64 is native on both
// the machines this deck is developed on and a runner GitHub gives public repositories for free.
// The cost, stated rather than hidden: taking or checking a baseline needs an arm64 machine. On an
// x86 one this suite skips and says so; a *linux* run on the wrong architecture fails loudly
// instead, because that is the case that could otherwise go green having compared nothing.
//
// `{platform}` in `snapshotPathTemplate` puts `linux` in every filename, which is as much as
// Playwright's own token vocabulary can say; `expectTheBaselineEnvironment` carries the other half.

import { readdirSync } from 'node:fs'
import { fileURLToPath } from 'node:url'
import { expect, type Page } from '@playwright/test'
import { THEME_STORAGE_KEY } from './pre-paint'

/**
 * On every test in this suite, and on nothing else — the same device `A11Y` is, for the same
 * reason. `Smoke E2E` runs neither tag, `Accessibility` runs one, `Visual regression` runs this
 * one, and a red run names which kind of failure it was in the check name.
 */
export const SCREENS = { tag: '@screens' }

/**
 * The one platform baselines are committed for, spelled here rather than read from `process` — the
 * point is that a picture taken anywhere else is not comparable, and a constant that followed the
 * runner would say the opposite.
 */
export const BASELINE_PLATFORM = 'linux'

/**
 * The other half of the environment, which `snapshotPathTemplate` has no token for — see the header
 * for why it is this one rather than the amd64 a CI runner defaults to.
 */
const BASELINE_ARCH = 'arm64'

/**
 * GLITCH//Studio's reference plate (ADR 0028) — the deck's own committed 800x500 picture, borrowed
 * rather than duplicated, and it stays a build-time input either way.
 *
 * Not `apps/ascii/gifs/ai-demo.png`, which is what the a11y sweep drives the program with and would
 * have been the consistent choice. That one is a dark screenshot: converted, most of the canvas
 * comes back empty, and a baseline of an empty canvas pins almost nothing — ten Preset thumbnails
 * of the same near-nothing least of all. The plate was drawn to have structure at every scale,
 * which is exactly what makes a picture of it worth diffing.
 */
const SOURCE_IMAGE = fileURLToPath(
  new URL('../../scripts/glitch/reference-plate.png', import.meta.url),
)

/**
 * The Preset every Source shot is taken under, named once: a look is only a baseline if it is the
 * same look next time, and `Matrix Terminal` is the chip the program has always opened on.
 */
const KNOWN_PRESET = 'Matrix Terminal'

/** Ten chips in the PRESETS row, each with a thumbnail derived from the Source asynchronously. */
const PRESET_COUNT = 10

/**
 * Every baseline this suite owns, in one list, because the list is the thing a reviewer reads.
 *
 * It is also the guard's other side. Playwright fails a shot whose picture changed and says nothing
 * about a picture nothing takes any more — a `.png` left behind by a deleted test is a file that
 * can never go red, which is the screenshot version of the stale acceptance `support/accepted.ts`
 * refuses to carry. `theBaselineSetIsExactlyWhatIsDeclared` closes it: the directory must hold
 * these files and no others, so the set can be changed only on purpose.
 */
const SHOTS = [
  'empty-state',
  'empty-state-kuang',
  'source-matrix-terminal',
  'source-matrix-terminal-kuang',
  'strip-presets',
  'strip-edit',
  'strip-out',
  'strip-out-kuang',
] as const

/**
 * The Theme in the shot, set the way the program's own pre-paint script reads it (ADR 0024) rather
 * than by driving the header popover: the picker is chrome that would be *in* the picture, and a
 * Theme is supposed to be a property of the surface rather than of the menu that chose it.
 */
async function open(page: Page, theme: string): Promise<void> {
  await page.addInitScript(([key, value]) => localStorage.setItem(key, value), [
    THEME_STORAGE_KEY,
    theme,
  ] as const)
  await page.goto('/')
  await expect(page.locator('html')).toHaveAttribute('data-theme', theme)
}

/**
 * Everything that has to be true before a picture is worth taking. `toHaveScreenshot` already waits
 * for two consecutive identical frames, so this covers only what a settled frame cannot imply — the
 * font set, per the header above.
 */
async function settled(page: Page): Promise<void> {
  await page.evaluate(() => document.fonts.ready)
}

/** The empty state, in one Theme. */
export async function emptyState(page: Page, theme: string): Promise<void> {
  await open(page, theme)
  await expect(page.getByText('drag & drop or click to upload')).toBeVisible()
  await settled(page)
}

/**
 * The fixture loaded and a named Preset applied — the one state a Source shot may ever be taken in.
 *
 * The thumbnail wait is not politeness: the chips derive their pictures from the Source off the
 * critical path (`use-preset-thumbnails.ts`), so a shot taken before they land is a picture of a
 * row that is still filling in, and it lands differently often enough to be a flake rather than a
 * failure.
 */
export async function withSourceAndPreset(page: Page, theme: string): Promise<void> {
  await open(page, theme)
  await page.setInputFiles('input[type=file]', SOURCE_IMAGE)
  await expect(page.locator('canvas').first()).toBeVisible()

  await expect(page.locator('#strip-panel-presets img')).toHaveCount(PRESET_COUNT)
  await page.getByRole('button', { name: KNOWN_PRESET, exact: true }).click()
  await expect(page.getByRole('button', { name: KNOWN_PRESET, exact: true })).toHaveAttribute(
    'aria-pressed',
    'true',
  )

  await settled(page)
}

/** The Control Strip alone — the tab row and the panel under it, without the canvas above them. */
export function theStrip(page: Page) {
  return page.getByRole('tablist', { name: 'controls' }).locator('..')
}

/** Moves the Strip to one of its three tabs and waits for the panel to be the one asked for. */
export async function onTab(page: Page, tab: string): Promise<void> {
  await page.getByRole('tab', { name: tab }).click()
  await expect(page.getByRole('tab', { name: tab })).toHaveAttribute('aria-selected', 'true')
  await expect(page.locator(`#strip-panel-${tab}`)).toBeVisible()
}

/**
 * That this run is comparing pictures to pictures taken the same way.
 *
 * The suite skips on a machine that is not Linux at all, because that is a developer running the
 * wrong command and a skip with instructions is the right answer. This is the other case: a *Linux*
 * run on the wrong architecture, which is a misconfigured job, and a job that quietly compared
 * nothing is worse than one that failed.
 */
export function expectTheBaselineEnvironment(): void {
  expect(
    `${process.platform}-${process.arch}`,
    'the baselines were taken in the pinned Playwright image on linux/arm64 and are not comparable ' +
      "anywhere else — the deck ships no webfont, so every glyph in them is one machine's system " +
      'monospace. Run them with `npm run screens`, or fix the runner this job asked for.',
  ).toBe(`${BASELINE_PLATFORM}-${BASELINE_ARCH}`)
}

/**
 * That the deck still ships no webfont — see the header. Asserted against the running page rather
 * than against the repo's files, because what matters is what the browser was holding when the
 * picture was taken, and a font could arrive from a stylesheet, an `@font-face` or a `FontFace`
 * constructed at runtime.
 */
export async function theDeckShipsNoWebfont(page: Page): Promise<void> {
  await page.goto('/')
  const loaded = await page.evaluate(async () => {
    await document.fonts.ready
    return [...document.fonts].map((face) => face.family)
  })

  expect(
    loaded,
    'a webfont has landed in the deck. Every baseline in this suite was taken on the system monospace ' +
      'the fallback resolves to, so all eight are now pictures of a font that is no longer what ships. ' +
      'Retake them in the same change — `npm run screens:update` — and read them again before ' +
      'committing: this is the one situation where the whole set changes at once and none of it is a bug.',
  ).toEqual([])
}

/**
 * That the committed baselines are exactly the declared ones — no missing file, and no orphan left
 * behind by a test somebody deleted. See `SHOTS`.
 */
export function theBaselineSetIsExactlyWhatIsDeclared(directory: string): void {
  const committed = readdirSync(directory).sort()
  const declared = SHOTS.map((shot) => `${shot}-${BASELINE_PLATFORM}.png`).sort()

  expect(
    committed,
    `${directory} holds a picture no test takes, or is missing one it does`,
  ).toEqual(declared)
}
