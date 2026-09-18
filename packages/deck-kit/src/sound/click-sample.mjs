#!/usr/bin/env node
// Writes the `click.wav` beside this file: a struck resonator bank, fitted by measurement.
//
// The first version rang a *single* resonator, and that is exactly what made it read as an error
// beep — one narrow band with the next 20 dB down is the recipe for a buzzer, not for something
// being pressed. A real click is a broad cluster: many modes ringing at once, the high ones dying
// first, their skirts overlapping into one band rather than standing apart as tones.
//
// So the bank is fifteen modes covering 1.6–3.9 kHz, and their relative gains are the ones a
// reference recording's own spectrum showed at 100 Hz resolution. `TAU_EXP` makes the higher bands
// decay faster than the lower, which is what a struck object does; `GAIN_TILT` favours them at the
// strike. Everything else was searched against the reference and picked by cost, not by taste.
//
// Measured against it: rms/peak 0.089 against 0.088, and the top of the cluster lines up —
// 2000(1.00) 3100(0.73) 1900(0.65) 3200(0.62) 3300(0.50) against 2000(0.97) 3100(1.00) 1900(0.57)
// 3200(0.72) 3300(0.53). Ours is the darker of the two: the reference carries content above 4 kHz
// that this bank stops short of, which is the next thing to reach for if it still sounds too round.
//
// It is committed so the sample is a recipe rather than an opaque blob: vary a constant, re-run,
// listen. Deterministic (its own LCG, since `Math.random` has no seed), so the same constants
// reproduce the committed bytes.
//
// Usage: node packages/deck-kit/src/sound/click-sample.mjs

import { writeFileSync } from 'node:fs'
import { fileURLToPath } from 'node:url'

const RATE = 44100
const FRAMES = 2646 // 60 ms — the ring is inaudible before the end, and it lands under the press
const EXCITATION_MS = 0.6 // the noise that strikes the bank — a strike, not a hiss
const TAU_BASE = 16 // ms, the time constant at F0
const TAU_EXP = 0.5 // how much faster the higher bands decay: tau ∝ (F0/f)^TAU_EXP
const GAIN_TILT = 1.5 // how much the strike favours the higher bands: g ∝ (f/F0)^GAIN_TILT
const PEAK = 0.5 // still normalised — the level that reaches the ear is CLICK_VOLUME, in sound.ts

// F0 first: every tau and gain below is expressed relative to it. The gains are the reference's
// own bin magnitudes — adjacent bins on purpose, since the overlap is what makes a cluster.
const F0 = 2000
const BANDS = [
  { f: 1600, g: 0.186 },
  { f: 1900, g: 0.574 },
  { f: F0, g: 0.974 },
  { f: 2100, g: 0.189 },
  { f: 2200, g: 0.225 },
  { f: 2300, g: 0.182 },
  { f: 3000, g: 0.366 },
  { f: 3100, g: 1.0 },
  { f: 3200, g: 0.718 },
  { f: 3300, g: 0.527 },
  { f: 3400, g: 0.447 },
  { f: 3500, g: 0.293 },
  { f: 3600, g: 0.241 },
  { f: 3700, g: 0.212 },
  { f: 3900, g: 0.192 },
]

let seed = 0x2a2a2a2a
function noise() {
  seed = (seed * 1664525 + 1013904223) >>> 0
  return seed / 0x80000000 - 1
}

const modes = BANDS.map(({ f, g }) => ({
  w: (2 * Math.PI * f) / RATE,
  r: Math.exp(-1 / ((TAU_BASE * (F0 / f) ** TAU_EXP) / 1000) / RATE),
  g: g * (f / F0) ** GAIN_TILT,
  y1: 0,
  y2: 0,
}))

const strike = (EXCITATION_MS / 1000) * RATE
const samples = new Float64Array(FRAMES)
for (let i = 0; i < FRAMES; i++) {
  const x = noise() * Math.exp(-i / strike)
  let acc = 0
  for (const m of modes) {
    const y = 2 * m.r * Math.cos(m.w) * m.y1 - m.r * m.r * m.y2 + x * m.g
    m.y2 = m.y1
    m.y1 = y
    acc += y
  }
  samples[i] = acc
}

let loudest = 0
for (const v of samples) {
  loudest = Math.max(loudest, Math.abs(v))
}
const scale = PEAK / loudest
const pcm = Buffer.alloc(FRAMES * 2)
samples.forEach((v, i) => {
  pcm.writeInt16LE(Math.round(v * scale * 32767), i * 2)
})

// 44-byte canonical RIFF/PCM header: mono, 16-bit, one `fmt ` chunk and one `data` chunk.
const header = Buffer.alloc(44)
header.write('RIFF', 0)
header.writeUInt32LE(36 + pcm.length, 4)
header.write('WAVEfmt ', 8)
header.writeUInt32LE(16, 16)
header.writeUInt16LE(1, 20)
header.writeUInt16LE(1, 22)
header.writeUInt32LE(RATE, 24)
header.writeUInt32LE(RATE * 2, 28)
header.writeUInt16LE(2, 32)
header.writeUInt16LE(16, 34)
header.write('data', 36)
header.writeUInt32LE(pcm.length, 40)

const out = fileURLToPath(new URL('./click.wav', import.meta.url))
writeFileSync(out, Buffer.concat([header, pcm]))
process.stdout.write(`wrote ${out} — ${FRAMES} frames, ${44 + pcm.length} bytes\n`)
