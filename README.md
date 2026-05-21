# ASCII Art Converter

A client-side tool that converts images and webcam into interactive ASCII art, with real-time preview and export.

**[Live demo →](https://ascii-art-converter-tawny.vercel.app/)**

![ASCII Art Converter demo](gifs/demo.gif)

No backend server. Everything runs in the browser. AI analysis is optional — it uses your own API key, stored locally, never sent to any server we operate.

## Features

- Upload an image and watch it turn into ASCII instantly
- Use the webcam as a live source with continuous rendering
- Adjust charset, color mode, resolution, brightness, and contrast in real time
- Export as PNG (with colors) or TXT (plain ASCII)
- Capture a frame from the Live Source without stopping the loop
- Optional AI analysis (Anthropic, OpenAI, or Gemini) powered by your own API key

![AI analysis panel](gifs/ai-demo.png)

## Running locally

**Requirements:** Node.js 20+ (see `.nvmrc`)

```bash
# install dependencies
npm install

# start the development server
npm run dev
```

Open `http://localhost:5173` in your browser.

### Other commands

```bash
npm run build   # production build (TypeScript + Vite)
npm run check   # Biome lint, format, and import checks
npm run test    # run all tests (Vitest)
```

## Stack

- **React 18** + **TypeScript** + **Vite**
- **Tailwind CSS** with a design system via CSS custom properties
- **Vitest** + **@testing-library/react** for unit and component tests
- Zero backend dependencies

## How it works

```
Source Image / Live Source
        │
        ▼
  AsciiCanvas (hidden canvas for pixel sampling)
        │
        ▼
  convertImage() → grid of AsciiCell (char + original RGB)
        │
        ▼
  computeFrame() → RenderInstruction[] (pure, no DOM)
        │
        ▼
  paintFrame() → renders characters on the visible canvas
        │
        ▼
  PNG Export  /  TXT Export
```

The hidden canvas (`cols × rows` pixels) is used exclusively for pixel reading via `getImageData`. The visible canvas is independent and renders the characters. For Live Source, the loop runs via `requestAnimationFrame` throttled to ~15fps.

## Privacy and AI keys

ASCII Art Converter has no backend server. Source Images, Live Source frames, and API keys stay in your browser unless you explicitly use the optional AI analysis feature.

When AI analysis is enabled, the app sends the rendered ASCII canvas image directly from your browser to the selected AI Provider (Anthropic, OpenAI, or Gemini) using the API key you provide. The key is stored in `localStorage` on your device and is never sent to any server operated by this project.

Use your own provider key and avoid using this feature with sensitive images unless you are comfortable with that provider processing the rendered canvas.

## Project structure

```
src/
├── app.tsx                        # global state, orchestrates components
├── ascii/                         # ASCII domain module
│   ├── types.ts                   # ConversionSettings, ColorMode, Charset, AsciiCell, CHARSET_MAPS
│   ├── converter.ts               # convertImage(), luminosity math
│   ├── image-utils.ts             # resizeImage() (caps Source Image at 800px)
│   └── renderer.ts                # computeFrame() (pure), paintFrame() (side effects)
├── ai/                            # AI analysis module
│   ├── types.ts                   # AIConfig, Analysis, ThreatLevel
│   ├── analysis-service.ts        # adapter selection and response validation
│   ├── use-ai-config.ts           # localStorage hook for API keys
│   ├── errors.ts                  # AuthError, ParseError, QuotaError
│   └── adapters/                  # Anthropic, OpenAI, Gemini
├── components/
│   ├── ascii-canvas.tsx           # canvas lifecycle coordinator (static + rAF render loops)
│   ├── control-panel.tsx          # ConversionSettings controls
│   ├── upload-zone.tsx            # image upload and Live Source activation
│   ├── download-bar.tsx           # PNG Export and TXT Export
│   ├── error-boundary.tsx         # generic React error boundary
│   ├── about-modal.tsx            # project info and API key security model
│   ├── api-key-modal.tsx          # AI provider key configuration
│   └── analysis-modal.tsx         # AI analysis results
└── utils/
    └── cn.ts                      # clsx + tailwind-merge helper
```

## Architectural decisions

Significant design decisions are documented as ADRs in [`docs/adr/`](docs/adr/):

| ADR | Decision |
|-----|----------|
| [0001](docs/adr/0001-hidden-canvas-for-pixel-sampling.md) | Hidden canvas for pixel sampling |
| [0002](docs/adr/0002-webcam-rAF-main-thread.md) | Webcam rendering on main thread via rAF |
| [0003](docs/adr/0003-send-ascii-canvas-to-ai-provider.md) | Send rendered ASCII canvas to AI provider |
| [0004](docs/adr/0004-ascii-domain-module.md) | ASCII domain module structure |
| [0005](docs/adr/0005-render-instruction-pure-impure-boundary.md) | Pure/impure boundary with RenderInstruction |
| [0006](docs/adr/0006-dual-error-system.md) | Dual error system: AppError for operational errors, typed classes for AI errors |
| [0007](docs/adr/0007-recording-progressive-enhancement.md) | Recording as progressive enhancement with no GIF fallback |
| [0008](docs/adr/0008-button-variant-taxonomy.md) | Button variant taxonomy: `record` variant separate from export |
| [0009](docs/adr/0009-wcag-contrast-audit.md) | WCAG AA contrast audit and remediation |

## Built with AI-assisted development

This project was built using an AI-assisted workflow with [Claude Code](https://claude.ai/code).

Key artifacts of that process:

- **[`CLAUDE.md`](CLAUDE.md)** — development spec and architecture reference, kept up to date as the codebase evolves; serves as context for every Claude Code session
- **[`CONTEXT.md`](CONTEXT.md)** — domain language dictionary following DDD ubiquitous language practice; prevents terminology drift between the code and conversations
- **[`docs/adr/`](docs/adr/)** — architectural decision records capturing trade-offs at the time decisions were made, including which alternatives were rejected and why

The workflow treats AI as a collaborative pair: each architectural decision goes through a grilling session to surface trade-offs, the result is captured in an ADR, and the domain language is kept consistent via CONTEXT.md. Code is generated from that shared understanding, not the other way around.

## Contributing

1. Fork the repo and create a branch from `main` (`git checkout -b feat/your-idea`)
2. Make your changes — run `npm run test` and `npm run check` before pushing
3. Open a PR with a short description of what and why

A few things to keep consistent:
- Use the domain terms from [`CONTEXT.md`](CONTEXT.md) in code, comments, and PR descriptions
- If your change involves a significant design decision, add an ADR to [`docs/adr/`](docs/adr/)
- Keep `CLAUDE.md` up to date if you change the architecture

## License

ASCII Art Converter is licensed under the MIT License. See [`LICENSE`](LICENSE).
