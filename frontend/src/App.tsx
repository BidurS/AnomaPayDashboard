
import { useState } from 'react'
import { HashRouter, Routes, Route, useNavigate, useLocation, Outlet, useParams, useOutletContext } from 'react-router-dom'
import { HelmetProvider } from 'react-helmet-async'
import { ChainProvider } from './context/ChainContext'
import { ThemeProvider } from './context/ThemeContext'
import { BackgroundEffects } from './components/effects/BackgroundEffects'
import { Header } from './components/Header'
import { Hero } from './components/Hero'
import { Charts } from './components/Charts'
import { SolverLeaderboard } from './components/SolverLeaderboard'
import { PrivacyPulse } from './components/PrivacyPulse'
import { IntentMempool } from './components/IntentMempool'
import { CrossChainTopology } from './components/CrossChainTopology'
import { TransactionTable } from './components/TransactionTable'
import { TransactionDetail } from './components/TransactionDetail'
import { SolverProfile } from './components/SolverProfile'
import { Footer } from './components/Footer'
import { FAQ } from './components/FAQ'
import { AdminLayout } from './components/admin/AdminLayout'
import { AdminLogin } from './components/admin/AdminLogin'
import { AdminDashboard } from './components/admin/AdminDashboard'
import { CommandPalette } from './components/CommandPalette'
import { ZKCircuitRegistry } from './components/ZKCircuitRegistry'
import { MempoolPage } from './pages/MempoolPage'
import { SEO } from './components/SEO'
import './index.css'

function Dashboard() {
  const navigate = useNavigate()
  return (
    <>
      <SEO title="Dashboard" description="High-level overview of Anoma Protocol intent settlement and network health." />
      <Hero />
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-0 border-b border-black dark:border-white/10">
        <Charts />
        <div className="border-l border-black dark:border-white/10">
          <PrivacyPulse />
        </div>
      </div>
      <div className="py-12 px-6 max-w-7xl mx-auto flex justify-center">
        <button
          onClick={() => navigate('/live')}
          className="btn-swiss-primary text-lg px-12 py-6 group"
        >
          Enter Live Gossip Network <Zap className="w-5 h-5 group-hover:scale-125 transition-transform ml-2" />
        </button>
      </div>
    </>
  )
}

function LiveFeedPage() {
  return (
    <>
      <SEO title="Live Gossip Feed" description="Real-time P2P intent gossip and multi-domain topology visualization." />
      <IntentMempool />
      <CrossChainTopology />
    </>
  )
}

function SolversPage() {
  return (
    <>
      <SEO title="Solver Intelligence" description="Deep analytics and strategy classification for Anoma network solvers." />
      <SolverLeaderboard />
    </>
  )
}

function TransactionsPage() {
  const { searchQuery } = useOutletContext<{ searchQuery: string }>()
  const navigate = useNavigate()
  return (
    <>
      <SEO title="Explorer" description="Search and inspect every intent settled on the Anoma Protocol." />
      <TransactionTable
        searchQuery={searchQuery}
        onTxClick={(hash) => navigate(`/tx/${hash}`)}
        onSolverClick={(address) => navigate(`/solver/${address}`)}
      />
    </>
  )
}

function Layout() {
  const location = useLocation()
  const navigate = useNavigate()
  const [searchQuery, setSearchQuery] = useState('')
  const [isPaletteOpen, setIsPaletteOpen] = useState(false)

  // Determine current view for Header active state
  const getView = () => {
    if (location.pathname === '/') return 'dashboard'
    if (location.pathname === '/live') return 'live'
    if (location.pathname === '/solvers' || location.pathname.startsWith('/solver/')) return 'solvers'
    if (location.pathname === '/transactions' || location.pathname.startsWith('/tx/')) return 'transactions'
    if (location.pathname === '/faq') return 'faq'
    return 'dashboard'
  }

  const handleSearch = (query: string) => {
    const q = query.trim()
    setSearchQuery(q)

    if (q.startsWith('0x') && q.length === 66) {
      navigate(`/tx/${q}`)
    } else if (q.startsWith('0x') && q.length === 42) {
      navigate(`/solver/${q}`)
    } else {
      navigate(`/transactions?search=${q}`)
    }
  }

  return (
    <div className="min-h-screen bg-transparent text-black dark:text-white flex flex-col transition-colors duration-200 relative">
      <BackgroundEffects />
      <CommandPalette isOpen={isPaletteOpen} setIsOpen={setIsPaletteOpen} />

      <div className="z-10 flex flex-col min-h-screen">
        {!location.pathname.startsWith('/admin') && (
          <Header
            currentView={getView()}
            onSearch={handleSearch}
            onOpenPalette={() => setIsPaletteOpen(true)}
          />
        )}

        <main className="flex-1">
          <Outlet context={{ searchQuery }} />
        </main>

        {!location.pathname.startsWith('/admin') && <Footer />}
      </div>
    </div>
  )
}

// Wrappers to adapt params to props
function TxDetailWrapper() {
  const { hash } = useParams()
  const navigate = useNavigate()
  return <TransactionDetail txHash={hash!} onBack={() => navigate('/transactions')} onSolverClick={(addr) => navigate(`/solver/${addr}`)} />
}

function SolverProfileWrapper() {
  const { address } = useParams()
  const navigate = useNavigate()
  return <SolverProfile address={address!} onBack={() => navigate('/solvers')} onTxClick={(hash) => navigate(`/tx/${hash}`)} />
}

import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import { Zap } from 'lucide-react'

const queryClient = new QueryClient()

function App() {
  return (
    <QueryClientProvider client={queryClient}>
      <ChainProvider>
        <ThemeProvider>
          <HelmetProvider>
            <HashRouter>
              <Routes>
                <Route element={<Layout />}>
                  <Route path="/" element={<Dashboard />} />
                  <Route path="/live" element={<LiveFeedPage />} />
                  <Route path="/solvers" element={<SolversPage />} />
                  <Route path="/transactions" element={<TransactionsPage />} />
                  <Route path="/mempool" element={<MempoolPage />} />
                  <Route path="/faq" element={<FAQ />} />
                  <Route path="/circuits" element={<ZKCircuitRegistry />} />

                  <Route path="/tx/:hash" element={<TxDetailWrapper />} />
                  <Route path="/solver/:address" element={<SolverProfileWrapper />} />

                  {/* Admin Routes */}
                  <Route path="/admin" element={<AdminLayout />}>
                    <Route index element={<AdminDashboard />} />
                    <Route path="dashboard" element={<AdminDashboard />} />
                    <Route path="login" element={<AdminLogin />} />
                  </Route>
                </Route>
              </Routes>
            </HashRouter>
          </HelmetProvider>
        </ThemeProvider>
      </ChainProvider>
    </QueryClientProvider>
  )
}

export default App
