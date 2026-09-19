import { afterEach, describe, expect, it, vi } from 'vitest'
import { greyPixels } from './__fixtures__/source-pixels'
import {
  type AsciiFrameJob,
  type AsciiFrameRequest,
  type AsciiFrameResult,
  runFrameJob,
} from './frame-job'
import { createFrameRunner, createSyncFrameRunner, createWorkerFrameRunner } from './frame-runner'
import { frameRows } from './packed-frame'
import { PRESETS } from './presets'

// The real conversion still runs — this only makes it something a single test can make throw, which
// is the one way to reach the fallback's own failure path.
vi.mock('./frame-job', async (importOriginal) => {
  const actual = await importOriginal<typeof import('./frame-job')>()
  return { ...actual, runFrameJob: vi.fn(actual.runFrameJob) }
})

const COLS = 8
const ROWS = 5
const SETTINGS = PRESETS[0].settings

/** A fresh buffer per call: a runner that transfers is entitled to detach the one it was given. */
function request(): AsciiFrameRequest {
  return {
    pixels: greyPixels(COLS, ROWS, (col, row) => (col * 31 + row * 17) % 256),
    cols: COLS,
    rows: ROWS,
    settings: SETTINGS,
    region: { offsetX: 0, offsetY: 0, dCols: COLS, dRows: ROWS },
    cropped: true,
  }
}

const rowsOf = (result: AsciiFrameResult | null) =>
  result?.cropped ? frameRows(result.cropped) : undefined

/**
 * A Worker double that never runs anything on its own — every reply is driven by the test, which
 * is the only way the "one frame in flight" rule can be observed at all. A real Worker would answer
 * before the next `run` could arrive and the backlog would never be allowed to form.
 *
 * It records the transfer list `postMessage` was given, so "by transfer, not by copy" is an
 * assertion rather than a claim in a comment.
 */
function fakeWorker() {
  const listeners = new Map<string, ((event: unknown) => void)[]>()
  const jobs: AsciiFrameJob[] = []
  const transfers: Transferable[][] = []

  const emit = (type: string, event: unknown) => {
    for (const listener of listeners.get(type) ?? []) {
      listener(event)
    }
  }

  return {
    jobs,
    transfers,
    terminate: vi.fn(),
    postMessage: vi.fn((job: AsciiFrameJob, transfer: Transferable[]) => {
      jobs.push(job)
      transfers.push(transfer)
    }),
    addEventListener: vi.fn((type: string, listener: (event: unknown) => void) => {
      listeners.set(type, [...(listeners.get(type) ?? []), listener])
    }),
    /** Answers the job at `index` the way the real worker would — by actually running it. */
    reply(index = jobs.length - 1) {
      emit('message', { data: runFrameJob(jobs[index]) })
    },
    /** A result carrying an id no outstanding job has — the branch the runner must never hang on. */
    replyWithWrongId(index = jobs.length - 1) {
      emit('message', { data: { ...runFrameJob(jobs[index]), id: jobs[index].id + 1000 } })
    },
    die() {
      emit('error', new Event('error'))
    },
  }
}

function runnerOver(worker: ReturnType<typeof fakeWorker>) {
  return createWorkerFrameRunner(worker as unknown as Worker)
}

afterEach(() => {
  vi.unstubAllGlobals()
})

describe('createSyncFrameRunner', () => {
  it('converts where it is called, and never drops a frame', async () => {
    const runner = createSyncFrameRunner()
    const asked = request()

    const painted = await runner.run(asked)

    expect(painted).not.toBeNull()
    expect(rowsOf(painted)).toEqual(rowsOf(runFrameJob({ ...request(), id: 0 })))
    // Nothing is in flight to be superseded, so a second frame is answered too.
    expect(await runner.run(asked)).not.toBeNull()
  })
})

describe('createWorkerFrameRunner', () => {
  it('hands the sampled pixels to the Worker by transfer, not by copy', async () => {
    const worker = fakeWorker()
    const asked = request()

    void runnerOver(worker).run(asked)

    expect(worker.transfers[0]).toEqual([asked.pixels.buffer])
  })

  it('sends the ConversionSettings and the fit region along with the pixels', () => {
    const worker = fakeWorker()
    const asked = request()

    void runnerOver(worker).run(asked)

    expect(worker.jobs[0].settings).toBe(asked.settings)
    expect(worker.jobs[0].region).toBe(asked.region)
    expect(worker.jobs[0].cropped).toBe(true)
  })

  it('resolves with the instructions and rows the Worker sent back', async () => {
    const worker = fakeWorker()
    const runner = runnerOver(worker)

    const painting = runner.run(request())
    worker.reply()

    expect(rowsOf(await painting)).toEqual(rowsOf(runFrameJob({ ...request(), id: 1 })))
  })

  it('never lets a second frame reach the Worker while one is in flight', () => {
    const worker = fakeWorker()
    const runner = runnerOver(worker)

    void runner.run(request())
    void runner.run(request())
    void runner.run(request())

    expect(worker.postMessage).toHaveBeenCalledOnce()
  })

  it('drops every frame but the newest while the Worker is busy', async () => {
    const worker = fakeWorker()
    const runner = runnerOver(worker)

    const inFlight = runner.run(request())
    const superseded = runner.run(request())
    const newest = runner.run(request())

    expect(await superseded).toBeNull()
    worker.reply()
    expect(await inFlight).not.toBeNull()
    worker.reply()
    expect(await newest).not.toBeNull()
  })

  it('runs the newest waiting frame as soon as the Worker is free', async () => {
    const worker = fakeWorker()
    const runner = runnerOver(worker)

    void runner.run(request())
    void runner.run(request())
    const newest = runner.run({ ...request(), cropped: false })

    worker.reply(0)

    expect(worker.postMessage).toHaveBeenCalledTimes(2)
    // The waiting slot held the *newest* request, not the one that arrived first.
    expect(worker.jobs[1].cropped).toBe(false)
    worker.reply(1)
    expect((await newest)?.cropped).toBeNull()
  })

  it('settles rather than hangs on a result whose id matches no outstanding frame', async () => {
    const worker = fakeWorker()
    const runner = runnerOver(worker)

    const painting = runner.run(request())
    worker.replyWithWrongId()

    expect(await painting).toBeNull()
  })

  it('reports a frame abandoned by dispose as dropped, even if a result lands afterwards', async () => {
    const worker = fakeWorker()
    const runner = runnerOver(worker)

    const inFlight = runner.run(request())
    const waiting = runner.run(request())
    runner.dispose()

    expect(await inFlight).toBeNull()
    expect(await waiting).toBeNull()
    expect(worker.terminate).toHaveBeenCalledOnce()
  })

  describe('when the Worker dies', () => {
    it('converts later frames on the synchronous core', async () => {
      const worker = fakeWorker()
      const runner = runnerOver(worker)

      worker.die()
      const painted = await runner.run(request())

      expect(rowsOf(painted)).toEqual(rowsOf(runFrameJob({ ...request(), id: 0 })))
      expect(worker.postMessage).not.toHaveBeenCalled()
    })

    it('answers the waiting frame here, since its pixels never left', async () => {
      const worker = fakeWorker()
      const runner = runnerOver(worker)

      void runner.run(request())
      const waiting = runner.run(request())
      worker.die()

      expect(rowsOf(await waiting)).toEqual(rowsOf(runFrameJob({ ...request(), id: 0 })))
    })

    it('reports the frame that left with its pixels as dropped', async () => {
      const worker = fakeWorker()
      const runner = runnerOver(worker)

      const lost = runner.run(request())
      worker.die()

      expect(await lost).toBeNull()
    })

    // The fallback answers the waiting frame by *running* it, right here inside the `error`
    // listener. A throw out of that used to escape before the promise was settled — and with both
    // slots already emptied, nothing left could ever settle it: `renderFrame` never returns and the
    // canvas never paints. The error is still surfaced; it just no longer strands a frame.
    it('settles the waiting frame even when the fallback conversion throws', async () => {
      const worker = fakeWorker()
      const runner = runnerOver(worker)

      void runner.run(request())
      const waiting = runner.run(request())
      vi.mocked(runFrameJob).mockImplementationOnce(() => {
        throw new Error('conversion failed')
      })

      expect(() => {
        worker.die()
      }).toThrow('conversion failed')
      await expect(waiting).resolves.toBeNull()
    })
  })
})

// The re-ask `ascii-canvas.tsx` makes for a still image, which has no next tick to correct a drop.
describe('a Source Image render caught by a dying Worker', () => {
  it('reports dropped, then paints on the re-ask', async () => {
    const worker = fakeWorker()
    const runner = runnerOver(worker)

    const lost = runner.run(request())
    worker.die()
    expect(await lost).toBeNull()

    const repainted = await runner.run(request())

    expect(rowsOf(repainted)).toEqual(rowsOf(runFrameJob({ ...request(), id: 0 })))
    expect(worker.postMessage).toHaveBeenCalledTimes(1)
  })
})

describe('createFrameRunner', () => {
  // happy-dom ships no Worker, which is also the browser case this fallback exists for. If the
  // factory reached for one anyway, this run would never resolve.
  it('converts here where the browser has no Worker', async () => {
    const painted = await createFrameRunner().run(request())

    expect(rowsOf(painted)).toEqual(rowsOf(runFrameJob({ ...request(), id: 0 })))
  })

  it('converts on a Worker where the browser has one', async () => {
    const constructed: Array<{ url: URL; options: WorkerOptions }> = []
    vi.stubGlobal(
      'Worker',
      class {
        constructor(url: URL, options: WorkerOptions) {
          constructed.push({ url, options })
        }
        postMessage() {}
        addEventListener() {}
        terminate() {}
      },
    )

    const runner = createFrameRunner()
    const answered = await Promise.race([
      runner.run(request()),
      Promise.resolve('still on the Worker'),
    ])

    expect(constructed).toHaveLength(1)
    expect(constructed[0].url.href).toContain('frame-worker')
    expect(constructed[0].options.type).toBe('module')
    // Nothing came back, because the double never answers — which is the proof the frame went to
    // the Worker rather than being converted on this thread.
    expect(answered).toBe('still on the Worker')
    runner.dispose()
  })

  it('falls back to the synchronous core where constructing a Worker throws', async () => {
    vi.stubGlobal(
      'Worker',
      class {
        constructor() {
          throw new Error('refused by Content-Security-Policy')
        }
      },
    )

    const painted = await createFrameRunner().run(request())

    expect(rowsOf(painted)).toEqual(rowsOf(runFrameJob({ ...request(), id: 0 })))
  })
})
