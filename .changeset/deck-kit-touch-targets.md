---
'@cyberdeck/deck-kit': patch
---

Every control in the kit now answers a 44x44 pointer target. The modal's close button, the toast's
dismiss and the tooltip's info trigger were all icon-only with no padding — the tooltip's was about
7x11px, roughly a twenty-fifth of the area it should offer — and the Control Strip's tabs sat at
~28px despite being bottom-anchored, squarely in the thumb zone.

The modal's close button also gains a spoken name: `✕` is punctuation, and a screen reader reading
it out says nothing about what the control does.

Where a control cannot pay for the target in layout, it takes it as an invisible overlay instead:
the tooltip sits in a Slider's label row, where a real 44px box would triple the row's height and
push the params it labels off a phone.
