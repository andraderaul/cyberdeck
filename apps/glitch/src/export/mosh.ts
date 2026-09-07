// The datamosh output path (ADR 0026): downstream of the Chain and beside Recording — never a Link,
// never a mode of Recording. It re-encodes the frames the Chain already painted, drops half the key
// chunks so the decoder keeps painting the picture it already has, and repeats deltas so one
// moment's motion vectors land on another moment's pixels. The artifact is the decoder's own
// reconstruction error, which is what separates this from an imitation over pixels.
//
// Only `moshPlan` is pure; the two below own the codec. Live Source only, and not reproducible in
// Chain + Seed — the ADR scopes determinism to the Chain and accepts that at this terminal edge.

/** `EncodedVideoChunk['type']`, named here so the pure plan needs no codec object to be tested. */
export type ChunkType = 'key' | 'delta'

// VP8 rather than VP9: no altrefs, so a delta chunk references the picture just decoded and nothing
// else — the reference structure a mosh depends on being simple enough to break predictably.
const CODEC = 'vp8'

/** Matches the Live Source's ~15fps rAF loop (ADR 0002) and Recording's capture rate. */
const MOSH_FPS = 15
const FRAME_INTERVAL_MS = 1000 / MOSH_FPS
const FRAME_DURATION_US = Math.round(1_000_000 / MOSH_FPS)

/** One key chunk a second — these are the I-frames the mosh removes, so there must be some. */
const KEY_FRAME_INTERVAL = MOSH_FPS

const BITRATE = 2_000_000

// The bloom: every REPEAT_EVERY-th surviving delta is fed twice, so the same motion applies to the
// picture its own motion just made.
const REPEAT_EVERY = 4

// One key chunk in two survives, so the picture snaps back roughly every two seconds and starts
// melting again — melt, snap, melt. Driven on the real surface rather than picked: dropping
// *every* one decayed to flat noise within seconds and never came back, and one in four spent half
// the take there — the Chain's own per-frame Noise is maximal entropy for an inter-frame codec, so
// the error accumulates far faster here than it would over an untouched feed. None of these three
// are parameterised — ADR 0026 leaves that open, and wherever those knobs land it is not in the
// Chain.
const KEEP_EVERY_KEY = 2

/** ADR 0007's shape, a second time: where this is false the mosh control is not rendered at all. */
export function isDatamoshSupported(): boolean {
  return (
    typeof VideoEncoder !== 'undefined' &&
    typeof VideoDecoder !== 'undefined' &&
    typeof VideoFrame !== 'undefined'
  )
}

/**
 * The mangle, pure: takes the encoded chunk types and returns the decode order as indices into the
 * original sequence.
 *
 * It has to open on a key chunk — `VideoDecoder`'s `[[key chunk required]]` is cleared only by a
 * validated key chunk, so anything before the first one is dropped. Most of the later keys go
 * (I-frame removal) and a few are let through so the picture can snap back; nothing validates that
 * a delta follows its real predecessor, which is why feeding the survivors on is in-contract rather
 * than a hack.
 */
export function moshPlan(types: readonly ChunkType[]): number[] {
  const firstKey = types.indexOf('key')
  if (firstKey === -1) {
    return []
  }
  const plan = [firstKey]
  let deltas = 0
  let keys = 0
  for (let i = firstKey + 1; i < types.length; i++) {
    if (types[i] === 'key') {
      keys++
      if (keys % KEEP_EVERY_KEY === 0) {
        plan.push(i)
      }
      continue
    }
    plan.push(i)
    deltas++
    if (deltas % REPEAT_EVERY === 0) {
      plan.push(i)
    }
  }
  return plan
}

export interface MoshTake {
  /** Ends the capture and resolves with every chunk the encoder produced, in encode order. */
  finish(): Promise<EncodedVideoChunk[]>
  abort(): void
}

/**
 * Encodes `source` — the canvas the Chain paints — as it runs, keeping only the encoded chunks.
 * Frames are encoded and closed on the spot: holding a take's worth of decoded frames would cost
 * gigabytes, where the chunks cost kilobytes a second.
 *
 * `scratch` is sized here and used by both phases — capture draws through it (VP8 wants even
 * dimensions, which the visible canvas has no reason to have) and playback paints onto it.
 */
export function startMoshCapture(source: HTMLCanvasElement, scratch: HTMLCanvasElement): MoshTake {
  scratch.width = Math.max(2, source.width & ~1)
  scratch.height = Math.max(2, source.height & ~1)
  const ctx = scratch.getContext('2d')
  if (!ctx) {
    throw new Error('no 2d context')
  }

  const chunks: EncodedVideoChunk[] = []
  let failure: unknown = null
  const encoder = new VideoEncoder({
    output: (chunk) => {
      chunks.push(chunk)
    },
    error: (e) => {
      failure = e
    },
  })
  encoder.configure({
    codec: CODEC,
    width: scratch.width,
    height: scratch.height,
    bitrate: BITRATE,
    framerate: MOSH_FPS,
    // The encoder must not hold frames back: a take is stopped by hand, and buffered frames would
    // be frames of the performance the user watched and never got.
    latencyMode: 'realtime',
  })

  let index = 0
  const timer = setInterval(() => {
    try {
      ctx.drawImage(source, 0, 0, scratch.width, scratch.height)
      const frame = new VideoFrame(scratch, {
        timestamp: index * FRAME_DURATION_US,
        duration: FRAME_DURATION_US,
      })
      try {
        encoder.encode(frame, { keyFrame: index % KEY_FRAME_INTERVAL === 0 })
      } finally {
        frame.close()
      }
      index++
    } catch (e) {
      failure = e
      clearInterval(timer)
    }
  }, FRAME_INTERVAL_MS)

  // An encoder left open holds a codec instance for the life of the tab, and a take that failed is
  // exactly the case where the next one has to be able to start.
  const abort = () => {
    clearInterval(timer)
    if (encoder.state !== 'closed') {
      encoder.close()
    }
  }

  return {
    async finish() {
      clearInterval(timer)
      if (failure) {
        abort()
        throw failure
      }
      try {
        await encoder.flush()
      } catch (e) {
        abort()
        throw e
      }
      encoder.close()
      return chunks
    },
    abort,
  }
}

/**
 * Decodes the moshed order onto `scratch`, one chunk per frame interval so the canvas plays in real
 * time — the file is made by re-recording this canvas, so the pacing *is* the output's frame rate
 * (ADR 0026's re-record route: a second encode, in exchange for owning no muxer).
 *
 * `prefer-software` from the start rather than as a retry, which is a deliberate departure from
 * ADR 0026's Implementation Note ("try `prefer-software` before surfacing the toast"): a hardware
 * decoder rejects malformed sequences a software one survives, and *every* sequence handed here is
 * malformed on purpose, so the hardware attempt is the unlikely path rather than the default one.
 * The retry it describes would also cost a second full-length playback — the render is real-time by
 * construction — with a half-recorded file already on the way out.
 */
export function playMosh(
  chunks: readonly EncodedVideoChunk[],
  plan: readonly number[],
  scratch: HTMLCanvasElement,
): Promise<void> {
  const ctx = scratch.getContext('2d')
  if (!ctx) {
    return Promise.reject(new Error('no 2d context'))
  }

  return new Promise((resolve, reject) => {
    let timer: ReturnType<typeof setInterval>
    // A decoder left open holds a codec instance for the life of the tab, and a mosh that failed is
    // exactly the case where the next one has to be able to start.
    const fail = (e: unknown) => {
      clearInterval(timer)
      if (decoder.state !== 'closed') {
        decoder.close()
      }
      reject(e)
    }
    const decoder = new VideoDecoder({
      output: (frame) => {
        ctx.drawImage(frame, 0, 0, scratch.width, scratch.height)
        frame.close()
      },
      error: fail,
    })
    try {
      decoder.configure({ codec: CODEC, hardwareAcceleration: 'prefer-software' })
    } catch (e) {
      fail(e)
      return
    }

    let i = 0
    timer = setInterval(() => {
      if (i >= plan.length) {
        clearInterval(timer)
        decoder
          .flush()
          .then(() => {
            decoder.close()
            resolve()
          })
          .catch(fail)
        return
      }
      try {
        const chunk = chunks[plan[i++]]
        if (chunk) {
          decoder.decode(chunk)
        }
      } catch (e) {
        fail(e)
      }
    }, FRAME_INTERVAL_MS)
  })
}
