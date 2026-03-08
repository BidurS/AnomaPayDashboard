import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import App from './App'
import { EventStreamProvider } from './context/EventStreamContext'
import { TrustProvider } from './context/TrustContext'

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <TrustProvider>
      <EventStreamProvider>
        <App />
      </EventStreamProvider>
    </TrustProvider>
  </StrictMode>,
)

