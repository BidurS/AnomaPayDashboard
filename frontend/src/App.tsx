
import { useState } from 'react'
import { HashRouter, Routes, Route, useNavigate, useLocation, Outlet, useParams } from 'react-router-dom'
import { HelmetProvider } from 'react-helmet-async'
import { ChainProvider } from './context/ChainContext'
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

  // Determine view for Header
  const currentView = location.pathname === '/faq' ? 'faq' : 'explorer'

  return (
    <div className="min-h-screen bg-white dark:bg-black text-black dark:text-white flex flex-col transition-colors duration-200">
      {/* Hide Header on Admin pages if desired, or keep it. Let's keep it but maybe simplified? 
          For now, keep it everywhere except maybe explicit admin layout if admin layout has its own header.
          AdminLayout has its own Header. So we might want to conditionally render this Header.
      */}
      {!location.pathname.startsWith('/admin') && (
        <Header
          currentView={currentView}
          onNavigate={(v) => navigate(v === 'faq' ? '/faq' : '/')}
          onSearch={setSearchQuery}
        />
      )}

      <main className="flex-1">
        <Outlet context={{ searchQuery }} />
      </main>

      {!location.pathname.startsWith('/admin') && <Footer />}
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
    </ChainProvider>
  )
}

export default App

