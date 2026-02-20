import { useQuery, keepPreviousData } from '@tanstack/react-query'

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
    volume24h: number
    volume7d: number
    intentCount: number
    intentCount24h: number
    uniqueSolvers: number
    totalGasUsed: number
    gasSavedUsd: number
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
    forwarderCalls: ForwarderCall[]
    actionEvents: ActionEvent[]
    privacyRoot: { root_hash: string; estimated_pool_size: number } | null
    // V3 Fields (Optional for D1 compatibility)
    intents?: any[]
    hash?: string
    solverAddress?: string
    originChain?: string
    destinationChain?: string
    id?: string
    sender?: string
    appData?: any
}

export interface ForwarderCall {
    untrusted_forwarder: string
    input: string
    output: string
    timestamp: number
}

export interface ActionEvent {
    action_tree_root: string
    action_tag_count: number
    timestamp: number
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
    total_volume_usd: number
    forwarder_calls?: number
    badges?: string[]
    first_seen: number
    last_seen: number
    // V3 Fields (Optional for D1 compatibility)
    successfulMatches?: number
    savingsMetric?: number
    latency?: number
}

export interface SolverDetail extends Solver {
    totalVolumeUsd: number
    forwarderCallsCount?: number
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

export interface SystemStatus {
    status: 'synced' | 'lagging' | 'error'
    diff: number
    lastSyncedBlock: number
    currentBlock: number
    timestamp: string
}

export interface ResourceChurn {
    date: string
    commitments: number
    pool_size: number
}

// =============================================================
//  Hooks (TanStack Query)
// =============================================================

export const MOCK_DOMAINS: Chain[] = [
    { id: 9000, name: 'Global Hub', explorer_url: '#', icon: '🌐' },
    { id: 9001, name: 'DeFi Fractal', explorer_url: '#', icon: '🏦' },
    { id: 9002, name: 'Social Realm', explorer_url: '#', icon: '🗣️' },
    { id: 9003, name: 'Gaming Subnet', explorer_url: '#', icon: '🎮' },
    { id: 9004, name: 'Privacy Mixnode', explorer_url: '#', icon: '🛡️' },
]

const isMockChain = (id?: number) => id ? [9000, 9001, 9002, 9003, 9004].includes(id) : false;

const DEFAULT_REAL_CHAINS: Chain[] = [
    { id: 1, name: 'Ethereum', explorer_url: 'https://etherscan.io', icon: '🔹' },
    { id: 10, name: 'Optimism', explorer_url: 'https://optimistic.etherscan.io', icon: '🔴' },
    { id: 8453, name: 'Base', explorer_url: 'https://basescan.org', icon: '🔵' },
    { id: 42161, name: 'Arbitrum One', explorer_url: 'https://arbiscan.io', icon: '🔵' }
];

export function useChains() {
    const { data: apiChains, isLoading } = useQuery({
        queryKey: ['chains'],
        queryFn: async () => {
            const res = await fetch(`${API_URL}/api/chains`);
            if (!res.ok) throw new Error('Failed to fetch chains');
            return res.json() as Promise<Chain[]>;
        },
        staleTime: 1000 * 60 * 60, // 1 hour (Chains rarely change)
    });

    const chainsList = apiChains && apiChains.length > 1 ? apiChains : DEFAULT_REAL_CHAINS;

    return { chains: chainsList, loading: isLoading };
}

export function useStats(chainId: number) {
    const { data: stats, isLoading, refetch } = useQuery({
        queryKey: ['stats', chainId],
        queryFn: async () => {
            if (isMockChain(chainId)) {
                return {
                    totalVolume: chainId * 850000 + 100000,
                    volume24h: chainId * 45000,
                    volume7d: chainId * 320000,
                    intentCount: chainId * 25000 + 1500,
                    intentCount24h: chainId * 1500 + 200,
                    uniqueSolvers: 12 + chainId * 3,
                    totalGasUsed: chainId * 400000
                } as Stats;
            }
            const res = await fetch(`${API_URL}/api/stats?chainId=${chainId}`);
            return res.json() as Promise<Stats>;
        },
        refetchInterval: 15000, // Poll every 15s (was 10s)
        staleTime: 10000,
    });

    return { stats: stats || null, loading: isLoading, refetch };
}

export function useTransactions(chainId: number, searchQuery?: string, page = 1, limit = 20) {
    const { data, isLoading, refetch } = useQuery({
        queryKey: ['transactions', chainId, searchQuery, page, limit],
        queryFn: async () => {
            if (isMockChain(chainId)) {
                return { data: [], pagination: { page, limit, total: 0, totalPages: 0 } };
            }

            let url = `${API_URL}/api/transactions?chainId=${chainId}&page=${page}&limit=${limit}`;

            if (searchQuery) {
                let query = searchQuery.trim();
                if (!query.startsWith('0x') && /^[0-9a-fA-F]+$/.test(query)) query = `0x${query}`;

                if (query.length === 66) {
                    url = `${API_URL}/api/transactions?chainId=${chainId}&hash=${query}`;
                } else if (query.startsWith('0x')) {
                    url = `${API_URL}/api/transactions?chainId=${chainId}&address=${query}&page=${page}&limit=${limit}`;
                }
            }

            const res = await fetch(url);
            return res.json();
        },
        placeholderData: keepPreviousData,
        refetchInterval: 15000, // Poll every 15s (was 10s)
        staleTime: 10000,
    });

    const transactions = data?.data || (Array.isArray(data) ? data : []) || [];
    const pagination = data?.pagination || { page, limit, total: transactions.length, totalPages: 1 };

    return { transactions, pagination, loading: isLoading, refetch };
}

export const useLatestTransactions = useTransactions;

export function useSolvers(chainId: number) {
    const { data: solvers, isLoading, refetch } = useQuery({
        queryKey: ['solvers', chainId],
        queryFn: async () => {
            if (isMockChain(chainId)) {
                return Array.from({ length: 5 }).map((_, i) => ({
                    address: `0xMockSolver${chainId}${i}`,
                    tx_count: 100 + i * 10,
                    total_gas_spent: (1000000000000000000n * BigInt(i + 1)).toString(),
                    total_value_processed: (50000000000000000000n * BigInt(i + 1)).toString(),
                    total_volume_usd: 100000 + i * 50000,
                    first_seen: Date.now() - (i * 86400000),
                    last_seen: Date.now(),
                })) as Solver[];
            }
            const res = await fetch(`${API_URL}/api/solvers?chainId=${chainId}`);
            return res.json() as Promise<Solver[]>;
        },
        refetchInterval: 60000, // Poll every 60s (was 30s)
        staleTime: 30000,
    });

    return { solvers: solvers || [], loading: isLoading, refetch };
}

export function useDailyStats(chainId: number, days = 7) {
    const { data: dailyStats, isLoading } = useQuery({
        queryKey: ['dailyStats', chainId, days],
        queryFn: async () => {
            const res = await fetch(`${API_URL}/api/daily-stats?chainId=${chainId}&days=${days}`);
            return res.json() as Promise<DailyStat[]>;
        },
        refetchInterval: 120000, // Poll every 2 mins (was 60s)
        staleTime: 60000,
    });

    return { dailyStats: dailyStats || [], loading: isLoading };
}

export function useResourceChurn(chainId: number, days = 7) {
    const { data: churn, isLoading } = useQuery({
        queryKey: ['resourceChurn', chainId, days],
        queryFn: async () => {
            const res = await fetch(`${API_URL}/api/resource-churn?chainId=${chainId}&days=${days}`);
            return res.json() as Promise<ResourceChurn[]>;
        },
        refetchInterval: 120000,
        staleTime: 60000,
    });

    return { churn: churn || [], loading: isLoading };
}

export function useAssets(chainId: number) {
    const { data: assets, isLoading } = useQuery({
        queryKey: ['assets', chainId],
        queryFn: async () => {
            const res = await fetch(`${API_URL}/api/assets?chainId=${chainId}`);
            return res.json() as Promise<Asset[]>;
        },
        refetchInterval: 120000, // Poll every 2 mins (was 60s)
        staleTime: 60000,
    });

    return { assets: assets || [], loading: isLoading };
}

export function useNetworkHealth(chainId: number) {
    const { data: health, isLoading } = useQuery({
        queryKey: ['networkHealth', chainId],
        queryFn: async () => {
            const res = await fetch(`${API_URL}/api/network-health?chainId=${chainId}`);
            return res.json() as Promise<NetworkHealth>;
        },
        refetchInterval: 30000, // Poll every 30s (was 15s)
        staleTime: 15000,
    });

    return { health: health || null, loading: isLoading };
}

export function usePayloadStats(chainId: number) {
    const { data: stats, isLoading } = useQuery({
        queryKey: ['payloadStats', chainId],
        queryFn: async () => {
            const res = await fetch(`${API_URL}/api/payload-stats?chainId=${chainId}`);
            return res.json() as Promise<PayloadStat[]>;
        },
        refetchInterval: 120000, // Poll every 2 mins (was 60s)
        staleTime: 60000,
    });

    return { stats: stats || [], loading: isLoading };
}

export function useTxDetail(chainId: number, txHash: string | null) {
    const { data: tx, isLoading, error } = useQuery({
        queryKey: ['txDetail', chainId, txHash],
        queryFn: async () => {
            if (!txHash) return null;
            const res = await fetch(`${API_URL}/api/tx/${txHash}?chainId=${chainId}`);
            if (!res.ok) throw new Error('Not found');
            return res.json() as Promise<TransactionDetail>;
        },
        enabled: !!txHash,
        retry: 1,
        staleTime: 60000 * 5, // 5 minutes (Tx detail rarely changes once mined)
    });

    return { tx: tx || null, loading: isLoading, error: error ? error.message : null };
}

export function useSolverDetail(chainId: number, address: string | null) {
    const { data: solver, isLoading, error } = useQuery({
        queryKey: ['solverDetail', chainId, address],
        queryFn: async () => {
            if (!address) return null;
            const res = await fetch(`${API_URL}/api/solver/${address}?chainId=${chainId}`);
            if (!res.ok) throw new Error('Not found');
            return res.json() as Promise<SolverDetail>;
        },
        enabled: !!address,
        retry: 1,
        staleTime: 30000,
        refetchInterval: 60000, // Poll every 60s
    });

    return { solver: solver || null, loading: isLoading, error: error ? error.message : null };
}

export function useTokenTransfers(chainId: number) {
    const { data, isLoading, refetch } = useQuery({
        queryKey: ['tokenTransfers', chainId],
        queryFn: async () => {
            const res = await fetch(`${API_URL}/api/token-transfers?chainId=${chainId}&limit=50`);
            return res.json() as Promise<{ data: TokenTransfer[], assetSummary: AssetSummary[] }>;
        },
        refetchInterval: 30000, // Poll every 30s (was 15s)
        staleTime: 15000,
    });

    return {
        transfers: data?.data || [],
        assetSummary: data?.assetSummary || [],
        loading: isLoading,
        refetch
    };
}

export function useSystemStatus(chainId: number) {
    const { data: status, isLoading } = useQuery({
        queryKey: ['systemStatus', chainId],
        queryFn: async () => {
            const res = await fetch(`${API_URL}/api/health?chainId=${chainId}`);
            return res.json() as Promise<SystemStatus>;
        },
        refetchInterval: 60000, // Poll every 60s (was 30s)
        staleTime: 30000,
    });

    return { status: status || null, loading: isLoading };
}