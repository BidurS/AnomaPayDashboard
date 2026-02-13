import { useState } from 'react'
import { ChainProvider } from './context/ChainContext'
import { Header } from './components/Header'
import { Hero } from './components/Hero'
import { Charts } from './components/Charts'
import { SolverLeaderboard } from './components/SolverLeaderboard'
import { PrivacyPulse } from './components/PrivacyPulse'
import { TransactionTable } from './components/TransactionTable'
import { Footer } from './components/Footer'
import { FAQ } from './components/FAQ'
import './index.css'

function App() {
  const [view, setView] = useState<'explorer' | 'faq'>('explorer')
  const [searchQuery, setSearchQuery] = useState('')

  return (
    <ChainProvider>
      <div className="min-h-screen bg-white text-black flex flex-col">
        <Header currentView={view} onNavigate={setView} onSearch={setSearchQuery} />
        <main className="flex-1">
          {view === 'explorer' ? (
            <>
              <Hero />
              <Charts />
              <SolverLeaderboard />
              <PrivacyPulse />
              <TransactionTable searchQuery={searchQuery} />
            </>
          ) : (
            <FAQ />
          )}
        </main>
        <Footer />
      </div>
    </ChainProvider>
  )
}

export default App
