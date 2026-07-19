---
name: verify
description: Drive GLITCH//Studio in a real browser to observe a change working — including the Live Source (webcam) and Recording paths, which need a fake camera. Use when verifying an apps/glitch change at its real surface.
---

# Verify — GLITCH//Studio

The surface is a browser GUI. Tests and typecheck are not verification here; drive the page.

## Launch

```bash
npm run dev:glitch   # from the repo root → http://localhost:5173/
```

## Handle

Playwright is not a project dependency — it lives in the npx cache, and the full **Chrome for
Testing** binary is what to launch. The bundled `chrome-headless-shell` lacks the media stack, so
`MediaRecorder` / `captureStream` paths die there.

Discover both rather than hardcoding paths: the npx cache directory is a content hash and the
Chromium build number moves, so a literal path is stale on the next machine and on the next install.

```js
import { execSync } from 'node:child_process'
const sh = (c) => execSync(c, { shell: '/bin/bash' }).toString().trim()

const playwright = sh('ls -d "$HOME"/.npm/_npx/*/node_modules/playwright | head -1')
// The `chromium-*` glob excludes `chromium_headless_shell-*` on its own; `sort -V | tail -1` takes
// the newest install rather than whichever the shell lists first.
const chrome = sh(
  'ls -d "$HOME"/Library/Caches/ms-playwright/chromium-*/chrome-mac-arm64/*.app/Contents/MacOS/* | sort -V | tail -1',
)
const { chromium } = await import(`${playwright}/index.mjs`)

const browser = await chromium.launch({
  executablePath: chrome,
  args: [
    '--use-fake-device-for-media-stream', // 640×480 rolling test pattern as the Live Source
    '--use-fake-ui-for-media-stream', // auto-grants the camera, so no permission prompt
  ],
})
const context = await browser.newContext({ acceptDownloads: true }) // Export/Capture/Recording all download
```

## Driving

| Goal | How |
|---|---|
| Source Image | `page.setInputFiles('input[type=file]', <path>)` — use a **real** PNG (`apps/ascii/gifs/ai-demo.png`); a hand-rolled tiny base64 PNG silently fails to decode and the canvas never appears |
| Live Source | click `use webcam`, then wait for `canvas[aria-label="live glitched preview"]` |
| Source Image ready | wait for `canvas[aria-label="glitched preview"]` |
| The controls | the Control Strip's tabs (ADR 0020) — `getByRole('tab', { name: 'presets' \| 'edit' \| 'out' })`. Only the active tab's panel is mounted, so open the tab before reaching for anything in it |
| A Link's params | in EDIT, tap its chip: `[data-chip-index="<n>"]`, or `getByRole('button', { name: /^noise, position/ })` |
| Recording | `record` lives in OUT → the **canvas REC badge** (`getByTestId('rec-indicator')`) is both the timer and the stop → stopping fires a `download` |
| Files out | `page.waitForEvent('download')`, then `dl.saveAs(...)` |

Feature-detect paths are reachable with `page.addInitScript(() => { delete window.MediaRecorder })`
— that's the ADR 0007 "control is absent" case. Same trick throws from
`HTMLCanvasElement.prototype.captureStream` to reach the ADR 0006 error toast.

## Pointer gestures: the tests cannot tell you

**A passing gesture test proves nothing about touch.** happy-dom dispatches whatever event you
name — `fireEvent.dragStart` fires on a surface no phone can operate, and `fireEvent.pointerMove`
fires with a `pointerType` the DOM never checks. The test environment has no notion of an input
device, so *every* gesture is green there.

This is not hypothetical: #187 shipped Chain reordering on HTML5 drag-and-drop with green tests, and
drag-and-drop never fires on touch. Reorder was unreachable on a phone until the review caught it.

So any change to a drag, swipe, long-press or pointer path gets driven **on an emulated touch
device** before it is called done:

```js
import { chromium, devices } from '…/playwright/index.mjs'
const context = await browser.newContext({ ...devices['iPhone 13'], isMobile: true, hasTouch: true })
```

`page.touchscreen` has `tap()` and nothing else — no drag. Dispatch the sequence a finger actually
produces, from inside the page:

```js
await page.evaluate(async ([ax, ay, bx]) => {
  const el = document.querySelector('[data-chip-index="0"]')
  const opts = { bubbles: true, pointerType: 'touch', pointerId: 1, isPrimary: true }
  el.dispatchEvent(new PointerEvent('pointerdown', { ...opts, clientX: ax, clientY: ay }))
  for (let i = 1; i <= 10; i++) {
    el.dispatchEvent(new PointerEvent('pointermove', { ...opts, clientX: ax + ((bx - ax) * i) / 10, clientY: ay }))
    await new Promise((r) => setTimeout(r, 16)) // one frame — a single jump can skip the threshold
  }
  el.dispatchEvent(new PointerEvent('pointerup', { ...opts, clientX: bx, clientY: ay }))
}, [ax, ay, bx])
```

Assert the **outcome** — the Chain's new order read off the DOM — not that a handler ran. And check
the gesture's opposite in the same pass: a tap must still select rather than reorder, which is the
half a threshold bug breaks silently.

Two claims worth being specific about, because both were wrong once: "works on mobile" means driven
with `hasTouch`, and "keyboard parity" means a real `keyboard.press`, not a synthetic `keyDown`.

## Evidence

The canvas *is* the output, so a screenshot is the real thing — and a Recording can be proved
properly: `ffprobe` the downloaded `.webm` (expect vp9, and dimensions matching the **sampled**
canvas — 640×480 for the fake camera, since `sampleDimensions()` caps at 800×800), then
`ffmpeg -i out.webm -vf "select=eq(n\,20)" -vframes 1 frame.png` and look at the frame. The LIVE /
REC badges are DOM overlays, so their absence from that frame is correct.
