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

`useRecording` is a hand-copy of ASCII//Convert's hook (ADR 0011); the one divergence is that the
Recording is named through this app's `outputFilename`, which carries no timestamp.
