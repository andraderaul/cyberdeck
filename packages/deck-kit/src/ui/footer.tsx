// The deck's bottom edge: who made this, where the code is, and — where a workspace has one — the
// way into its About. It rose into the kit on ADR 0014's bar rather than on "this repeats": ASCII
// and GLITCH had already converged on an empty diff, and the hub made the third caller.
//
// `about` is optional because the hub has no About modal to open. That is the one real difference
// between the callers, and it is a difference in what the workspace *has*, not in what the bar is.

import { cn } from '../utils/cn'

const AUTHOR_URL = 'https://www.linkedin.com/in/andraderaul/'

// No focus-visible ring of its own: an anchor keeps the UA's, and overriding it here would have to
// re-earn the contrast the browser already guarantees against every Theme (ADR 0024).
const LINK_CLASS =
  'inline-flex items-center min-h-[44px] font-mono text-xs tracking-wide transition-all text-link no-underline'

// `text-fg-subtle` rather than `text-fg-dim`, which sits below the contrast floor — a test in the
// kit pins it, because the two are one character apart and the failure is invisible in review.
//
// `min-w-[44px]` alongside the height because "about" is five characters and drew 37.4px wide
// (#355) — the same defect #297 found in `Chip`, where a control's width was whatever its label
// happened to measure. The links beside it are already wider than the target and `ml-auto` keeps
// this one away from them, so the extra width costs the bar nothing.
const ABOUT_CLASS =
  'ml-auto inline-flex items-center justify-center min-h-[44px] min-w-[44px] font-mono text-xs tracking-wide text-fg-subtle hover:text-fg transition-all cursor-pointer focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-accent'

interface Props {
  /** Each workspace points at its own repository — ASCII//Convert's predates the monorepo. */
  sourceHref: string
  onAbout?: () => void
  className?: string
}

/**
 * The bar reads ultra-thin, but it sits on the bottom edge in the thumb zone — so the 44px target
 * lives on each control rather than on the bar, and shrinking the chrome never shrinks what you tap.
 */
export default function Footer({ sourceHref, onAbout, className }: Props) {
  return (
    <footer
      className={cn(
        'flex shrink-0 items-center gap-sm border-base border-t px-sm sm:px-lg',
        className,
      )}
    >
      <a href={sourceHref} target="_blank" rel="noopener noreferrer" className={LINK_CLASS}>
        source code →
      </a>
      <a href={AUTHOR_URL} target="_blank" rel="noopener noreferrer" className={LINK_CLASS}>
        author →
      </a>
      {onAbout && (
        <button type="button" onClick={onAbout} className={ABOUT_CLASS}>
          about
        </button>
      )}
    </footer>
  )
}
