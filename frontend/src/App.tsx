
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
import { DebuggerPage } from './pages/DebuggerPage'
import { AdminLayout } from './components/admin/AdminLayout'
import { AdminLogin } from './components/admin/AdminLogin'
import { AdminDashboard } from './components/admin/AdminDashboard'
import { CommandPalette } from './components/CommandPalette'
import { ZKCircuitRegistry } from './components/ZKCircuitRegistry'
import { MempoolPage } from './pages/MempoolPage'
import { DomainsPage } from './pages/DomainsPage'
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
      
      {/* Primary CTA */}
      <div className="py-20 px-6 bg-black dark:bg-zinc-950 text-white relative overflow-hidden">
        <div className="absolute inset-0 swiss-grid-bg opacity-10 pointer-events-none" />
        <div className="max-w-7xl mx-auto flex flex-col items-center text-center relative z-10">
          <h2 className="text-4xl md:text-6xl font-black uppercase tracking-tighter mb-6 leading-none">
            Witness the<br/>Intent Lifecycle
          </h2>
          <p className="text-zinc-400 uppercase tracking-widest text-sm mb-10 max-w-xl">
            Explore the decentralized gossip network where users express desires and solvers compete for optimal settlement.
          </p>
          <button 
            onClick={() => navigate('/live')}
            className="btn-swiss-primary text-lg px-12 py-6 group hover:scale-105 transition-transform"
          >
            Enter Live Gossip Network <Zap className="w-5 h-5 group-hover:scale-125 transition-transform ml-2" />
          </button>
        </div>
      </div>

      {/* Developer & Technical Suite */}
      <div className="py-24 px-6 max-w-7xl mx-auto">
        <div className="flex items-center gap-4 mb-12">
          <div className="w-2 h-12 bg-black dark:bg-white" />
          <h2 className="text-3xl font-black uppercase tracking-tighter">Developer Suite</h2>
        </div>
        
        <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
          {/* Debugger CTA */}
          <div 
            onClick={() => navigate('/debug')}
            className="swiss-card group cursor-pointer hover:border-[#FF0000] transition-colors"
          >
            <Terminal className="w-10 h-10 mb-6 text-gray-300 group-hover:text-[#FF0000] transition-colors" />
            <h3 className="text-xl font-black uppercase mb-2">Intent Debugger</h3>
            <p className="text-xs text-gray-500 uppercase font-bold tracking-wider leading-relaxed">
              Validate ARM balance, verify logic refs, and simulate intent settlement logic.
            </p>
            <div className="mt-6 flex items-center gap-2 text-[10px] font-black uppercase text-[#FF0000] opacity-0 group-hover:opacity-100 transition-opacity">
              Launch Tool <ArrowRight className="w-3 h-3" />
            </div>
          </div>

          {/* Topology CTA */}
          <div 
            onClick={() => navigate('/domains')}
            className="swiss-card group cursor-pointer hover:border-[#FF0000] transition-colors"
          >
            <Network className="w-10 h-10 mb-6 text-gray-300 group-hover:text-[#FF0000] transition-colors" />
            <h3 className="text-xl font-black uppercase mb-2">Topology Map</h3>
            <p className="text-xs text-gray-500 uppercase font-bold tracking-wider leading-relaxed">
              Visualize the fractal scaling of Anoma's sovereign domains and cross-chain flow.
            </p>
            <div className="mt-6 flex items-center gap-2 text-[10px] font-black uppercase text-[#FF0000] opacity-0 group-hover:opacity-100 transition-opacity">
              View Network <ArrowRight className="w-3 h-3" />
            </div>
          </div>

          {/* ZK Registry CTA */}
          <div 
            onClick={() => navigate('/circuits')}
            className="swiss-card group cursor-pointer hover:border-[#FF0000] transition-colors"
          >
            <Shield className="w-10 h-10 mb-6 text-gray-300 group-hover:text-[#FF0000] transition-colors" />
            <h3 className="text-xl font-black uppercase mb-2">ZK Registry</h3>
            <p className="text-xs text-gray-500 uppercase font-bold tracking-wider leading-relaxed">
              Audit the RISC Zero image IDs and Rust source code for verified protocol logic.
            </p>
            <div className="mt-6 flex items-center gap-2 text-[10px] font-black uppercase text-[#FF0000] opacity-0 group-hover:opacity-100 transition-opacity">
              Inspect Circuits <ArrowRight className="w-3 h-3" />
            </div>
          </div>
        </div>
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
    if (location.pathname === '/mempool') return 'mempool'
    if (location.pathname === '/domains') return 'domains'
    if (location.pathname === '/solvers' || location.pathname.startsWith('/solver/')) return 'solvers'
    if (location.pathname === '/transactions' || location.pathname.startsWith('/tx/')) return 'transactions'
    if (location.pathname === '/circuits') return 'circuits'
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
import { Zap, Terminal, Network, Shield, ArrowRight } from 'lucide-react'

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
                  <Route path="/domains" element={<DomainsPage />} />
                  <Route path="/solvers" element={<SolversPage />} />
                  <Route path="/transactions" element={<TransactionsPage />} />
                  <Route path="/mempool" element={<MempoolPage />} />
                  <Route path="/debug" element={<DebuggerPage />} />
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
