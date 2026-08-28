import { afterEach, describe, expect, it, vi } from 'vitest'
import { applyChain, type Chain, createLink } from './chain'
import { type ChainJob, type ChainResult, runChainJob } from './chain-job'
import { createChainRunner, createSyncChainRunner, createWorkerChainRunner } from './chain-runner'
import { structuredBuffer } from './test-pixels'
import type { PixelBuffer, Seed } from './types'

const CHAIN: Chain = [createLink('channelShift', { channel: 'r', amount: 1 })]

const SEED: Seed = 1234

/** A fresh buffer per call: a runner that transfers is entitled to detach the one it was given. */
function frame(): PixelBuffer {
  return structuredBuffer(8, 5)
}

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
  const jobs: ChainJob[] = []
  const transfers: Transferable[][] = []

  const emit = (type: string, event: unknown) => {
    for (const listener of listeners.get(type) ?? []) {
      listener(event)
    }
  }

  const worker = {
    jobs,
    transfers,
    terminate: vi.fn(),
    postMessage: vi.fn((job: ChainJob, transfer: Transferable[]) => {
      jobs.push(job)
      transfers.push(transfer)
    }),
    addEventListener: vi.fn((type: string, listener: (event: unknown) => void) => {
      listeners.set(type, [...(listeners.get(type) ?? []), listener])
    }),
    /** Answers the job at `index` the way the real worker would — by actually running it. */
    reply(index = jobs.length - 1) {
      emit('message', { data: runChainJob(jobs[index]).result })
    },
    /** Answers with pixels of the test's choosing, so "what came back is what got painted" shows. */
    replyWith(data: PixelBuffer['data'], index = jobs.length - 1) {
      const job = jobs[index]
      const result: ChainResult = { id: job.id, data, width: job.width, height: job.height }
      emit('message', { data: result })
    },
    /** A result carrying an id no outstanding job has — the branch the runner must never hang on. */
    replyWithWrongId(index = jobs.length - 1) {
      const job = jobs[index]
      const result: ChainResult = {
        id: job.id + 1000,
        data: new Uint8ClampedArray(job.data.length),
        width: job.width,
        height: job.height,
      }
      emit('message', { data: result })
    },
    die() {
      emit('error', new Event('error'))
    },
  }
  return worker
}

function runnerOver(worker: ReturnType<typeof fakeWorker>) {
  return createWorkerChainRunner(worker as unknown as Worker)
}

afterEach(() => {
  vi.unstubAllGlobals()
})

describe('createSyncChainRunner', () => {
  it('runs the Chain where it is called, and never drops a frame', async () => {
    const runner = createSyncChainRunner()
    const source = frame()

    const first = await runner.run(source, CHAIN, SEED)
    const second = await runner.run(frame(), CHAIN, SEED)

    expect(first?.data).toEqual(applyChain(source, CHAIN, SEED).data)
    expect(second).not.toBeNull()
  })
})

describe('createWorkerChainRunner', () => {
  it('hands the frame to the Worker by transfer, not by copy', async () => {
    const worker = fakeWorker()
    const runner = runnerOver(worker)
    const source = frame()

    void runner.run(source, CHAIN, SEED)

    expect(worker.jobs[0].data).toBe(source.data)
    expect(worker.transfers[0]).toEqual([source.data.buffer])
    runner.dispose()
  })

  it('sends the Chain and the Seed along with the pixels', () => {
    const worker = fakeWorker()
    const runner = runnerOver(worker)

    void runner.run(frame(), CHAIN, SEED)

    expect(worker.jobs[0].chain).toEqual(CHAIN)
    expect(worker.jobs[0].seed).toBe(SEED)
    runner.dispose()
  })

  // The claim the whole port rests on: the pixels the canvas paints came off the other thread.
  it('resolves with the pixels the Worker sent back', async () => {
    const worker = fakeWorker()
    const runner = runnerOver(worker)
    const fromTheWorker = new Uint8ClampedArray(8 * 5 * 4).fill(91)

    const pending = runner.run(frame(), CHAIN, SEED)
    worker.replyWith(fromTheWorker)

    expect((await pending)?.data).toBe(fromTheWorker)
    runner.dispose()
  })

  // The bypass, verified where it actually has to hold: across the thread boundary. The unit test
  // of `applyChain` proves the fold skips a silenced Link; this proves the flag survives the job
  // that carries the Chain over and is honoured by the side that runs it.
  it('paints a bypassed Link as though it were not in the Chain', async () => {
    const worker = fakeWorker()
    const runner = runnerOver(worker)
    const silenced: Chain = [
      { ...createLink('noise', { amount: 0.9, tint: 'mono' }), bypassed: true },
      ...CHAIN,
    ]

    const pending = runner.run(frame(), silenced, SEED)
    worker.reply()

    expect(worker.jobs[0].chain[0].bypassed).toBe(true)
    expect((await pending)?.data).toEqual(applyChain(frame(), CHAIN, SEED).data)
    runner.dispose()
  })

  it('never lets a second frame reach the Worker while one is in flight', () => {
    const worker = fakeWorker()
    const runner = runnerOver(worker)

    void runner.run(frame(), CHAIN, SEED)
    void runner.run(frame(), CHAIN, SEED)
    void runner.run(frame(), CHAIN, SEED)

    expect(worker.postMessage).toHaveBeenCalledTimes(1)
    runner.dispose()
  })

  // The acceptance criterion: a slow Chain must not build a backlog. Twenty frames arrive while one
  // is being worked on; nineteen of them are gone, not queued.
  it('drops every frame but the newest while the Worker is busy', async () => {
    const worker = fakeWorker()
    const runner = runnerOver(worker)

    const inFlight = runner.run(frame(), CHAIN, SEED)
    const superseded = Array.from({ length: 18 }, () => runner.run(frame(), CHAIN, SEED))
    const newest = runner.run(frame(), CHAIN, SEED)

    expect(await Promise.all(superseded)).toEqual(new Array(18).fill(null))

    worker.reply()
    expect(await inFlight).not.toBeNull()
    // Exactly one frame was waiting, and it is the last one that arrived.
    expect(worker.postMessage).toHaveBeenCalledTimes(2)
    worker.reply()
    expect(await newest).not.toBeNull()
    runner.dispose()
  })

  // A Source Image has no next frame, so the newest edit has to be the one that survives — the
  // slot is what keeps the canvas showing the Chain the Editor holds.
  it('runs the newest waiting frame as soon as the Worker is free', async () => {
    const worker = fakeWorker()
    const runner = runnerOver(worker)
    const newestChain: Chain = [createLink('scanlines')]

    void runner.run(frame(), CHAIN, SEED)
    void runner.run(frame(), CHAIN, SEED)
    const newest = runner.run(frame(), newestChain, SEED)

    worker.reply(0)
    await Promise.resolve()
    expect(worker.jobs[1].chain).toEqual(newestChain)

    worker.reply(1)
    expect(await newest).not.toBeNull()
    runner.dispose()
  })

  it('reports a frame abandoned by dispose as dropped, even if a result lands afterwards', async () => {
    const worker = fakeWorker()
    const runner = runnerOver(worker)

    const abandoned = runner.run(frame(), CHAIN, SEED)
    runner.dispose()
    worker.reply(0)

    expect(await abandoned).toBeNull()
  })

  // Not reachable as things stand — one job is outstanding at a time — but the failure it would
  // cause is the one no caller can recover from: a promise that never settles is a canvas that
  // never paints and a render that never reports. Pinned so an id-matching branch cannot grow a
  // silent hang beside it. Asserted by resolution, not by value: a test that only checked the
  // pixels would pass just as well against a promise left pending forever.
  it('settles rather than hangs on a result whose id matches no outstanding frame', async () => {
    const worker = fakeWorker()
    const runner = runnerOver(worker)

    const pending = runner.run(frame(), CHAIN, SEED)
    worker.replyWithWrongId()

    await expect(
      Promise.race([pending, new Promise((resolve) => setTimeout(() => resolve('hung'), 50))]),
    ).resolves.toBeNull()
    runner.dispose()
  })

  it('terminates the Worker on dispose', () => {
    const worker = fakeWorker()

    runnerOver(worker).dispose()

    expect(worker.terminate).toHaveBeenCalled()
  })

  // ADR 0006 wants operational failures surfaced, but a dead Worker has a correct answer to fall
  // through to: the very same Chain, on this thread. The user sees a slower frame, never a broken
  // canvas.
  describe('when the Worker dies', () => {
    it('runs later frames on the synchronous core', async () => {
      const worker = fakeWorker()
      const runner = runnerOver(worker)
      const source = frame()

      worker.die()
      const painted = await runner.run(source, CHAIN, SEED)

      expect(painted?.data).toEqual(applyChain(source, CHAIN, SEED).data)
      expect(worker.postMessage).not.toHaveBeenCalled()
    })

    it('answers the waiting frame here, since its pixels never left', async () => {
      const worker = fakeWorker()
      const runner = runnerOver(worker)

      void runner.run(frame(), CHAIN, SEED)
      const waiting = runner.run(frame(), CHAIN, SEED)
      worker.die()

      expect(await waiting).not.toBeNull()
    })

    it('reports the frame that left with its pixels as dropped', async () => {
      const worker = fakeWorker()
      const runner = runnerOver(worker)

      const inFlight = runner.run(frame(), CHAIN, SEED)
      worker.die()

      expect(await inFlight).toBeNull()
    })
  })
})

// The two steps the Source Image re-ask is made of (`glitch-canvas.tsx`), at the level where they
// are real rather than mocked: the frame in flight when the Worker dies reports dropped, and the
// very next run paints — on this thread, because the runner has already stopped being a Worker
// runner. Nothing else can reach that branch; backpressure alone never does.
describe('a Source Image render caught by a dying Worker', () => {
  it('reports dropped, then paints on the re-ask', async () => {
    const worker = fakeWorker()
    const runner = runnerOver(worker)

    const lost = runner.run(frame(), CHAIN, SEED)
    worker.die()
    expect(await lost).toBeNull()

    const source = frame()
    const repainted = await runner.run(source, CHAIN, SEED)

    expect(repainted?.data).toEqual(applyChain(source, CHAIN, SEED).data)
    expect(worker.postMessage).toHaveBeenCalledTimes(1)
  })
})

describe('createChainRunner', () => {
  // happy-dom ships no Worker, which is also the browser case this fallback exists for. If the
  // factory reached for one anyway, this run would never resolve.
  it('runs the Chain here where the browser has no Worker', async () => {
    const source = frame()

    const painted = await createChainRunner().run(source, CHAIN, SEED)

    expect(painted?.data).toEqual(applyChain(source, CHAIN, SEED).data)
  })

  it('runs the Chain on a Worker where the browser has one', async () => {
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

    const runner = createChainRunner()
    const answered = await Promise.race([
      runner.run(frame(), CHAIN, SEED),
      Promise.resolve('still on the Worker'),
    ])

    expect(constructed).toHaveLength(1)
    expect(constructed[0].url.href).toContain('chain-worker')
    expect(constructed[0].options.type).toBe('module')
    // Nothing came back, because the double never answers — which is the proof the frame went to
    // the Worker rather than being folded on this thread.
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
    const source = frame()

    const painted = await createChainRunner().run(source, CHAIN, SEED)

    expect(painted?.data).toEqual(applyChain(source, CHAIN, SEED).data)
  })
})
