import { useState, useEffect, useCallback } from 'react'

// API base URL - use relative path in dev (proxied), full URL in production
const API_URL = import.meta.env.DEV ? '' : 'https://anomapay-explorer.bidurandblog.workers.dev'

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
    avgGasPrice: string
    gasSavedETH: number
    intentSatisfactionIndex?: number
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

export interface Solver {
    address: string
    tx_count: number
    total_gas_spent: string
    total_value_processed: string
    first_seen: number
    last_seen: number
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
    dailyVolume: number
    dailyTxCount: number
    shieldingRate: string
}

export interface PayloadStat {
    type: string
    count: number
}

// Fetch chains from API
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

// Fetch stats for a chain
export function useStats(chainId: number) {
    const [stats, setStats] = useState<Stats | null>(null)
    const [loading, setLoading] = useState(true)

    const refetch = useCallback(() => {
        setLoading(true)
        fetch(`${API_URL}/api/stats?chainId=${chainId}`)
            .then(res => res.json())
            .then(data => {
                setStats(data)
                setLoading(false)
            })
            .catch(() => setLoading(false))
    }, [chainId])

    useEffect(() => {
        refetch()
    }, [refetch])

    return { stats, loading, refetch }
}



// Fetch from Blockscout


// Fetch transactions for a chain
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

    return { transactions, pagination, loading, refetch }
}





// Alias for backwards compatibility
export const useLatestTransactions = useTransactions

// NEW: Fetch solver leaderboard
export function useSolvers(chainId: number) {
    const [solvers, setSolvers] = useState<Solver[]>([])
    const [loading, setLoading] = useState(true)

    useEffect(() => {
        fetch(`${API_URL}/api/solvers?chainId=${chainId}`)
            .then(res => res.json())
            .then(data => {
                setSolvers(data || [])
                setLoading(false)
            })
            .catch(() => setLoading(false))
    }, [chainId])

    return { solvers, loading }
}

// NEW: Fetch daily stats for charts
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

// NEW: Fetch asset popularity
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

// NEW: Fetch network health
export function useNetworkHealth(chainId: number) {
    const [health, setHealth] = useState<NetworkHealth | null>(null)
    const [loading, setLoading] = useState(true)

    useEffect(() => {
        fetch(`${API_URL}/api/network-health?chainId=${chainId}`)
            .then(res => res.json())
            .then(data => {
                setHealth(data)
                setLoading(false)
            })
            .catch(() => setLoading(false))
    }, [chainId])

    return { health, loading }
}

// NEW: Fetch intent distribution
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