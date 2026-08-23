import { Footer, ThemeControl } from '@cyberdeck/deck-kit/ui'
import ProgramCard from './components/program-card'
import { PROGRAMS } from './roster'

/**
 * The deck's front door — chrome, not a program (ADR 0025). It takes no user material, hands back
 * no artifact, and has no subject but the deck: every pixel here is the deck naming what it runs
 * and sending you into it. A link *to* a program is navigation and is the whole point; anything
 * that carried state authored at the door would be an artifact, and would make this a program.
 */
export default function App() {
  return (
    <div className="flex min-h-screen flex-col">
      <header className="flex shrink-0 items-center gap-sm border-base border-b px-sm py-sm sm:px-lg">
        <span className="font-bold text-accent text-base tracking-wide">CYBERDECK</span>
        <span className="hidden text-fg-faint text-xs sm:block">—</span>
        <span className="hidden text-fg-muted text-xs sm:block">the front door</span>
        <ThemeControl className="ml-auto" />
      </header>

      <main className="mx-auto w-full max-w-[72rem] flex-1 px-sm py-sp-xs sm:px-lg sm:py-sp-sm">
        <section className="flex flex-col gap-md">
          <h1 className="font-display text-fg-strong text-xl leading-tight tracking-wide sm:text-2xl">
            what the deck runs
          </h1>
          <p className="max-w-[46rem] text-fg-muted text-sm sm:text-base">
            Four of them, each on its own origin and its own version. Every one runs entirely in
            your browser — nothing you open uploads anything, because there is no server behind any
            of it.
          </p>
        </section>

        <h2 className="mt-sp-xs flex items-center gap-sm text-fg-subtle text-xs uppercase tracking-widest sm:mt-sp-sm">
          <span aria-hidden="true">◆</span>
          programs
          <span aria-hidden="true" className="h-px flex-1 bg-bg-overlay" />
        </h2>

        <ul className="mt-md grid list-none grid-cols-1 gap-md p-0 sm:grid-cols-2">
          {PROGRAMS.map((program) => (
            <ProgramCard key={program.id} program={program} />
          ))}
        </ul>
      </main>

      {/* No `about` trigger: the hub has no About to open, because a page whose whole subject is
          the deck says it on the page rather than behind a control (ADR 0025). */}
      <Footer sourceHref="https://github.com/andraderaul/cyberdeck" />
    </div>
  )
}
