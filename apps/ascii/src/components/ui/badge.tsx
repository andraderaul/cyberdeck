export default function Badge({ children }: { children: React.ReactNode }) {
  return (
    <span className="text-cyan font-mono text-xs tracking-wide px-2 py-0.5 bg-info-ghost border border-cyan/20">
      {children}
    </span>
  )
}
