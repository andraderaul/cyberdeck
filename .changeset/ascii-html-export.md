---
'@cyberdeck/ascii': minor
---

HTML Export: the result as coloured, selectable text.

PNG Export keeps the colour and destroys the text; TXT Export keeps the text and drops the colour.
The OUT tab now carries a third format that keeps both — a self-contained HTML document where every
cell is real text inside a `<pre>`, painted with the colour its Color Mode gave it. It embeds its
own font stack and fetches nothing, so a viewer opening it offline sees what the preview showed, and
the art selects and copies with its line breaks and column alignment intact.
