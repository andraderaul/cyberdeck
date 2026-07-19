---
name: verify
description: Drive ASCII//Convert in a real browser to observe a change working — including the Live Source (webcam), Recording, and the AI Analysis path, which needs the provider intercepted. Use when verifying an apps/ascii change at its real surface.
---

# Verify — ASCII//Convert

The surface is a browser GUI. Tests and typecheck are not verification here; drive the page.

Sibling skill: `apps/glitch`'s. The launch and handle are the same, and so is the Control Strip
(ADR 0020) — what differs is below, and it differs because the domain does.

## Launch

```bash
npm run dev --workspace @cyberdeck/ascii   # → http://localhost:5173/
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
const context = await browser.newContext({ acceptDownloads: true }) // every output path downloads
```

## Driving

| Goal | How |
|---|---|
| Source Image | `page.setInputFiles('input[type=file]', <path>)` — use a **real** PNG (`apps/ascii/gifs/ai-demo.png`); a hand-rolled tiny base64 PNG silently fails to decode and the canvas never appears |
| Live Source | click `use webcam`, then wait for the LIVE badge (`getByText('LIVE')`) — this canvas carries no `aria-label`, unlike GLITCH's |
| The controls | the Control Strip's tabs — `getByRole('tab', { name: 'presets' \| 'edit' \| 'out' })`. Only the active tab's panel is mounted, so open the tab before reaching for anything in it |
| A ConversionSetting | in EDIT, tap its tool chip (`charset`, `color mode`, `resolution`, `brightness`, `contrast`), then drive the control that appears |
| Recording | `record` lives in OUT → the **canvas REC badge** (`getByTestId('rec-indicator')`) is both the timer and the stop → stopping fires a `download` |
| Files out | `page.waitForEvent('download')`, then `dl.saveAs(...)` |

The EDIT row has **no drag**: `ConversionSettings` is a record, not a list, so the tool chips only
ever select. There is no reorder gesture here to verify — that is GLITCH's row.

## The two paths that are only ASCII's

### TXT Export

It leaves through a blob URL and a synthetic `a.click()`, not the kit's share/download util — so it
looks like it might bypass Playwright's download plumbing. **It doesn't:** Chromium raises a normal
`download` event, `suggestedFilename()` is `ascii-art.txt`, and the file holds the real rows. Prove
it with the content, not the event: the rows are the output, and an empty or 1-line file is the
failure this path actually has (`asciiRows` empty because nothing converted yet).

```js
const dl = page.waitForEvent('download')
await page.getByRole('button', { name: 'export txt' }).click()
await (await dl).saveAs('out.txt')  // then: wc -l, and look at it
```

### AI Analysis — never let it make a real call

`analyzeCanvas` builds a provider SDK client in the browser and hits the real endpoint with whatever
key is in `localStorage`. Intercept the route **before** the click, always:

```js
await page.route('**/v1/messages', (route) =>   // Anthropic; OpenAI/Gemini have their own paths
  route.fulfill({
    status: 200,
    contentType: 'application/json',
    body: JSON.stringify({
      content: [{ type: 'text', text: JSON.stringify({
        description: 'a fake analysis',
        threatLevel: 'HIGH',       // one of LOW | MODERATE | HIGH | CRITICAL | UNKNOWN
        tags: ['fake', 'canned'],  // REQUIRED — see below
      }) }],
    }),
  }),
)
```

Two traps, both of which cost me a debugging round:

- **`tags: string[]` is mandatory.** `validate()` (analysis-service.ts) rejects a payload without it,
  and the modal then reads **"FEED CORRUPTED — Analysis feed returned unexpected data"**. That is a
  `parse-error`, i.e. *your mock is wrong*, not the app. A real failure of the app on this path looks
  the same, so check the payload before believing the screen.
- **The Analyze control only exists with a config**, and `useAIConfig` reads `localStorage` once at
  mount. Set it and reload:
  ```js
  await page.evaluate(() => localStorage.setItem('ai_config',
    JSON.stringify({ provider: 'anthropic', key: 'sk-ant-fake' })))
  await page.reload()   // re-picking the Source afterwards, since reload clears it
  ```
  Without a config the OUT tab shows the **AI config banner** instead; its `configure AI` opens the
  API key modal. Both halves are worth driving — they are different branches of the same tab.

## Feature-detect and error paths

`page.addInitScript(() => { delete window.MediaRecorder })` reaches the ADR 0007 "control is absent"
case. Note the ADR 0006 divergence from GLITCH: **ASCII surfaces no toast when a Recording fails** —
the take simply doesn't start. Silence is the correct observation there, not a missing feature.

## Evidence

`paintFrame()` fills this canvas with `#0a0a0f` (`--void`) before drawing, so a screenshot is a
letterboxed frame rather than the bare output — the opposite of GLITCH, where the canvas *is* the
output. Two consequences when judging what you see:

- The canvas overlays (LIVE / REC / clear / mirror) already sit on the audited pair, which is why
  they carry no opaque background of their own (ADR 0013).
- **PNG Export is not the canvas**: at 2× and 4× it redraws through an off-screen canvas. Check the
  file, not the preview — `2×` on a 1280×543 canvas produced a genuine 2560×1086 PNG, matching the
  dimensions the scale picker predicted. The picker disables a scale whose output would pass the
  export cap, so a disabled `4×` on a large canvas is correct.
- A Live Source must keep converting while a control changes. Read pixels back rather than trusting
  the screenshot:
  ```js
  await page.evaluate(() => {
    const c = document.querySelector('canvas')
    const d = c.getContext('2d').getImageData(0, 0, 60, 60).data
    return [...d].some((v, i) => i % 4 !== 3 && v > 0)  // anything painted at all
  })
  ```

## Pointer gestures

If a change touches a drag, swipe or long-press, the tests cannot tell you it works — happy-dom
dispatches whatever event you name, regardless of input device. Drive it on an emulated touch
device (`{ ...devices['iPhone 13'], isMobile: true, hasTouch: true }`); the sibling GLITCH skill
carries the PointerEvent sequence, since `page.touchscreen` has `tap()` and nothing else.
