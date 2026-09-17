// The preset stays plain JS so every app's `tailwind.config.js` can spread it with no build step
// (ADR 0014), which leaves it untyped for the TypeScript consumers it has: the two vocabulary
// guards that read a namespace out of it rather than restating it. Declared narrowly on purpose —
// only what those guards read. If the preset ever stops carrying one of these, the guard fails
// loudly instead of silently comparing against nothing.

declare const preset: {
  theme: {
    extend: {
      colors: Record<string, string>
      borderColor: Record<string, string>
      spacing: Record<string, string>
      borderRadius: Record<string, string>
      fontSize: Record<string, string>
    }
  }
}

export default preset
