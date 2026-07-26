---
"@cyberdeck/sprawl": patch
---

SPRAWL//Atlas's chrome names roles instead of hues, which is what keeps it rendering now that the
literal hue vocabulary has left the Tailwind preset (ADR 0024). Nothing changes on screen.

It is the one program deliberately excluded from Themes. Its pixels are neither chrome nor the
user's — they are the piece, and the piece *is* cyan light against the dark (ADR 0021). It never
sets the theme attribute, so it stays `ice` forever, and the kit's roster guard asserts that it has
no pre-paint script so a future consistency pass cannot "fix" the omission.
