import { formatElapsedTime } from '@cyberdeck/deck-kit/recording'
import { TOUCH_TARGET_ICON } from '@cyberdeck/deck-kit/ui'
import { cn, isTouchDevice } from '@cyberdeck/deck-kit/utils'
import { type MutableRefObject, type RefObject, useEffect, useRef, useState } from 'react'
import type { Chain } from '../glitch/chain'
import { type ChainRunner, createChainRunner } from '../glitch/chain-runner'
import { sourceDimensions } from '../glitch/image-utils'
import { type GlitchFrame, renderGlitchFrame } from '../glitch/render-frame'
import type { Seed } from '../glitch/types'
import WipeDivider from './wipe-divider'

/**
 * ~15fps — the rate a glitched feed reads at, and the rate `useRecording` captures at. The Chain
 * itself runs on a Worker now (ADR 0002), so what this throttles is how often the main thread
 * samples a frame and hands it over, not how much work it does with it.
 */
export const LIVE_SOURCE_FRAME_INTERVAL_MS = 1000 / 15

/**
 * Chrome shared by everything sitting on top of the canvas — see ADR 0013. `bg-bg` is the
 * load-bearing part: the canvas *is* the user's artwork, so a transparent chip takes its contrast
 * from whatever the Chain just painted (hot pink on a bright feed measures 1.57:1). Standing on
 * an opaque surface from the palette is what holds the ratio ADR 0009 audited. Not translucent —
 * no alpha survives an arbitrary backdrop.
 */
const CANVAS_OVERLAY_CHROME = 'font-mono text-xs px-sm py-2xs rounded-xs bg-bg select-none'

/**
 * Rest state shared by the source-tuning buttons — mirror (off), switch-camera, clear. The border,
 * cursor and transition ride here rather than on `CANVAS_OVERLAY_CHROME`, which the LIVE / REC
 * badges also wear and must not read as clickable. Mirrors ASCII//Convert's `OVERLAY_BUTTON_REST`.
 *
 * `TOUCH_TARGET_ICON` is spelled at each control for the same reason, and never on the chrome: the
 * LIVE badge wears that one and is not a control, so it must not grow a target either. These sit on
 * the artwork (ADR 0013), so taking the row from 32px to 44px would charge the picture for its own
 * controls — but the icon-only ones are ~27px wide on touch, which no height-only overlay can fix.
 */
const CANVAS_OVERLAY_BUTTON_REST =
  'border border-base text-fg-muted cursor-pointer transition-colors duration-fast hover:text-fg hover:border-strong'

/**
 * `HTMLMediaElement.HAVE_ENOUGH_DATA`, spelled out rather than read off the global: happy-dom
 * ships the class without its readiness constants, so the global reads `undefined` and every
 * `readyState >=` comparison would silently be false.
 */
export const HAVE_ENOUGH_DATA = 4

/**
 * The canvas' own ChainRunner, built the first time a render asks for one.
 *
 * Lazy rather than eager, and a plain function over the ref rather than a hook: a runner built
 * during render would leave a Worker behind on the pass StrictMode throws away, and one built in an
 * effect would not exist yet for the render that effect is running for.
 */
function chainRunner(ref: MutableRefObject<ChainRunner | null>): ChainRunner {
  ref.current ??= createChainRunner()
  return ref.current
}

interface Props {
  sourceImage: HTMLImageElement | null
  liveSource: HTMLVideoElement | null
  chain: Chain
  seed: Seed
  canvasRef: RefObject<HTMLCanvasElement>
  onClearSource: () => void
  isRecording?: boolean
  elapsedSeconds?: number
  onStopRecording?: () => void
  isMirrored?: boolean
  onMirrorToggle?: () => void
  onSwitchCamera?: () => void | Promise<void>
  // Given only while the Seed is animated (CONTEXT.md): the loop calls it after each painted
  // frame, so the next frame comes up on a new arrangement. Absent is the held Seed the app has
  // always had — this component is told to advance, never why.
  onAdvanceSeed?: () => void
}

/**
 * Lifecycle coordinator: decides *when* to render. A Source Image renders once per Source,
 * Chain or Seed change; a Live Source renders on the throttled rAF loop instead. The Seed
 * is its own trigger, which is what makes a Re-roll a re-render on its own.
 */
export default function GlitchCanvas({
  sourceImage,
  liveSource,
  chain,
  seed,
  canvasRef,
  onClearSource,
  isRecording,
  elapsedSeconds = 0,
  onStopRecording,
  isMirrored = false,
  onMirrorToggle,
  onSwitchCamera,
  onAdvanceSeed,
}: Props) {
  const hiddenRef = useRef<HTMLCanvasElement>(document.createElement('canvas'))
  // The throttle's clock outlives the effect that reads it. While the Seed animates, every painted
  // frame changes `seed` and so tears the loop down and builds it again — a `lastTime` scoped to
  // the effect would be reset each time, leaving the throttle permanently satisfied and the Chain
  // running on every rAF tick instead of every fourth.
  //
  // Not 0: the first frame must paint on its own merits, not because rAF's timestamp happens to
  // already be past one interval.
  const lastFrameTime = useRef(Number.NEGATIVE_INFINITY)
  // One runner per canvas, built on first use rather than in an effect: both render paths below
  // reach for it, and under StrictMode a runner built during render would leave a Worker behind on
  // the discarded pass. Torn down on unmount, where the Worker's thread actually goes away.
  const runnerRef = useRef<ChainRunner | null>(null)
  useEffect(
    () => () => {
      runnerRef.current?.dispose()
      runnerRef.current = null
    },
    [],
  )

  // The Wipe (#372), off until asked for. `compareRef` is null exactly while it is off, which is
  // what the shell reads to decide whether the Source half costs anything at all — nothing about
  // the render loop changes when nobody is comparing.
  const [isWiping, setIsWiping] = useState(false)
  const compareRef = useRef<HTMLCanvasElement>(null)
  // A Wipe is a way of looking at *this* Source, so a new one arrives without it. App's flow
  // already unmounts this canvas between Sources — its empty state is the only place a Source is
  // chosen — and this makes the rule a property of the canvas rather than of that branch.
  // biome-ignore lint/correctness/useExhaustiveDependencies: the Source is the trigger, not a value read
  useEffect(() => {
    setIsWiping(false)
  }, [sourceImage, liveSource])

  // biome-ignore lint/correctness/useExhaustiveDependencies: `isWiping` is not read in the body — it is read through `compareRef`, which only a re-run picks up. A Source Image paints once per change, so opening the Wipe has to *be* one of those changes or its Source half stays blank until the Chain moves.
  useEffect(() => {
    const canvas = canvasRef.current
    if (!canvas || !sourceImage) {
      return
    }
    let superseded = false
    const frame: GlitchFrame = {
      source: sourceImage,
      canvas,
      hidden: hiddenRef.current,
      runner: chainRunner(runnerRef),
      chain,
      seed,
      isMirrored,
      compare: compareRef.current,
    }
    const paint = async () => {
      // The re-ask is for **a Worker that died holding this frame's pixels**, and for nothing else.
      // Backpressure cannot reach it: the only thing that drops the newest Source Image render is a
      // newer one, and React runs this effect's cleanup before that newer render is ever submitted,
      // so `superseded` is already true by the time the drop lands. What is left is `fallBack()`
      // nulling the frame in flight — the pixels were transferred and left with the Worker, and a
      // still image has no next frame to correct that with. Asking once more is enough, because by
      // then the runner *is* the synchronous core and cannot drop.
      if ((await renderGlitchFrame(frame)) === 'dropped' && !superseded) {
        await renderGlitchFrame(frame)
      }
    }
    void paint()
    return () => {
      superseded = true
    }
  }, [sourceImage, chain, seed, isMirrored, canvasRef, isWiping])

  // rAF loop throttled to ~15fps — the Chain runs on a Worker (ADR 0002), so what happens on this
  // thread is the sampling and the paint. The Seed is held across frames by default: that's what
  // keeps the corruption pattern from boiling. `onAdvanceSeed` is what makes the boiling a choice —
  // the loop asks for the next arrangement once a frame has actually been painted, so the Seed
  // advances per *painted* frame rather than per rAF tick, and a frame the runner dropped moves
  // nothing.
  useEffect(() => {
    const canvas = canvasRef.current
    if (!canvas || !liveSource) {
      return
    }

    const video = liveSource
    let rafId: number
    let stopped = false

    const loop = (now: number) => {
      rafId = requestAnimationFrame(loop)
      if (now - lastFrameTime.current < LIVE_SOURCE_FRAME_INTERVAL_MS) {
        return
      }
      lastFrameTime.current = now
      if (video.readyState >= HAVE_ENOUGH_DATA) {
        void renderGlitchFrame({
          source: video,
          canvas,
          hidden: hiddenRef.current,
          runner: chainRunner(runnerRef),
          chain,
          seed,
          isMirrored,
          // Read per tick rather than closed over: the loop then needs no rebuilding when the Wipe
          // is toggled, and it is null the moment the divider unmounts.
          compare: compareRef.current,
        }).then((outcome) => {
          // Same reason editor-state.ts refuses ADVANCE_SEED while the animation is off: the loop
          // and React's render are on different clocks, and a frame still in flight when the loop
          // is torn down must not move the arrangement afterwards.
          if (outcome === 'painted' && !stopped) {
            onAdvanceSeed?.()
          }
        })
      }
    }

    rafId = requestAnimationFrame(loop)
    return () => {
      stopped = true
      cancelAnimationFrame(rafId)
    }
  }, [liveSource, chain, seed, isMirrored, canvasRef, onAdvanceSeed])

  const isLive = liveSource !== null
  // Both Sources are never set at once (App's empty state is the only place one is chosen), so the
  // Wipe can take whichever is there and lay the picture out on that Source's own aspect.
  const source = liveSource ?? sourceImage
  const sourceSize = source === null ? null : sourceDimensions(source)

  return (
    <div className="relative w-full h-full">
      {/* The canvas carries the output's own pixel dimensions; CSS only fits it to the frame. */}
      <canvas
        ref={canvasRef}
        aria-label={isLive ? 'live glitched preview' : 'glitched preview'}
        className="w-full h-full block object-contain bg-bg [image-rendering:pixelated]"
      />
      {/* Between the canvas and the overlay row on purpose: the Wipe paints over the artwork and
          under the chrome, and its own layer takes no pointer events except at the handle. */}
      {isWiping && sourceSize !== null && (
        <WipeDivider
          compareRef={compareRef}
          sourceWidth={sourceSize.w}
          sourceHeight={sourceSize.h}
        />
      )}
      <div className="absolute top-xs right-xs flex items-center gap-xs">
        {isLive && (
          <span
            className={cn(
              CANVAS_OVERLAY_CHROME,
              'flex items-center gap-2xs text-danger border border-danger',
            )}
          >
            <span className="motion-safe:animate-pulse" aria-hidden="true">
              ◉
            </span>{' '}
            LIVE
          </span>
        )}
        {/* The badge *is* the stop control (ADR 0020): a take runs while the user keeps working in
            PRESETS and EDIT, so its stop has to be reachable from every tab — and the badge already
            marks the one place that is. No new chrome, and it carries the timer that left with the
            ExportBar. */}
        {isRecording && (
          <button
            type="button"
            data-testid="rec-indicator"
            onClick={onStopRecording}
            // The name carries the time, so the button announces "1:15 elapsed" when focused. It
            // is deliberately not also a live region: the timer ticks once a second, and announcing
            // it every second would talk over the user for the length of the take.
            aria-label={`stop recording — ${formatElapsedTime(elapsedSeconds)} elapsed`}
            className={cn(
              CANVAS_OVERLAY_CHROME,
              TOUCH_TARGET_ICON,
              'flex items-center gap-2xs text-danger border border-danger',
              // `bg-bg-elevated`, not the translucent `bg-danger-ghost` a hover state would normally
              // take: this chip sits on the user's artwork, so ADR 0013's opaque-background rule
              // binds every state it has, not just the resting one. The pair is pinned by the
              // deck kit's Theme Contract guard, for every Theme (ADR 0024).
              'cursor-pointer transition-colors duration-fast hover:bg-bg-elevated',
            )}
          >
            <span className="motion-safe:animate-pulse" aria-hidden="true">
              ●
            </span>
            <span>{formatElapsedTime(elapsedSeconds)}</span>
            <span aria-hidden="true">⏹</span>
          </button>
        )}
        {/* Live source-tuning chrome, homed beside clear (ADR 0015): same family as clear — it acts
            on the Source, not the export. A real pixel flip (ADR 0016), so it also toggles the
            camera's auto-mirror off. Icon-only on mobile to hold the row. */}
        {isLive && onMirrorToggle && (
          <button
            type="button"
            onClick={onMirrorToggle}
            aria-pressed={isMirrored}
            aria-label={isMirrored ? 'disable mirror' : 'enable mirror'}
            className={cn(
              CANVAS_OVERLAY_CHROME,
              TOUCH_TARGET_ICON,
              isMirrored
                ? 'border border-accent text-accent cursor-pointer transition-colors duration-fast'
                : CANVAS_OVERLAY_BUTTON_REST,
            )}
          >
            ⇋{!isTouchDevice && ' mirror'}
          </button>
        )}
        {/* Front/rear only makes sense on a device that has both — same gate ASCII's switch uses. */}
        {isLive && isTouchDevice && onSwitchCamera && (
          <button
            type="button"
            onClick={() => void onSwitchCamera()}
            aria-label="switch camera"
            className={cn(CANVAS_OVERLAY_CHROME, TOUCH_TARGET_ICON, CANVAS_OVERLAY_BUTTON_REST)}
          >
            ⇄
          </button>
        )}
        {/* "compare" rather than "wipe" on the chip, deliberately: the control next to it clears
            the Source, and in that company "wipe" reads as erase. The mechanism keeps its name
            (CONTEXT.md); the word the user presses says what pressing it does. */}
        <button
          type="button"
          onClick={() => setIsWiping((current) => !current)}
          aria-pressed={isWiping}
          aria-label={isWiping ? 'disable compare' : 'enable compare'}
          className={cn(
            CANVAS_OVERLAY_CHROME,
            TOUCH_TARGET_ICON,
            isWiping
              ? 'border border-accent text-accent cursor-pointer transition-colors duration-fast'
              : CANVAS_OVERLAY_BUTTON_REST,
          )}
        >
          ◧{!isTouchDevice && ' compare'}
        </button>
        <button
          type="button"
          onClick={onClearSource}
          title="clear source"
          aria-label="clear source"
          className={cn(CANVAS_OVERLAY_CHROME, TOUCH_TARGET_ICON, CANVAS_OVERLAY_BUTTON_REST)}
        >
          ✕ clear
        </button>
      </div>
    </div>
  )
}
