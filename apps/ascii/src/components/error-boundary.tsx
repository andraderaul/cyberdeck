import { Component, type ErrorInfo, type ReactNode } from 'react'

interface Props {
  children: ReactNode
  fallback?: ReactNode
}

interface State {
  hasError: boolean
}

function DefaultFallback() {
  return (
    <div className="h-full flex items-center justify-center text-fg-muted text-sm">
      something went wrong — try reloading the page
    </div>
  )
}

export default class ErrorBoundary extends Component<Props, State> {
  state: State = { hasError: false }

  static getDerivedStateFromError(): State {
    return { hasError: true }
  }

  componentDidCatch(error: Error, info: ErrorInfo) {
    // biome-ignore lint/suspicious/noConsole: intentional error reporting at boundary
    console.error('[ErrorBoundary]', error, info.componentStack)
  }

  render() {
    if (this.state.hasError) {
      return this.props.fallback ?? <DefaultFallback />
    }
    return this.props.children
  }
}
