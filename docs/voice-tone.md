# Voice & Tone

## Two registers

The product uses exactly two registers — never mixed on the same surface.

**Cyberpunk** applies to everything touched by the AI Analysis feature: loading states, scan results, threat readouts, error states from the AI pipeline, analysis tags. The register is dramatic, machine-like, and deliberately theatrical — it names the surveillance-tech nature of the feature honestly. Text is UPPERCASE with wide tracking. Glyphs prefix every label. Strings read like output from a system, not a person.

**Neutral** applies to all operational surfaces: buttons, control labels, empty states, error toasts, upload copy, and all accessibility labels. The register is terse, lowercase, and plainspoken — engineer at a workbench, no marketing. Text addresses the user directly or describes mechanics (`your key stays in your browser only`). It never inflates stakes or aestheticises failure.

The split is mechanical: if the surface is part of the AI Analysis flow → cyberpunk. Everything else → neutral. `aria-label` attributes are always neutral, even on cyberpunk surfaces, because screen readers must convey meaning rather than atmosphere.

## Surface map

| Surface | Register | Rationale |
|---|---|---|
| AI loading state | Cyberpunk | Part of the AI Analysis flow; theatrical delay = machine at work |
| Neural scan results header | Cyberpunk | Primary AI output surface; "readout from the system" framing |
| Threat level labels | Cyberpunk | AI-generated classification; UPPERCASE signals machine authority |
| AI error messages (auth, quota, parse, network) | Cyberpunk | Errors inside the AI pipeline stay in-register; failure = transmission fault |
| AI analysis tags | Cyberpunk | AI-generated metadata; lowercase `#tag` form with cyberpunk prefix convention |
| AI Config modal title | Cyberpunk | Entry point to AI feature; cyber-variant modal |
| Webcam LIVE indicator | Cyberpunk | Real-time data feed; hot-pink + glyph signal matches AI drama |
| Empty canvas state | Neutral | Operational onboarding; no AI involved; plain instruction |
| Export/Capture buttons | Neutral | Direct action buttons; lowercase, terse |
| Operational error toasts | Neutral | System-level failures (export, capture, storage); no AI; plain error description |
| Slider/control labels | Neutral | ConversionSettings controls; engineer vocabulary, lowercase |
| Accessibility labels (`aria-label`) | Neutral | Screen reader output must convey meaning, not atmosphere — always neutral regardless of surface |
| Upload zone copy | Neutral | File input; no AI; direct instruction |
| Modal about text | Neutral | Informational prose; sentence-cased paragraphs, no glyph overlay |
| Header subtitle | Neutral | Descriptor copy (`image → ascii art`); terse, lowercase |
| API key placeholder / helper text | Neutral | Form affordances; lowercase, privacy-forward |
| Render error fallback | Neutral | Operational failure in the canvas pipeline; plain, actionable |

## Examples table

| Location | Current copy | Register | Proposed copy (if different) |
|---|---|---|---|
| `analysis-modal.tsx` — modal title | `◈ NEURAL SCAN RESULTS` | Cyberpunk | — |
| `analysis-modal.tsx` — loading state | `▸ SCANNING VISUAL FEED...` | Cyberpunk | — |
| `analysis-modal.tsx` — loading subtitle | `interfacing with AI Provider` | Cyberpunk | — |
| `analysis-modal.tsx` — threat row label | `THREAT LEVEL` | Cyberpunk | — |
| `analysis-modal.tsx` — threat value | `LOW` / `MODERATE` / `HIGH` / `CRITICAL` / `UNKNOWN` | Cyberpunk | — |
| `analysis-modal.tsx` — auth error headline | `✕ AUTH FAILED` | Cyberpunk | — |
| `analysis-modal.tsx` — auth error detail | `Invalid or expired API key. Review your key in settings and try again.` | Neutral (detail within cyberpunk surface) | — |
| `analysis-modal.tsx` — quota error headline | `◈ QUOTA EXCEEDED` | Cyberpunk | — |
| `analysis-modal.tsx` — quota error detail | `API quota limit reached. Check your plan and billing in your provider's dashboard.` | Neutral (detail within cyberpunk surface) | — |
| `analysis-modal.tsx` — parse error headline | `◈ FEED CORRUPTED` | Cyberpunk | — |
| `analysis-modal.tsx` — parse error detail | `Analysis feed returned unexpected data. No threat assessment available.` | Neutral (detail within cyberpunk surface) | — |
| `analysis-modal.tsx` — network error headline | `◈ TRANSMISSION FAILURE` | Cyberpunk | — |
| `analysis-modal.tsx` — network error detail | `Connection to provider lost. Check your network and try again.` | Neutral (detail within cyberpunk surface) | — |
| `analysis-modal.tsx` — retry button | `retry` | Neutral | — |
| `api-key-modal.tsx` — modal title | `⚿ AI CONFIG` | Cyberpunk | — |
| `api-key-modal.tsx` — provider label | `PROVIDER` | Cyberpunk | — |
| `api-key-modal.tsx` — key label | `API KEY` | Cyberpunk | — |
| `api-key-modal.tsx` — key placeholder | `paste your key here` | Neutral | — |
| `api-key-modal.tsx` — helper text | `your key stays in your browser only — never sent to our servers` | Neutral | — |
| `api-key-modal.tsx` — save button | `save key` | Neutral | — |
| `api-key-modal.tsx` — remove button | `remove key` | Neutral | — |
| `about-modal.tsx` — modal title | `ASCII//CONVERT` | Neutral (wordmark, not a label) | — |
| `about-modal.tsx` — section heading | `AI Scan` | Mixed — title-cased heading on neutral surface | `ai scan` (lowercase to match neutral register) |
| `about-modal.tsx` — section heading | `Made with AI` | Mixed — title-cased heading on neutral surface | `made with ai` (lowercase to match neutral register) |
| `about-modal.tsx` — body prose | `Turn any photo or your webcam into ASCII art…` | Neutral | — |
| `upload-zone.tsx` — mode toggle | `↑ upload` / `◉ webcam` | Neutral | — |
| `upload-zone.tsx` — drop zone (desktop) | `drag & drop or click to upload` | Neutral | — |
| `upload-zone.tsx` — drop zone (touch) | `tap to upload` | Neutral | — |
| `upload-zone.tsx` — file types hint | `jpg · png · webp` | Neutral | — |
| `upload-zone.tsx` — live indicator | `LIVE` | Cyberpunk | — |
| `upload-zone.tsx` — webcam starting | `starting camera...` | Neutral | — |
| `upload-zone.tsx` — live helper | `adjust controls to tune the feed` | Neutral | — |
| `upload-zone.tsx` — source mode aria-label | `Source mode` | Neutral | — |
| `download-bar.tsx` — analyze button (desktop) | `◈ scan & analyze` | Cyberpunk | — |
| `download-bar.tsx` — analyze button (touch) | `◈ analyze` | Cyberpunk | — |
| `download-bar.tsx` — export PNG button | `export png` | Neutral | — |
| `download-bar.tsx` — export TXT button | `export txt` | Neutral | — |
| `download-bar.tsx` — capture button | `◎ capture` | Neutral | — |
| `download-bar.tsx` — record button | `⏺ record` | Neutral | — |
| `download-bar.tsx` — stop recording | `● {elapsed} ⏹ stop` | Neutral | — |
| `app.tsx` — empty canvas state | `upload an image or enable webcam to begin` | Neutral | — |
| `app.tsx` — render error fallback | `render failed — try a different image or adjust settings` | Neutral | — |
| `app.tsx` — header subtitle | `image → ascii art` | Neutral | — |
| `app.tsx` — about nav button | `about` | Neutral | — |
| `app.tsx` — AI config nav button (active) | `⚿ ai configured` | Neutral | — |
| `app.tsx` — AI config nav button (inactive) | `⚿ configure ai` | Neutral | — |
| `control-panel.tsx` — slider label | `resolution` | Neutral | — |
| `control-panel.tsx` — toggle label | `color mode` | Neutral | — |
| `control-panel.tsx` — toggle label | `charset` | Neutral | — |
| `control-panel.tsx` — slider label | `brightness` | Neutral | — |
| `control-panel.tsx` — slider label | `contrast` | Neutral | — |
| `errors/app-error.ts` — export toast | `export PNG failed` / `export TXT failed` | Neutral | — |
| `errors/app-error.ts` — capture toast | `capture failed` | Neutral | — |
| `errors/app-error.ts` — storage toast | `ai configured (session only — storage unavailable)` | Neutral | — |
| `errors/app-error.ts` — storage remove toast | `storage unavailable — config removed until page reload` | Neutral | — |
| `toast.tsx` — dismiss button `aria-label` | `dismiss` | Neutral | — |

## Rules

1. If the surface is touched by the AI Analysis feature — use cyberpunk register.
2. If the surface is an operational error, empty state, button, or control label — use neutral register.
3. UPPERCASE + wide tracking (`tracking-wide` / `tracking-wider`) signals machine output. Lowercase signals human addressing human.
4. Glyph prefixes (`◈`, `▸`, `✕`) are required on every cyberpunk headline. They are optional on neutral copy (permitted when they carry semantic meaning, e.g. `◎ capture`, `⏺ record`).
5. Every colored or glyph-only signal must have a text equivalent for screen readers. `aria-label` attributes always use neutral register, even when the visible label is cyberpunk.
6. Never mix registers on the same UI element. An error headline can be cyberpunk; its explanatory detail sentence is neutral — but both are distinct elements, not blended into one string.
7. Error detail sentences inside cyberpunk AI error states use neutral register: plain, actionable prose without glyph prefixes or tracking.
8. Section headings inside neutral-register modals (e.g., About modal) follow the neutral register: lowercase, no wide tracking, no glyph prefix.
9. The wordmark (`ASCII//CONVERT`) is brand identity, not a UI label — it is neither cyberpunk nor neutral register; do not use it as a pattern for other copy.
10. When in doubt: if a human is addressing a human → neutral. If a machine is reporting a status → cyberpunk.
