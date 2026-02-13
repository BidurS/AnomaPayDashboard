import { useState, useEffect, useCallback, useRef } from 'react'

// API base URL - use relative path in dev (proxied), full URL in production
export const API_BASE_url = import.meta.env.DEV ? '' : 'https://anomapay-explorer.bidurandblog.workers.dev'
const API_URL = API_BASE_url

// Types
export interface Chain {
    id: number
    name: string
    explorer_url: string
    icon: string
}

export interface Stats {
    totalVolume: number
    intentCount: number
    uniqueSolvers: number
    totalGasUsed: number
    assetCount: number
}

export interface Transaction {
    tx_hash: string
    block_number: number
    solver_address: string
    value_wei: string
    gas_used: number
    timestamp: number
    data_json: string
    primary_type?: string
}

export interface TransactionDetail extends Transaction {
    event_type: string
    gas_price_wei: string
    decoded_input: string
    payloads: PayloadDetail[]
    tokenTransfers: TokenTransfer[]
    privacyRoot: { root_hash: string; estimated_pool_size: number } | null
}

export interface PayloadDetail {
    payload_type: string
    payload_index: number
    blob: string
    timestamp: number
}

export interface TokenTransfer {
    tx_hash?: string
    block_number?: number
    token_address: string
    token_symbol: string
    token_decimals: number
    from_address: string
    to_address: string
    amount_raw: string
    amount_display: number
    amount_usd: number
    timestamp: number
}

export interface Solver {
    address: string
    tx_count: number
    total_gas_spent: string
    total_value_processed: string
    first_seen: number
    last_seen: number
}

export interface SolverDetail extends Solver {
    totalVolumeUsd: number
    recentTransactions: Transaction[]
    dailyActivity: { date: string; count: number }[]
}

export interface DailyStat {
    date: string
    count: number
    volume: string
    unique_solvers: number
    total_gas_used: number
    gas_saved: number
}

export interface Asset {
    token_address: string
    asset_symbol: string
    flow_in: string
    flow_out: string
    tx_count: number
}

export interface NetworkHealth {
    tvl: number
    shieldingRate: number
}

export interface PayloadStat {
    type: string
    count: number
}

export interface AssetSummary {
    token_address: string
    token_symbol: string
    token_decimals: number
    transfer_count: number
    total_amount: number
    total_usd: number
}

// =============================================================
//  Auto-refresh hook - 30s polling  
// =============================================================
function useAutoRefresh(refetchFn: () => void, intervalMs = 30000) {
    const intervalRef = useRef<ReturnType<typeof setInterval> | null>(null)

    useEffect(() => {
        intervalRef.current = setInterval(refetchFn, intervalMs)
        return () => {
            if (intervalRef.current) clearInterval(intervalRef.current)
        }
    }, [refetchFn, intervalMs])
}

// =============================================================
//  Hooks
// =============================================================

export function useChains() {
    const [chains, setChains] = useState<Chain[]>([])
    const [loading, setLoading] = useState(true)

    useEffect(() => {
        fetch(`${API_URL}/api/chains`)
            .then(res => res.json())
            .then(data => {
                setChains(data)
                setLoading(false)
            })
            .catch(() => {
                setChains([{ id: 8453, name: 'Base', explorer_url: 'https://basescan.org', icon: '🔵' }])
                setLoading(false)
            })
    }, [])

    return { chains, loading }
}

export function useStats(chainId: number) {
    const [stats, setStats] = useState<Stats | null>(null)
    const [loading, setLoading] = useState(true)

    const refetch = useCallback(() => {
        fetch(`${API_URL}/api/stats?chainId=${chainId}`)
            .then(res => res.json())
            .then(data => {
                setStats(data)
                setLoading(false)
            })
            .catch(() => setLoading(false))
    }, [chainId])

    useEffect(() => {
        setLoading(true)
        refetch()
    }, [refetch])

    useAutoRefresh(refetch)

    return { stats, loading, refetch }
}

export function useTransactions(chainId: number, searchQuery?: string, page = 1, limit = 20) {
    const [transactions, setTransactions] = useState<Transaction[]>([])
    const [pagination, setPagination] = useState({ page: 1, limit: 20, total: 0, totalPages: 1 })
    const [loading, setLoading] = useState(true)

    const refetch = useCallback(async () => {
        setLoading(true)
        let url = `${API_URL}/api/transactions?chainId=${chainId}&page=${page}&limit=${limit}`

        if (searchQuery) {
            let query = searchQuery.trim()
            if (!query.startsWith('0x') && /^[0-9a-fA-F]+$/.test(query)) query = `0x${query}`

            if (query.length === 66) {
                url = `${API_URL}/api/transactions?chainId=${chainId}&hash=${query}`
            } else if (query.startsWith('0x')) {
                url = `${API_URL}/api/transactions?chainId=${chainId}&address=${query}&page=${page}&limit=${limit}`
            }
        }

        try {
            const res = await fetch(url);
            const data = await res.json();

            if (data.pagination) {
                setTransactions(data.data || []);
                setPagination(data.pagination);
            } else {
                setTransactions(Array.isArray(data) ? data : []);
                setPagination({ page, limit, total: data.length, totalPages: 1 });
            }
        } catch (e) {
            console.error(e);
            setTransactions([]);
        } finally {
            setLoading(false);
        }
    }, [chainId, searchQuery, page, limit])

    useEffect(() => {
        refetch()
    }, [refetch])

    useAutoRefresh(refetch)

    return { transactions, pagination, loading, refetch }
}

export const useLatestTransactions = useTransactions

// Fetch solver leaderboard
export function useSolvers(chainId: number) {
    const [solvers, setSolvers] = useState<Solver[]>([])
    const [loading, setLoading] = useState(true)

    const refetch = useCallback(() => {
        fetch(`${API_URL}/api/solvers?chainId=${chainId}`)
            .then(res => res.json())
            .then(data => {
                setSolvers(data || [])
                setLoading(false)
            })
            .catch(() => setLoading(false))
    }, [chainId])

    useEffect(() => {
        refetch()
    }, [refetch])

    useAutoRefresh(refetch)

    return { solvers, loading }
}

export function useDailyStats(chainId: number, days = 7) {
    const [dailyStats, setDailyStats] = useState<DailyStat[]>([])
    const [loading, setLoading] = useState(true)

    useEffect(() => {
        fetch(`${API_URL}/api/daily-stats?chainId=${chainId}&days=${days}`)
            .then(res => res.json())
            .then(data => {
                setDailyStats(data || [])
                setLoading(false)
            })
            .catch(() => setLoading(false))
    }, [chainId, days])

    return { dailyStats, loading }
}

export function useAssets(chainId: number) {
    const [assets, setAssets] = useState<Asset[]>([])
    const [loading, setLoading] = useState(true)

    useEffect(() => {
        fetch(`${API_URL}/api/assets?chainId=${chainId}`)
            .then(res => res.json())
            .then(data => {
                setAssets(data || [])
                setLoading(false)
            })
            .catch(() => setLoading(false))
    }, [chainId])

    return { assets, loading }
}

export function useNetworkHealth(chainId: number) {
    const [health, setHealth] = useState<NetworkHealth | null>(null)
    const [loading, setLoading] = useState(true)

    const refetch = useCallback(() => {
        fetch(`${API_URL}/api/network-health?chainId=${chainId}`)
            .then(res => res.json())
            .then(data => {
                setHealth(data)
                setLoading(false)
            })
            .catch(() => setLoading(false))
    }, [chainId])

    useEffect(() => {
        refetch()
    }, [refetch])

    useAutoRefresh(refetch)

    return { health, loading }
}

export function usePayloadStats(chainId: number) {
    const [stats, setStats] = useState<PayloadStat[]>([])
    const [loading, setLoading] = useState(true)

    useEffect(() => {
        fetch(`${API_URL}/api/payload-stats?chainId=${chainId}`)
            .then(res => res.json())
            .then(data => {
                setStats(data || [])
                setLoading(false)
            })
            .catch(() => setLoading(false))
    }, [chainId])

    return { stats, loading }
}

// =============================================================
//  NEW: Transaction Detail hook
// =============================================================
export function useTxDetail(chainId: number, txHash: string | null) {
    const [tx, setTx] = useState<TransactionDetail | null>(null)
    const [loading, setLoading] = useState(false)
    const [error, setError] = useState<string | null>(null)

    useEffect(() => {
        if (!txHash) { setTx(null); return }
        setLoading(true)
        setError(null)
        fetch(`${API_URL}/api/tx/${txHash}?chainId=${chainId}`)
            .then(res => {
                if (!res.ok) throw new Error('Not found')
                return res.json()
            })
            .then(data => {
                setTx(data)
                setLoading(false)
            })
            .catch(e => {
                setError(e.message)
                setLoading(false)
            })
    }, [chainId, txHash])

    return { tx, loading, error }
}

// =============================================================
//  NEW: Solver Detail hook
// =============================================================
export function useSolverDetail(chainId: number, address: string | null) {
    const [solver, setSolver] = useState<SolverDetail | null>(null)
    const [loading, setLoading] = useState(false)
    const [error, setError] = useState<string | null>(null)

    useEffect(() => {
        if (!address) { setSolver(null); return }
        setLoading(true)
        setError(null)
        fetch(`${API_URL}/api/solver/${address}?chainId=${chainId}`)
            .then(res => {
                if (!res.ok) throw new Error('Not found')
                return res.json()
            })
            .then(data => {
                setSolver(data)
                setLoading(false)
            })
            .catch(e => {
                setError(e.message)
                setLoading(false)
            })
    }, [chainId, address])

    return { solver, loading, error }
}

// =============================================================
//  NEW: Token Transfers hook
// =============================================================
export function useTokenTransfers(chainId: number) {
    const [transfers, setTransfers] = useState<TokenTransfer[]>([])
    const [assetSummary, setAssetSummary] = useState<AssetSummary[]>([])
    const [loading, setLoading] = useState(true)

    const refetch = useCallback(() => {
        fetch(`${API_URL}/api/token-transfers?chainId=${chainId}&limit=50`)
            .then(res => res.json())
            .then(data => {
                setTransfers(data.data || [])
                setAssetSummary(data.assetSummary || [])
                setLoading(false)
            })
            .catch(() => setLoading(false))
    }, [chainId])

    useEffect(() => {
        refetch()
    }, [refetch])

    useAutoRefresh(refetch)

    return { transfers, assetSummary, loading }
}