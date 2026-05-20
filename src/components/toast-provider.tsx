import { createContext, type ReactNode, useContext } from 'react'
import { useToast } from '../hooks/use-toast'
import Toast from './ui/toast'

type ToastContextValue = {
  error: (message: string) => void
  info: (message: string) => void
  warn: (message: string) => void
}

export const ToastContext = createContext<ToastContextValue>({
  error: () => {},
  info: () => {},
  warn: () => {},
})

export function useToastError() {
  return useContext(ToastContext).error
}

export function useToastInfo() {
  return useContext(ToastContext).info
}

export function useToastWarn() {
  return useContext(ToastContext).warn
}

export function ToastProvider({ children }: { children: ReactNode }) {
  const { toasts, error, info, warn, dismiss } = useToast()

  return (
    <ToastContext.Provider value={{ error, info, warn }}>
      {children}
      <div
        aria-live="polite"
        className="fixed flex flex-col gap-xs pointer-events-none"
        style={{ bottom: 'var(--gap-md)', right: 'var(--gap-md)', zIndex: 1000 }}
      >
        {toasts.map((t) => (
          <div key={t.id} className="pointer-events-auto">
            <Toast message={t.message} variant={t.variant} onDismiss={() => dismiss(t.id)} />
          </div>
        ))}
      </div>
    </ToastContext.Provider>
  )
}
