
import { useState } from 'react'
import { HashRouter, Routes, Route, useNavigate, useLocation, Outlet, useParams } from 'react-router-dom'
import { HelmetProvider } from 'react-helmet-async'
import { ChainProvider } from './context/ChainContext'
import { ThemeProvider } from './context/ThemeContext'
import { BackgroundEffects } from './components/effects/BackgroundEffects'
import { Header } from './components/Header'
import { Home } from './components/Home'
import { TransactionDetail } from './components/TransactionDetail'
import { SolverProfile } from './components/SolverProfile'
import { Footer } from './components/Footer'
import { FAQ } from './components/FAQ'
import { AdminLayout } from './components/admin/AdminLayout'
import { AdminLogin } from './components/admin/AdminLogin'
import { AdminDashboard } from './components/admin/AdminDashboard'
import './index.css'

function Layout() {
  const location = useLocation()
  const navigate = useNavigate()
  const [searchQuery, setSearchQuery] = useState('')

  // Determine current view for Header active state
  const getView = () => {
    if (location.pathname === '/faq') return 'faq'
    if (location.pathname.startsWith('/solver')) return 'solvers'
    if (location.pathname.startsWith('/tx')) return 'transactions'

    // Check query params for scroll sections on Home
    const params = new URLSearchParams(location.search)
    const section = params.get('section')
    if (section === 'solvers') return 'solvers'
    if (section === 'transactions') return 'transactions'

    return 'explorer'
  }

  const handleNavigate = (view: string) => {
    switch (view) {
      case 'faq':
        navigate('/faq')
        break
      case 'solvers':
        navigate({ pathname: '/', search: 'section=solvers' }, { replace: true })
        // Scroll to solver leaderboard after navigation
        setTimeout(() => {
          document.getElementById('solver-leaderboard')?.scrollIntoView({ behavior: 'smooth', block: 'start' })
        }, 100)
        break
      case 'transactions':
        navigate({ pathname: '/', search: 'section=transactions' }, { replace: true })
        setTimeout(() => {
          document.getElementById('transaction-table')?.scrollIntoView({ behavior: 'smooth', block: 'start' })
        }, 100)
        break
      default:
        navigate('/')
        window.scrollTo({ top: 0, behavior: 'smooth' })
    }
  }

  return (
    <div className="min-h-screen bg-transparent text-black dark:text-white flex flex-col transition-colors duration-200 relative">
      <BackgroundEffects />

      {/* Content wrapper with z-index to sit above background */}
      <div className="z-10 flex flex-col min-h-screen">
        {!location.pathname.startsWith('/admin') && (
          <Header
            currentView={getView()}
            onNavigate={handleNavigate}
            onSearch={setSearchQuery}
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
  return <TransactionDetail txHash={hash!} onBack={() => navigate('/')} onSolverClick={(addr) => navigate(`/solver/${addr}`)} />
}

function SolverProfileWrapper() {
  const { address } = useParams()
  const navigate = useNavigate()
  return <SolverProfile address={address!} onBack={() => navigate('/')} onTxClick={(hash) => navigate(`/tx/${hash}`)} />
}

function App() {
  return (
    <ChainProvider>
      <ThemeProvider>
        <HelmetProvider>
          <HashRouter>
            <Routes>
              <Route element={<Layout />}>
                <Route path="/" element={<Home />} />
                <Route path="/faq" element={<FAQ />} />
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
  )
}

export default App
