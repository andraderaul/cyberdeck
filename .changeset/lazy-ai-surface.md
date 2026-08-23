---
'@cyberdeck/ascii': patch
---

The AI surface follows its adapters off the first-paint path.

AI Analysis is optional and off by default — the key stays on the user's own device and, without an
AI Config, the Analyze control is not even rendered — which is why the three provider adapters have
loaded through a dynamic `import()` since the feature landed. The two modals that only exist beside
them, and the service that picks an adapter, did not follow. They do now: a visitor who never
configures a provider no longer downloads any of it, and the entry chunk drops from 75.97 kB
gzipped to 72.63.

Nothing about the surface itself changes. The AI Config modal opens fully formed rather than as a
frame with its contents still arriving, and a scan still answers its click instantly — the scanning
frame it opens on is drawn from the entry chunk, so the modal's own chunk loads behind it.
