# ASCII//CONVERT — Design System

Cyberpunk client-side ASCII art converter. Turn any image or webcam feed into interactive ASCII art, render it live in the browser, and export as PNG or TXT. Optional AI analysis sends the rendered canvas to a user-supplied provider (Anthropic / OpenAI / Gemini) and returns a threat-level report — the dramatic framing is part of the brand.

The whole product is one single-page React/Vite app. No backend, no accounts, no analytics. The design system is correspondingly compact: one screen, one color palette, monospace-only typography, glyph-based iconography.

## Sources

This skill now lives **inside** the repository it describes: ASCII//Convert is `apps/ascii` in the
CYBERDECK monorepo. It used to carry a `repo_reference/` snapshot of a standalone repo, from back
when it didn't — that mirror is gone, because a copy of the source that sits beside the source only
ever rots. It had drifted two architectural generations (it still held `upload-zone.tsx` and
`download-bar.tsx`, neither of which exists).

Read the real thing:

- **`packages/deck-kit/src/tokens.css`** — the source of truth for every color, type, spacing and
  radius token. The visual language moved into the kit in ADR 0014 and is now shared with
  GLITCH//Studio; `apps/ascii/src/index.css` only imports it. `colors_and_type.css` here is a
  convenience copy for standalone prototypes — if the two disagree, the kit wins.
- `packages/deck-kit/src/tailwind-preset.js` — how the tokens reach Tailwind classes.
- `apps/ascii/CLAUDE.md` and `apps/ascii/CONTEXT.md` — domain language. **Read `CONTEXT.md` before
  writing copy** — terms like _Source Image_, _Live Source_, _Charset_, _Export_, _Capture_,
  _Recording_, _Analyze_ are precise and have explicitly-avoided synonyms.
- `apps/ascii/src/components/*` — the real implementations. This is the canonical reference when
  re-implementing a component. Do not invent variations.
- `packages/deck-kit/src/ui/*` — the primitives both programs share (`Button`, `Chip`, `Slider`,
  `ToggleGroup`, `TabStrip`, …).
- `docs/adr/` — the decisions that explain *why* the pipeline and the shell are shaped as they are.

---

## Index

- `README.md` — this file
- `SKILL.md` — packaged Agent Skill manifest
- `colors_and_type.css` — every token from the source repo, plus semantic type classes (`.t-display`, `.t-section`, `.t-label`, `.t-body`, `.t-caption`, `.t-code`)
- `fonts/` — webfonts (IBM Plex Mono via Google Fonts CDN; Departure Mono noted below)
- `assets/` — favicon and wordmark. Brand marks only: the demo image lives at
  `apps/ascii/gifs/ai-demo.png` and is not copied here
- `preview/` — Design System tab cards
- `ui_kits/app/` — the ASCII//Convert app as a click-through prototype. **Predates the Control Strip**: its `Sidebar.jsx` and `DownloadBar.jsx` are the surfaces ADR 0020 removed, so take the tokens and the component styling from it, never the layout

---

## CONTENT FUNDAMENTALS

The voice is **technical, terse, and lowercase**. It treats the user like another engineer at the same workbench. The optional AI feature uses a small amount of cyber-noir overlay (`◈ NEURAL SCAN RESULTS`, `THREAT LEVEL`, `▸ SCANNING VISUAL FEED...`) but the core product copy stays plain.

### Tone

- **You/the user** — second person when addressing them (`paste your key here`, `your key stays in your browser only`). First-person plural only when distinguishing the project from a server (`never sent to our servers`).
- **No marketing.** No `Welcome!`, no `Get started in seconds`, no exclamation points outside error labels (`⚠`). The home state of the canvas says `upload an image or enable webcam to begin` — that's the whole onboarding.
- **Acknowledge mechanics.** Tell the user how things work. About modal: _"Everything happens in your browser, nothing is uploaded anywhere."_ API key modal: _"your key stays in your browser only — never sent to our servers."_
- **Privacy-forward.** Any text touching keys, images, or AI explicitly states what does and doesn't leave the browser.

### Casing

- **Lowercase is the default.** Buttons (`export png`, `export txt`, `save key`, `remove key`, `retry`), labels (`resolution`, `color mode`, `charset`, `brightness`, `contrast`), tabs (`presets`, `edit`, `out`), helper text. Sentence-cased only inside paragraphs.
- **UPPERCASE + wide tracking is reserved for "system" UI** — the wordmark (`ASCII//CONVERT`), section titles in modals (`◈ NEURAL SCAN RESULTS`, `⚿ AI CONFIG`), the LIVE pill, threat levels (`LOW`/`MODERATE`/`HIGH`/`CRITICAL`/`UNKNOWN`), and form sub-labels inside the API key modal (`PROVIDER`, `API KEY`). It signals "this is a readout from the machine."
- **Em-dashes (`—`) as separators** in the header: `ASCII//CONVERT — image → ascii art`.

### Vocabulary — use the exact terms from `CONTEXT.md`

| Use this | Don't use |
|---|---|
| Source Image | uploaded image, input image |
| Live Source | stream, camera, video source |
| Charset | density, symbol set |
| Color Mode | colorMode (as a domain term), color |
| Resolution | font size, granularity |
| ConversionSettings | options, settings |
| Export (PNG Export / TXT Export / Video Export) | download (refers only to the browser mechanism) |
| Capture | snapshot, screenshot, photo |
| Recording | screen record, video export (as a verb) |
| Analyze / Analysis | scan, AI scan, AI detection |
| AI Provider | provider, model, LLM |
| AI Config | key, credentials |

### Vibe

Late-night dev console. ASCII gradient pipelines. Demoscene + Matrix katakana + DDD glossary. The dramatic flourishes (`NEURAL SCAN`, `THREAT LEVEL`, `TRANSMISSION FAILURE`) only appear around the optional AI feature — they are intentionally tongue-in-cheek, because asking a remote LLM "what is in this picture" is genuinely a surveillance-tech move and the product names that honestly.

## Voice & Tone

Two registers, never mixed:

- **Cyberpunk** — AI flows, threat readouts, LIVE indicators. UPPERCASE + wide tracking. Glyph-heavy. (`◈ NEURAL SCAN RESULTS`, `THREAT LEVEL: CRITICAL`)
- **Neutral** — errors, empty states, button copy, accessibility labels. Lowercase, terse, plain. (`upload an image or enable webcam to begin`, `export png`)

Rule of thumb: if the surface is touched by the AI feature → cyberpunk. Everything else → neutral. `aria-label` attributes always use neutral register regardless of the surface.

See `docs/voice-tone.md` in the repo for the full surface map and examples table.

### Examples

- Empty canvas: `upload an image or enable webcam to begin`
- Slider: `resolution` / `12px`
- Webcam live: `◉ LIVE` / `adjust controls to tune the feed`
- AI loading: `▸ SCANNING VISUAL FEED...` / `interfacing with AI Provider`
- Error: `✕ AUTH FAILED` / `Invalid or expired API key. Review your key in settings and try again.`
- Privacy note: `your key stays in your browser only — never sent to our servers`

### Emoji

**Never use emoji.** All decorative glyphs are Unicode geometric characters (◈ ◉ ◎ ● ○ ⬆ ↑ ✕ × ⚿ ▸ ⇄ ⏺ ⏹ ⚠ —). They are part of the cyberpunk visual vocabulary and render in the monospace font.

---

## VISUAL FOUNDATIONS

### Colors

A neon-on-near-black palette. Four hues only — violet, cyan, hot-pink, electric-yellow — over a five-stop near-black ramp tinted ever-so-slightly toward violet (`#0a0a0f → #c8c8e0`).

- **Violet `#b829ff`** is the primary accent. The wordmark, primary button border, active toggle state, slider thumb, focus ring, AI-configured state.
- **Cyan `#00e5ff`** is secondary / info. Secondary buttons, `source code →` link, `LOW` threat, tag badges.
- **Hot Pink `#ff2d78`** is destructive / live. Webcam `LIVE` indicator, capture and record controls, `HIGH`/`CRITICAL` threat, error toast border.
- **Electric `#ffe600`** is warning. `MODERATE` threat and quota/parse errors. Used sparingly.

Surfaces are layered black-violets, not flat black: `--void` (page) → `--abyss` (cards/inputs) → `--shadow` (elevated panels, toasts) → `--slate` (borders, dividers). This subtle violet undertone is what differentiates the look from a generic dark-mode editor.

Color is **never** the only signal — every colored element has an accompanying glyph (`◉` for live, `✕` for auth failed, `◈` for analyze, `⚠` for warning).

### Typography

**Monospace only.** No proportional sans-serif anywhere — not in body, not in headers, not in tooltips. Two faces:

- **IBM Plex Mono** — body text, controls, paragraphs, modals. 13–18px most of the time.
- **Departure Mono** — display / wordmark. Pixel-grid mono, gives the BBS/terminal vibe. Used at 32–48px or as the header logo.

Wide letter-spacing is a core motif. Anything uppercase gets `tracking-wide` (0.08em) or `tracking-wider` (0.12em). The wordmark uses `tracking-widest` (0.18em). Lowercase body keeps `tracking-normal` (0.02em).

Line height is generous (1.6 for body) because monospace at 13px gets dense fast.

### Spacing

Two scales: micro (`--gap-*`, 4–64px on a 4/8 grid) for component-internal layout, and macro (`--sp-*`, 16–160px on a 16/32 grid) for section spacing. Components themselves are tightly packed — the `--gap-md` (16px) and `--gap-lg` (24px) values appear most often.

### Backgrounds

- **No images.** No full-bleed photos, no gradients, no patterns. The canvas is the image, and it's user-supplied ASCII output.
- The page background is flat `--void` (`#0a0a0f`). Cards are flat `--abyss`. Elevation is signaled by **borders + a slightly lighter fill**, never by shadow.
- The one exception: a soft transparency tint on hover/active state surfaces (`rgba(184, 41, 255, 0.05–0.12)`) over the dark base.

### Animation

Restrained. Four eases are defined; in practice only two are used:

- `--ease-smooth` (`cubic-bezier(0.2, 0.8, 0.2, 1)`) — color/border transitions on hover.
- `--ease-sharp` (`cubic-bezier(0.4, 0, 0.6, 1)`) — fast state flips on buttons.
- `--ease-flick` (overshoot) exists but is reserved for rare flourishes.
- `--ease-snap` for modal open/close.

Durations: `--duration-fast` (150ms) for hover, `--duration-base` (250ms) for state transitions. The only "longer" animation in the app is the AI loading state — a CSS `animate-pulse` on the `▸ SCANNING VISUAL FEED...` text.

No bouncy entrances. No fade-up-on-scroll. No motion paths.

### Button variants

The `Button` component ships with six variants. Use them by semantic intent — never by color alone.

| Variant | Color | Semantic intent | Used for |
|---|---|---|---|
| `primary` | violet, 2px border, bg-accent-bg | Primary export action | PNG Export |
| `secondary` | cyan, 1px border, bg-info-bg | Secondary/informational action | TXT Export, AI retry |
| `danger` | hot-pink, 1px border, bg-danger-ghost | Active live / destructive | Capture |
| `record` | hot-pink, 1px border, bg-transparent | Live action initiation | Start recording |
| `analyze` | violet, 1px border, bg-accent-ghost | AI analysis action | Scan & analyze |
| `ghost` | base border, transparent | Neutral/utility | Camera switch |

Two color groups:
- **Hot-pink register** (`record` + `danger`) — live-feed workflow. `record` (transparent bg) initiates; `danger` (tinted bg) is active/destructive. Stopping a Recording is **not** a Button: the canvas REC badge is the stop, so a take stays stoppable from any tab (ADR 0020).
- **Cyan register** (`secondary`) — export and informational actions only.

See `docs/adr/0008-button-variant-taxonomy.md` for the full rationale.

### Hover / press states

- **Buttons:** color and border stay the same; the background fill brightens by one step (e.g. `bg-transparent` → `bg-accent-ghost`). No size changes.
- **Toggle buttons (in a `ToggleGroup`):** inactive option has `border-base / text-fg-muted`; active option has `border-violet / bg-accent-soft / text-violet`. Switching is instantaneous in tone but eased over 150ms.
- **Sliders:** the thumb has a `0 0 6px var(--violet)` glow always; no separate hover state.
- **Press:** no shrink, no scale. The button just briefly looks "darker" because the underlying fill is transparent and the press inverts it momentarily via native styling.

### Borders

- **1px solid `--slate`** is the default border. It's on every card, input, modal, divider, and inactive toggle.
- **2px solid `--violet`** is reserved for primary buttons and the top edge of the cyber-variant modal (a single 2px accent line at the top, 1px on the other three sides).
- Borders are how this UI delineates everything. There is no "card with shadow" treatment.

### Shadows

Almost none. The only inner/outer shadows in the system:

- Slider thumb: `box-shadow: 0 0 6px var(--violet)` (a soft glow).
- Toast: `box-shadow: 0 0 12px rgba(255, 45, 120, 0.15)` (a pink-tinted halo to mark it as urgent).
- Threat level CRITICAL: `text-shadow: 0 0 8px var(--hot-pink)` on the text itself.

If you're tempted to add `box-shadow: 0 4px 12px rgba(0,0,0,0.4)` — don't. Use a border.

### Protection gradients

None. There is no scrim, no fade-to-black at the bottom of an image, no protected-text-on-photo treatment. The product never composes text over imagery — the canvas is the imagery, and surrounding UI lives on flat dark surfaces with explicit borders.

### Transparency & blur

- Modal overlay: `rgba(8, 8, 18, 0.72)` + `backdrop-blur-sm`. This is the only place blur is used.
- Surface tints: 5–12% violet over dark for hover/active fills.
- No frosted-glass cards, no acrylic panels, no translucent sidebars.

### Corner radii

- **`--radius-xs` (2px)** is the default. Buttons, inputs, cards, toggles, badges.
- **`--radius-sm` (4px)** is for modals (slightly softer because they're bigger).
- **`--radius-md` (6px)** exists but is barely used.
- **`--radius-pill` (999px)** is reserved for status dots (LIVE indicator, record marker).
- The aesthetic target is "almost square." Sharp edges reinforce the terminal/CRT feel. Avoid `rounded-lg`, `rounded-xl`, or any large radius.

### Card anatomy

A card is: `background: var(--abyss)` + `border: 1px solid var(--slate)` + `border-radius: 2px` + `padding: 32px (--gap-xl)`. That's it. No shadow, no gradient, no left-border accent color. Variants:

- **Cyber modal:** add `border-top: 2px solid var(--violet)`. The single thickened top edge is the only thing that distinguishes a "cyber" surface from a regular surface.
- **Threat readout** (inside the analysis modal): the inset has a dynamic border + tinted background colored by threat level — `border: 1px solid var(--cyan|electric|hot-pink|muted)` over a 7–12% same-color background.

### Layout rules

- **Single-screen app.** No scroll except inside modal content. The canvas is the only flexible region.
- **Fixed top header** (`py-sm px-lg`, 1px bottom border) with the wordmark on the left and small `about` / `⚿ ai config` buttons on the right.
- **The Control Strip** (ADR 0020) is the whole control surface, at *both* breakpoints: a horizontal, bottom-anchored bar of tabs — **PRESETS | EDIT | OUT** — over a single panel, with the canvas visible above it at all times. There is no sidebar, no bottom sheet, and no always-visible export bar; those were replaced, and the canvas never gets occluded by controls.
- Tabs are lowercase, the active one marked by a 2px violet bottom border. Only the active panel is mounted.
- Inside EDIT, the tools are chips in a horizontally scrollable row and the focused tool's control fills the panel above — one control in focus at a time on mobile, the whole sibling group side by side at `sm`.
- Modals are centered, max-width 480px (default) or `max-w-sm` (cyber).

### Imagery vibe

There is no curated imagery in this brand. The "imagery" is whatever the user provides, transformed. The Color Mode picker is itself the brand's color treatment for imagery — six solid modes (`matrix` green, `bw` white, `retro` amber, `sepia` brown, `neon` magenta, `original` RGB) and four gradients (`synthwave`, `matrix-dual`, `acid`, `infrared`), split into two rows in the picker because that split is the one cue for what a mode does before you pick it — every preset is high-contrast and slightly retro. The default Color Mode is `matrix` (green-on-black) which is the look the brand most strongly identifies with.

---

## ICONOGRAPHY

**There are no icon files.** No icon font, no SVG sprite, no Lucide/Heroicons dependency. Every icon in the product is a **Unicode glyph rendered in the monospace font**, often at the same size as adjacent text or one step larger.

### The complete glyph set used in the app

```
⬆      upload arrow (in the upload dropzone, violet, text-lg)
↑      compact upload arrow (in toggle labels)
◉      filled circle — LIVE / webcam mode active
○      hollow circle — webcam starting / inactive
◎      bullseye — Capture button
●      filled large dot — Recording in progress (`● 0:42`)
⏺      record start (`⏺ record`)
⏹      record stop (`⏹ stop`)
⇄      switch camera (front/rear toggle)
◈      diamond — AI Analyze action, NEURAL SCAN heading
⚿      key — AI Config / API key
✕      close / dismiss (modal top-right close, AUTH FAILED label)
×      small close (toast dismiss)
⚠      warning (toast leading glyph)
▸      pointer (used in `▸ SCANNING VISUAL FEED...`)
—      em-dash, used as separator in header
→      right arrow, used in link copy (`source code →`, `author →`)
#      hash, prepended to AI tags (`#draped_subject`)
```

Plus the **charset glyphs themselves**, which are the product's content:

```
classic    .:-=+*#%@
sharp      .^!*<&%$#@
detailed   .'`^",:;Il!i>... (70+ chars, Paul Bourke scale)
blocks     ░▒▓█
halfblock  ▄▀█
braille    ⠁⠃⠇⡇⣇⣧⣷⣿
katakana   ･ｦｧｱｲｴｵｸｶｷｺｻｼｽｾｿ...
geometric  ·•○◇◆□■▲▼◀▶★✦
circles    ·∘○◎●
box        ╴─│┼╪╬█
binary     01
```

### Rules

- **Never substitute Material Icons, Heroicons, Lucide, Phosphor, or emoji.** The brand's icon system *is* the monospace glyph repertoire. A `Lucide-react` `Upload` icon would break the visual language.
- **If you need a "new" icon, find a Unicode glyph that fits.** Common stops: `◆ ◇ ◊ ▲ △ ▼ ▽ ◀ ◁ ▶ ▷ ▣ ▢ ▦ ▩ █ ▌ ▐ ▬ ▭ ☰ ⌘ ⌥ ⌃ ⌫ ⏎ ⏏ ⌖ ⌬ ⎈ ⎊ ⏧`. Geometric Shapes, Box Drawing, and Miscellaneous Technical blocks are all in-vocabulary.
- **Color the glyph by its semantic role.** `text-violet` for primary actions, `text-cyan` for info, `text-hot-pink` for live/destructive, `text-electric` for warning, `text-fg-muted` for inactive.
- **Render at the size of the surrounding text or one step up.** The upload zone uses `text-lg` (24px) for the `⬆`; toggle labels include `↑` at the same size as the label.

### Logo / wordmark

`ASCII//CONVERT` set in `--font-display` (Departure Mono), bold, `tracking-wide`, color `--violet`. The double slash is intentional — it reads as a path-separator and a glitchy seam at once. See `assets/wordmark.svg` for a vector-rendered version usable on dark backgrounds.

### Favicon

The product currently ships with the default Vite favicon. `assets/favicon.svg` provides a brand-correct replacement: violet `▓` on `--void`.

---

## Substitutions flagged

- **Departure Mono** is not bundled in this repo (the original repo doesn't include it either — it's referenced by name only). I've stacked it before IBM Plex Mono in `--font-display` and noted the substitution. **Please attach a Departure Mono `.woff2`** (free download from [departuremono.com](https://departuremono.com/)) to `fonts/DepartureMono-Regular.woff2` to get the intended pixel-grid wordmark. Until then, IBM Plex Mono is used as the fallback, which looks close but lacks the BBS character.
- **IBM Plex Mono** is loaded from Google Fonts CDN — no local files. Swap to local files if you need offline support.

---

## Quick start for designers

1. `@import "/colors_and_type.css"` (or copy the `:root` block into your file).
2. Wrap everything in a `body` that uses `var(--font-mono)` on `var(--bg)`.
3. Reach for tokens, never raw hex. `var(--violet)` not `#b829ff`.
4. Match casing: lowercase for product copy, UPPERCASE + wide tracking for "system" labels.
5. Add a glyph next to every colored signal. No bare color.
6. Use 1px borders, 2px radii, monospace everything. If you reach for `box-shadow` or `rounded-lg`, stop.
