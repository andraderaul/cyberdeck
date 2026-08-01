---
'@cyberdeck/deck-kit': minor
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

`TOUCH_TARGET_HEIGHT` and `TOUCH_TARGET_ICON` are new exports for the programs that need the same
bargain over a canvas. The first buys height without ever growing sideways, so two neighbouring
controls in a row cannot end up claiming the same pixels — which is the failure a centred overlay
would introduce, and the reason that variant stays private to the kit. The second adds the real
width the first tells you to pair with, for a control that also draws narrower than the target.

Both open with `relative` to anchor the overlay, so a control that positions *itself* has to name
its own `absolute` after the constant: `cn` resolves a position conflict in favour of the last one
named, and putting it first drops the control back into the flow.
