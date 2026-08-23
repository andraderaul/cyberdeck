---
'@cyberdeck/deck': patch
---

The hub's share card points at the hub.

`og:url`, `og:image` and `twitter:image` were written before the hub had a Vercel project and
guessed its name — `cyberdeck-hub`. It landed as `cyberdeck-deck`, so every absolute URL addressed
an origin that does not exist: the card built, the roster guard passed, and anyone sharing the deck
got a preview with a broken image. All three now name the real deploy.
