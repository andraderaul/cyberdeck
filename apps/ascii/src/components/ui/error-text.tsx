export default function ErrorText({ id, children }: { id?: string; children: React.ReactNode }) {
  return (
    <span id={id} className="text-danger text-xs tracking-wide">
      ✕ {children}
    </span>
  )
}
