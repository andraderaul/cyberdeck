#!/usr/bin/env node
// Writes the placeholder `click.wav` beside this file: a resonant noise burst, not material anyone
// chose by ear. ADR 0029 asks for a *designed* sample — the prior art's two are tuned by listening
// and deliberately not normalised — and this one is arithmetic standing in until that exists.
//
// It is committed so the sample is a recipe rather than an opaque blob: the next person varies a
// constant and re-runs, instead of reverse-engineering a binary. Deterministic (its own LCG, since
// `Math.random` has no seed), so re-running with the same constants reproduces the committed bytes.
//
// Usage: node packages/deck-kit/src/sound/click-sample.mjs

import { writeFileSync } from 'node:fs'
import { fileURLToPath } from 'node:url'

const RATE = 44100
const FRAMES = 1323 // 30 ms — long enough to have a body, short enough to land under the press
const CENTRE = 1750 // Hz, where the burst rings: above the voice band, below anything shrill
const DECAY_MS = 3.5 // the ring's time constant; 30 ms leaves it at ~5/32767, silence in practice
const EXCITATION_MS = 0.6 // the noise that strikes the resonator — a strike, not a hiss
const PEAK = 0.7 // normalised, which is exactly the tell that no ear set it

let seed = 0x2a2a2a2a
function noise() {
  seed = (seed * 1664525 + 1013904223) >>> 0
  return seed / 0x80000000 - 1
}

const w = (2 * Math.PI * CENTRE) / RATE
const r = Math.exp(-1 / ((DECAY_MS / 1000) * RATE))
const strike = (EXCITATION_MS / 1000) * RATE
const samples = []
let y1 = 0
let y2 = 0
for (let i = 0; i < FRAMES; i++) {
  const y = 2 * r * Math.cos(w) * y1 - r * r * y2 + noise() * Math.exp(-i / strike)
  y2 = y1
  y1 = y
  samples.push(y)
}

const scale = PEAK / Math.max(...samples.map(Math.abs))
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
