export default function ErrorText({ children }: { children: React.ReactNode }) {
  return <span className="text-hot-pink text-xs tracking-wide">✕ {children}</span>
}
