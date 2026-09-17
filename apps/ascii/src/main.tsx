import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import './index.css'
import { installClickSound } from '@cyberdeck/deck-kit/sound'
import { ToastProvider } from '@cyberdeck/deck-kit/ui'
import App from './app'

const rootEl = document.getElementById('root')
if (!rootEl) {
  throw new Error('Root element #root not found in index.html')
}

// Outside the tree and never torn down: one listener for the page's lifetime, which is also why no
// unit environment ever installs it (ADR 0029).
installClickSound()

createRoot(rootEl).render(
  <StrictMode>
    <ToastProvider>
      <App />
    </ToastProvider>
  </StrictMode>,
)
