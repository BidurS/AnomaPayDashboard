
import { useNavigate, useOutletContext } from 'react-router-dom'
import { Hero } from './Hero'
import { Charts } from './Charts'
import { SolverLeaderboard } from './SolverLeaderboard'
import { PrivacyPulse } from './PrivacyPulse'
import { TransactionTable } from './TransactionTable'
import { SEO } from './SEO'

export function Home() {
    const { searchQuery } = useOutletContext<{ searchQuery: string }>()
    const navigate = useNavigate()

    return (
        <>
            <SEO
                title="Home"
                description="Explore real-time Anoma Protocol transactions, solver analytics, and privacy metrics."
            />
            <Hero />
            <Charts />
            <SolverLeaderboard />
            <PrivacyPulse />
            <TransactionTable
                searchQuery={searchQuery}
                onTxClick={(hash) => navigate(`/tx/${hash}`)}
                onSolverClick={(address) => navigate(`/solver/${address}`)}
            />
        </>
    )
}
