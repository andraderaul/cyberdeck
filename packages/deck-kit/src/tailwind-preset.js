// Deck-wide Tailwind theme (ADR 0014). Each app spreads this preset and points its `content`
// glob at the kit's src so the primitives' classes survive the build.
/** @type {import('tailwindcss').Config} */
export default {
  theme: {
    extend: {
      // Semantic only. The literal hue names — violet, cyan, hot-pink, electric, void, abyss,
      // shadow, slate, muted, dim, ghost — used to sit here beside these, and that is exactly why
      // the literal vocabulary kept winning: it was the shorter of two spellings and nothing
      // objected. They are `ice`'s vocabulary, not the deck's (ADR 0024), so a component naming one
      // pins itself to a single Theme. The kit's vocabulary guard fails the build if one comes back.
      colors: {
        accent: 'var(--accent)',
        'fg-strong': 'var(--fg-strong)',
        fg: 'var(--fg)',
        'fg-muted': 'var(--fg-muted)',
        'fg-subtle': 'var(--fg-subtle)',
        // Below the Theme Contract's floor by design — never text that carries meaning.
        'fg-dim': 'var(--fg-dim)',
        'fg-faint': 'var(--fg-faint)',
        'fg-on-accent': 'var(--fg-on-accent)',
        bg: 'var(--bg)',
        'bg-surface': 'var(--bg-surface)',
        'bg-elevated': 'var(--bg-elevated)',
        'bg-overlay': 'var(--bg-overlay)',
        info: 'var(--color-info)',
        danger: 'var(--color-danger)',
        warning: 'var(--color-warning)',
        // Roles the deck drew before it had names for them (ADR 0024)
        phosphor: 'var(--color-phosphor)',
        link: 'var(--color-link)',
        hit: 'var(--color-hit)',
        miss: 'var(--color-miss)',
        // Transparent state surfaces
        'accent-ghost': 'var(--bg-accent-ghost)',
        'accent-dim': 'var(--bg-accent-dim)',
        // Not `--accent-soft`, which is a chosen lighter hue with no consumer today — this is the
        // 12% tint, and the name is the one components already use.
        'accent-soft': 'var(--bg-accent-soft)',
        'danger-ghost': 'var(--bg-danger-ghost)',
        'info-ghost': 'var(--bg-info-ghost)',
        'modal-overlay': 'var(--bg-modal-overlay)',
        // Semantic backgrounds
        'accent-bg': 'var(--color-accent-bg)',
        'info-bg': 'var(--color-info-bg)',
        'danger-bg': 'var(--color-danger-bg)',
      },
      fontFamily: {
        mono: ['var(--font-mono)'],
        display: ['var(--font-display)'],
      },
      fontSize: {
        xs: 'var(--text-xs)',
        sm: 'var(--text-sm)',
        base: 'var(--text-base)',
        md: 'var(--text-md)',
        lg: 'var(--text-lg)',
        xl: 'var(--text-xl)',
        '2xl': 'var(--text-2xl)',
      },
      fontWeight: {
        regular: 'var(--weight-regular)',
        medium: 'var(--weight-medium)',
        semibold: 'var(--weight-semibold)',
        bold: 'var(--weight-bold)',
      },
      letterSpacing: {
        tight: 'var(--tracking-tight)',
        normal: 'var(--tracking-normal)',
        wide: 'var(--tracking-wide)',
        wider: 'var(--tracking-wider)',
        widest: 'var(--tracking-widest)',
      },
      lineHeight: {
        tight: 'var(--leading-tight)',
        normal: 'var(--leading-normal)',
        loose: 'var(--leading-loose)',
      },
      spacing: {
        '2xs': 'var(--gap-2xs)',
        xs: 'var(--gap-xs)',
        sm: 'var(--gap-sm)',
        md: 'var(--gap-md)',
        lg: 'var(--gap-lg)',
        xl: 'var(--gap-xl)',
        '2xl': 'var(--gap-2xl)',
        '3xl': 'var(--gap-3xl)',
        // Section macro spacing
        'sp-xs': 'var(--sp-xs)',
        'sp-sm': 'var(--sp-sm)',
        'sp-md': 'var(--sp-md)',
        'sp-lg': 'var(--sp-lg)',
        'sp-xl': 'var(--sp-xl)',
        'sp-2xl': 'var(--sp-2xl)',
      },
      borderRadius: {
        none: 'var(--radius-none)',
        xs: 'var(--radius-xs)',
        sm: 'var(--radius-sm)',
        md: 'var(--radius-md)',
        pill: 'var(--radius-pill)',
      },
      borderColor: {
        subtle: 'var(--border-color-subtle)',
        base: 'var(--border-color-base)',
        strong: 'var(--border-color-strong)',
      },
      transitionTimingFunction: {
        flick: 'var(--ease-flick)',
        smooth: 'var(--ease-smooth)',
        sharp: 'var(--ease-sharp)',
        snap: 'var(--ease-snap)',
      },
      transitionDuration: {
        instant: 'var(--duration-instant)',
        fast: 'var(--duration-fast)',
        base: 'var(--duration-base)',
        slow: 'var(--duration-slow)',
        slower: 'var(--duration-slower)',
      },
    },
  },
}
