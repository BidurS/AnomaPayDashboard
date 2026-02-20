import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import App from './App'
import { WebSocketProvider } from './context/WebSocketContext'
import { TrustProvider } from './context/TrustContext'

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <TrustProvider>
      <WebSocketProvider>
        <App />
      </WebSocketProvider>
    </TrustProvider>
  </StrictMode>,
)
