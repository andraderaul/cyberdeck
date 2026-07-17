---
'@cyberdeck/glitch': minor
---

GLITCH//Studio: Recording — take the glitched Live Source out as a video, not just a still frame. A
**record** control appears beside Capture while the webcam runs, a timer counts the take, and
**stop** hands the file over: the native share sheet on mobile, a download on desktop.

Recording records the output canvas — the pixels the Pipeline already painted — so it is not
datamosh, and like Capture it reads the canvas without touching the rAF loop that paints it. Frames
are captured at the loop's own ~15fps (ADR 0002), and the container follows what the browser will
actually encode (vp9 → vp8 → webm → mp4). Where `MediaRecorder` + `captureStream` are unsupported
the control is absent rather than degraded — no GIF fallback (ADR 0007).

Each take is stamped — `glitch-recording-<ms>.webm` — so a second one doesn't collide with the first.
PNG Export and Capture keep their stable names: a Capture is one click to redo, a take isn't.

`useRecording` is a hand-copy of ASCII//Convert's hook (ADR 0011) with one divergence: a Recording
that can't start, or a take that can't be handed over, says so in a toast rather than doing nothing
(ADR 0006).
