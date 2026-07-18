---
"@cyberdeck/ascii": patch
"@cyberdeck/glitch": patch
---

Extract the vocabulary-neutral canvas Recording core into `@cyberdeck/deck-kit/recording` (ADR 0014,
Candidate C1): `useRecording`, `detectMimeType`, `isRecordingSupported`, `formatElapsedTime`,
`mimeToExtension`, and the `PREFERRED_MIME_TYPES` / `RECORDING_FPS` constants. The interface is
reshaped to `useRecording(canvasRef, { onError?(reason), filename(ext) })` — the core emits a neutral
`'start' | 'export'` reason each app words itself, and the filename is injected, so the MediaRecorder
plumbing is shared while every string stays app-side. `mimeToExtension` is removed from both apps'
`output.ts`. GLITCH still surfaces recording failures via toast; ASCII behaves as before. Internal
refactor — no behavior change.
