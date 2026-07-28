interface Props {
  onAbout: () => void
}

const LINK_CLASS = 'font-mono text-xs tracking-wide transition-all text-link no-underline'

/**
 * Empty-state bottom chrome (App hides it once a Source loads). Carries the attribution links that
 * used to live only inside the About modal; the `about` trigger opens the modal for the narrative.
 */
export default function Footer({ onAbout }: Props) {
  return (
    <footer className="shrink-0 border-t border-base px-sm sm:px-lg py-2xs flex items-center gap-sm">
      <a
        href="https://github.com/andraderaul/ascii-art-converter"
        target="_blank"
        rel="noopener noreferrer"
        className={LINK_CLASS}
      >
        source code →
      </a>
      <a
        href="https://www.linkedin.com/in/andraderaul/"
        target="_blank"
        rel="noopener noreferrer"
        className={LINK_CLASS}
      >
        author →
      </a>
      <button
        type="button"
        onClick={onAbout}
        className="ml-auto font-mono text-xs tracking-wide text-fg-subtle hover:text-fg transition-all cursor-pointer focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-accent"
      >
        about
      </button>
    </footer>
  )
}
