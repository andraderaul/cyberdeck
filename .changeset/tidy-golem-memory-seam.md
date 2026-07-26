---
'@cyberdeck/golem': patch
---

Concentrate every cache classification behind one memory-access surface. `fetch`, `load`/`store`
and `loadByte`/`storeByte` now own the device/Terminal guard, the read-before / write-after order
and the byte→word math; the seven scattered `classifyData` call sites collapse to one call each,
and the raw word/byte path stops pretending to be where the cache attaches.

Behaviour is byte-identical on every reference program (all ten `_cache.out` fixtures stay green,
`cache off` unchanged). One latent case moves, and no reference program can reach it: `push`/`pop`
now inherit the same device guard as `ldw`/`stw`, so a stack access that lands on a device word is
no longer classified as a data-cache access — which matches how the raw path already diverts such a
word to the device. A hand-written test pins that decision.
