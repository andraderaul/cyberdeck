# Fonts

## IBM Plex Mono — used for body, controls, modals, paragraphs

Loaded from Google Fonts CDN. No local file. If you need offline support, download from https://www.ibm.com/plex/ and add `IBMPlexMono-Regular.woff2`, `IBMPlexMono-Medium.woff2`, `IBMPlexMono-Bold.woff2` here, then replace the `@import` in `colors_and_type.css` with a local `@font-face` block.

## Departure Mono — used for display/wordmark

**FLAGGED:** This font is referenced by name in deck-kit's `tokens.css` (`--font-display`) but no `.woff2` is bundled anywhere in the monorepo. Free download from https://departuremono.com/. Drop the `.woff2` here as `DepartureMono-Regular.woff2` and the wordmark will render in its intended pixel-grid style. Until then it falls back to IBM Plex Mono.
