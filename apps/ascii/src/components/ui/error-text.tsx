export default function ErrorText({ children }: { children: React.ReactNode }) {
  return <span className="text-danger text-xs tracking-wide">✕ {children}</span>
}
