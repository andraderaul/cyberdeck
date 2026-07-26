---
'@cyberdeck/ascii': patch
---

Stop the EDIT tab from jumping each time you switch tools. The params panel reserved only a `min-h`
floor, but the tools render different heights — color mode's two chip rows are the tallest, charset
next, the sliders shortest — so switching tool changed the panel's height and reflowed the whole
strip. Unlike GLITCH's editor this shifted at every breakpoint, not just mobile: charset and color
mode fill the panel with their own chip grids at all widths and never collapse into the slider
group's single row. The panel now reserves the tallest tool's height so it holds steady across
switches.
