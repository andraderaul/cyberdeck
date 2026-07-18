---
"@cyberdeck/ascii": minor
---

Converge the control panel onto GLITCH//Studio's presets-first model (ADR 0016). Presets are now the front door, always visible, and the per-setting controls (resolution, color mode, charset, brightness, contrast) fold away behind an `advanced` disclosure that starts closed — matching GLITCH on both the desktop sidebar and the mobile controls sheet. The presets move into their own `PresetPicker` component and the modified marker now spells "(modified)" into the chip's accessible name.
