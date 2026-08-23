import type { Program } from '../roster'

interface Props {
  program: Program
}

/**
 * One program on the door: its name, what category of thing it is (ADR 0021), what you do there,
 * and a link into its live deploy.
 *
 * The whole card is the link rather than a button inside it, so the target is the card at every
 * width and the accessible name is the description a reader would have read anyway. It stays in
 * this tab: sending you into a program is what the door is for, not a detour you come back from.
 */
export default function ProgramCard({ program }: Props) {
  return (
    <li>
      <a
        href={program.url}
        className="group flex h-full flex-col gap-sm rounded-xs border border-base bg-bg-surface p-md transition-colors duration-fast hover:border-strong hover:bg-bg-elevated focus-visible:outline focus-visible:outline-2 focus-visible:outline-accent focus-visible:outline-offset-2 sm:p-lg"
      >
        <div className="flex items-baseline gap-sm">
          <h3 className="font-bold text-accent text-md tracking-wide sm:text-lg">{program.name}</h3>
          <span className="ml-auto shrink-0 rounded-pill border border-subtle px-xs py-2xs text-fg-subtle text-xs uppercase tracking-widest">
            {program.kind}
          </span>
        </div>

        <p className="text-fg-muted text-xs tracking-wide">{program.tagline}</p>
        <p className="text-fg text-sm">{program.description}</p>

        <span className="mt-auto flex items-center gap-2xs pt-sm text-link text-xs tracking-wide">
          open
          <span
            aria-hidden="true"
            className="transition-transform duration-fast group-hover:translate-x-xs"
          >
            →
          </span>
        </span>
      </a>
    </li>
  )
}
