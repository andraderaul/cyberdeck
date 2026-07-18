---
'@cyberdeck/glitch': patch
---

Withhold duplicate for pixel sort, where a straight copy would have changed nothing. Sorting an already-sorted run leaves it as it was, so a second pixel sort with identical settings renders exactly like one — the control now says so instead of spending a click on an invisible change. A second pixel sort is still available from the add palette, where tuning it differently (a horizontal pass crossed with a vertical one) does produce the double melt.
