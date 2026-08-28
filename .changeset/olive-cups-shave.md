---
'@cyberdeck/ascii': minor
---

Show each Preset as what it does to the Source that is loaded, so the PRESETS tab is browsed by look
rather than by name. `Demoscene`, `Silkscreen`, `Core Dump` and `Blueprint` are good names and not
one of them says what will appear — so the front door was a browsing loop: pick, look, pick again.

Every chip now carries a small conversion of the loaded Source in that Preset's own Charset, Color
Mode, Dithering and Edge Glyph setting. It is the ordinary pipeline at a fraction of the cells, not a
second one, and the settings it converts with are the Preset's own snapshot untouched — so a
thumbnail cannot advertise a look the chip does not apply. The picture is rendered at twice the box
it is drawn in and scaled down, which is what makes it the canvas seen small rather than a canvas
configured differently: every glyph keeps the size the Preset's Resolution gives it.

A Source Image is converted once and remembered for the session — it is immutable, so its seven
thumbnails are too — and a Live Source is frozen into a single still rather than re-derived at 15fps,
so all seven chips advertise one instant and the loop pays nothing.
