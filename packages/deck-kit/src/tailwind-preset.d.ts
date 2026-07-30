// The preset stays plain JS so every app's `tailwind.config.js` can spread it with no build step
// (ADR 0014), which leaves it untyped for the one TypeScript consumer it has: the scale vocabulary
// guard, which reads the scale out of it rather than restating it. Declared narrowly on purpose —
// only what that guard reads. If the preset ever stops carrying one of these, the guard fails loudly
// instead of silently comparing against nothing.

declare const preset: {
  theme: {
    extend: {
      spacing: Record<string, string>
      borderRadius: Record<string, string>
    }
  }
}

export default preset
