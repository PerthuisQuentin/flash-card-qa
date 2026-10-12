import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import { BrowserRouter } from 'react-router'
import { z } from 'zod'
import App from './App.tsx'
import ErrorBoundary from './components/ErrorBoundary.tsx'
import './index.css'
import { StoreProvider } from './state/store.tsx'

// Validation details (e.g. a rejected backup file) are shown to the user, in French.
z.config(z.locales.fr())

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <ErrorBoundary>
      <StoreProvider>
        <BrowserRouter>
          <App />
        </BrowserRouter>
      </StoreProvider>
    </ErrorBoundary>
  </StrictMode>,
)
