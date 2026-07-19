# ASCII//Convert · App UI Kit

A click-through prototype of the ASCII//Convert app as it looked **before ADR 0020's Control Strip** — fixed left sidebar, bottom download bar. The real app lives at `apps/ascii` in this monorepo; take the tokens and component styling from this kit, never the layout. The ASCII conversion pipeline is ported into vanilla JS and works.

## What's here

- `index.html` — entry point. Open this directly in a browser.
- `styles.css` — every component style; imports `../../colors_and_type.css`.
- `ascii-engine.js` — the conversion pipeline (luminance → char + RGB), `paintFrame`, and a tiny procedural image generator for demo sources.
- `Primitives.jsx` — `Button`, `ToggleGroup`, `Slider`, `Label`, `Modal`, `Badge`, `Toast`.
- `Sidebar.jsx` — `UploadZone`, `ControlPanel`.
- `AsciiCanvas.jsx` — the visible canvas + render-on-change effect.
- `DownloadBar.jsx` — bottom action area; varies by source kind.
- `Modals.jsx` — `AboutModal`, `ApiKeyModal`, `AnalysisModal` + demo analyses.
- `App.jsx` — top-level shell, state.

## What you can click

- **Upload zone** — click the drop area to load a procedurally-generated demo image. Each click cycles through three sample sources (portrait / city / cat).
- **Webcam** — switch to the webcam tab to see the LIVE state with an animated procedural feed at ~15fps.
- **Charset, Color Mode, Resolution, Brightness, Contrast** — all functional and re-render the canvas live.
- **Export PNG / Export TXT** — produces a real downloaded file from the current canvas.
- **⚿ configure ai** — opens the API key modal; saving switches the button to "ai configured" and reveals the `◈ scan & analyze` action.
- **◈ scan & analyze** — opens the Neural Scan results modal with a fake threat assessment after a short pulse.
- **about** — opens the About modal.

## What's intentionally simplified

- No real webcam access (browser permission prompt would interrupt the prototype).
- No real AI calls. The analyze modal returns a hardcoded "demo analysis" after a 1.4s pulse.
- Recording UI is present but stops without producing a real `MediaRecorder` blob.
- No `localStorage` persistence — settings reset on reload.

## Mapping to source files

Paths are relative to `apps/ascii` unless noted. Two of the kit's surfaces were removed by
ADR 0020 — their rows map to what replaced them, not to a like-for-like file.

| This kit | Today |
|---|---|
| `App.jsx` | `src/app.tsx` |
| `Sidebar.jsx :: UploadZone` | `packages/deck-kit/src/ui/{empty-state-hero,source-image-drop-zone}.tsx` — upload is now the canvas empty state |
| `Sidebar.jsx :: ControlPanel` | `src/components/{control-strip,preset-picker,settings-editor}.tsx` — the sidebar became the PRESETS / EDIT tabs |
| `AsciiCanvas.jsx` | `src/components/ascii-canvas.tsx` |
| `DownloadBar.jsx` | `src/components/output-panel.tsx` — the bar became the OUT tab |
| `Modals.jsx :: ApiKeyModal` | `src/components/api-key-modal.tsx` |
| `Modals.jsx :: AnalysisModal` | `src/components/analysis-modal.tsx` |
| `Modals.jsx :: AboutModal` | `src/components/about-modal.tsx` |
| `Primitives.jsx` | `packages/deck-kit/src/ui/*` (`Button`, `Chip`, `Slider`, `ToggleGroup`, `Toast` — ADR 0014) and `src/components/ui/*` (`Modal`, `Badge`) |
| `ascii-engine.js` | `src/ascii/{converter,renderer,types}.ts` |

When fidelity questions come up, `apps/ascii/src` and `packages/deck-kit/src` are canonical — for
tokens and component styling. For layout they deliberately are not: this kit predates the Control
Strip, so its sidebar/download-bar shell no longer exists anywhere in the source.
