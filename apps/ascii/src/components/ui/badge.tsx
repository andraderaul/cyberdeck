export default function Badge({ children }: { children: React.ReactNode }) {
  return (
    <span className="text-info font-mono text-xs tracking-wide px-2 py-0.5 bg-info-ghost border border-info/20">
      {children}
    </span>
  )
}
