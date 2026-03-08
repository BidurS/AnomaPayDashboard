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
    chainBreakdown?: { chainId: number; chainName: string; txCount: number; gasSpent: string }[]
    reputationScore?: number
    reputationTier?: string
    reputationBreakdown?: { volume: number; activity: number; consistency: number; chainDiversity: number; longevity: number }
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

// Multi-chain aggregate stats for ARM Overview
const ARM_CHAIN_IDS = [1, 8453, 10, 42161]; // Ethereum, Base, Optimism, Arbitrum

export function useMultiChainStats() {
    const { data, isLoading } = useQuery({
        queryKey: ['multi-chain-stats'],
        queryFn: async () => {
            const results = await Promise.allSettled(
                ARM_CHAIN_IDS.map(async (chainId) => {
                    const res = await fetch(`${API_URL}/api/stats?chainId=${chainId}`);
                    if (!res.ok) return null;
                    return { chainId, stats: await res.json() as Stats };
                })
            );

            const perChain: { chainId: number; stats: Stats }[] = [];
            const aggregate: Stats = {
                totalVolume: 0, volume24h: 0, volume7d: 0,
                intentCount: 0, intentCount24h: 0,
                uniqueSolvers: 0, totalGasUsed: 0, gasSavedUsd: 0
            };

            for (const r of results) {
                if (r.status === 'fulfilled' && r.value) {
                    perChain.push(r.value);
                    const s = r.value.stats;
                    aggregate.totalVolume += s.totalVolume || 0;
                    aggregate.volume24h += s.volume24h || 0;
                    aggregate.volume7d += s.volume7d || 0;
                    aggregate.intentCount += s.intentCount || 0;
                    aggregate.intentCount24h += s.intentCount24h || 0;
                    aggregate.uniqueSolvers += s.uniqueSolvers || 0;
                    aggregate.totalGasUsed += s.totalGasUsed || 0;
                    aggregate.gasSavedUsd += (s.gasSavedUsd || 0);
                }
            }

            return { perChain, aggregate, chainCount: perChain.length };
        },
        refetchInterval: 30000,
        staleTime: 20000,
    });

    return { multiStats: data || null, loading: isLoading };
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

export function useSolverDetail(_chainId: number, address: string | null) {
    // Use chainId=0 for cross-chain aggregated profile
    const queryChainId = 0;
    const { data: solver, isLoading, error } = useQuery({
        queryKey: ['solverDetail', queryChainId, address],
        queryFn: async () => {
            if (!address) return null;
            const res = await fetch(`${API_URL}/api/solver/${address}?chainId=${queryChainId}`);
            if (!res.ok) throw new Error('Not found');
            return res.json() as Promise<SolverDetail>;
        },
        enabled: !!address,
        retry: 1,
        staleTime: 30000,
        refetchInterval: 60000,
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

export interface PrivacyPoolStat {
    block_number: number
    timestamp: number
    estimated_pool_size: number
    root_hash: string
}

export function usePrivacyStats(chainId: number) {
    const { data: stats, isLoading } = useQuery({
        queryKey: ['privacyStats', chainId],
        queryFn: async () => {
            const res = await fetch(`${API_URL}/api/privacy-stats?chainId=${chainId}`);
            return res.json() as Promise<PrivacyPoolStat[]>;
        },
        refetchInterval: 15000, // Poll every 15s to keep pulse alive
        staleTime: 10000,
    });

    return { stats: stats || [], loading: isLoading };
}

// =============================================================
//  V3 API — Intent Lifecycle & Analytics (Phase 1)
// =============================================================

export interface IntentRecord {
    id: string
    chainId: number
    status: string
    intentType: string
    solver: string | null
    inputValueUsd: number
    outputValueUsd: number
    gasCostUsd: number
    gasUsed: number
    isShielded: number
    isMultiChain: number
    payloadTypes: string
    payloadCount: number
    hasForwarderCalls: number
    tagCount: number
    createdAt: number
    settledAt: number | null
    txHash: string
    blockNumber: number
}

export interface IntentDetail extends IntentRecord {
    creator: string | null
    consumedResources: string | null
    createdResources: string | null
    actionTreeRoot: string | null
    solverProfitUsd: number
    gasPriceWei: string
    commitmentRoot: string | null
    nullifierCount: number
    correlationId: string | null
    valueWei: string
    rawDataJson: string | null
    lifecycle: any[]
    payloads: any[]
    tokenTransfers: any[]
    forwarderCalls: any[]
}

export interface IntentTypeDistribution {
    intentType: string
    count: number
    totalVolumeUsd: number
    avgGasCostUsd: number
    shieldedCount: number
}

export interface LifecycleFunnel {
    status: string
    count: number
    totalVolumeUsd: number
}

export interface DemandHeatmapCell {
    dayOfWeek: number
    hourOfDay: number
    count: number
    totalVolumeUsd: number
}

export interface SolverEconEntry {
    solverAddress: string
    totalIntentsSolved: number
    totalRevenueUsd: number
    totalGasCostUsd: number
    netProfitUsd: number
    avgSuccessRate: number
    activeDays: number
    rank: number
    profitPerIntent: number
    roi: number
}

export interface PlatformOverview {
    allTime: {
        totalIntents: number
        totalVolumeUsd: number
        uniqueSolvers: number
        shieldedIntents: number
        shieldedPercentage: string
        avgGasCostUsd: number
    }
    last24h: { intentCount: number; volumeUsd: number; uniqueSolvers: number }
    last7d: { intentCount: number; volumeUsd: number }
}

export function useIntents(chainId: number, filters?: { status?: string; type?: string; solver?: string; shielded?: string; page?: number; limit?: number }) {
    const page = filters?.page || 1;
    const limit = filters?.limit || 25;
    const { data, isLoading, refetch } = useQuery({
        queryKey: ['v3-intents', chainId, filters],
        queryFn: async () => {
            const params = new URLSearchParams({ chainId: String(chainId), page: String(page), limit: String(limit) });
            if (filters?.status) params.set('status', filters.status);
            if (filters?.type) params.set('type', filters.type);
            if (filters?.solver) params.set('solver', filters.solver);
            if (filters?.shielded) params.set('shielded', filters.shielded);
            const res = await fetch(`${API_URL}/api/v3/intents?${params}`);
            return res.json() as Promise<{ data: IntentRecord[]; pagination: { page: number; limit: number; total: number; totalPages: number } }>;
        },
        placeholderData: keepPreviousData,
        refetchInterval: 15000,
        staleTime: 10000,
    });
    return {
        intents: data?.data || [],
        pagination: data?.pagination || { page, limit, total: 0, totalPages: 0 },
        loading: isLoading,
        refetch,
    };
}

export function useIntentDetail(chainId: number, intentId: string | null) {
    const { data, isLoading, error } = useQuery({
        queryKey: ['v3-intent-detail', chainId, intentId],
        queryFn: async () => {
            if (!intentId) return null;
            const res = await fetch(`${API_URL}/api/v3/intents/${encodeURIComponent(intentId)}?chainId=${chainId}`);
            if (!res.ok) throw new Error('Not found');
            return res.json() as Promise<IntentDetail>;
        },
        enabled: !!intentId,
        staleTime: 60000 * 5,
    });
    return { intent: data || null, loading: isLoading, error: error ? error.message : null };
}

export function useIntentTypes(chainId: number) {
    const { data, isLoading } = useQuery({
        queryKey: ['v3-intent-types', chainId],
        queryFn: async () => {
            const res = await fetch(`${API_URL}/api/v3/analytics/intent-types?chainId=${chainId}`);
            return res.json() as Promise<IntentTypeDistribution[]>;
        },
        refetchInterval: 120000,
        staleTime: 60000,
    });
    return { types: data || [], loading: isLoading };
}

export function useLifecycleFunnel(chainId: number) {
    const { data, isLoading } = useQuery({
        queryKey: ['v3-lifecycle-funnel', chainId],
        queryFn: async () => {
            const res = await fetch(`${API_URL}/api/v3/analytics/lifecycle-funnel?chainId=${chainId}`);
            return res.json() as Promise<LifecycleFunnel[]>;
        },
        refetchInterval: 120000,
        staleTime: 60000,
    });
    return { funnel: data || [], loading: isLoading };
}

export function useDemandHeatmap(chainId: number) {
    const { data, isLoading } = useQuery({
        queryKey: ['v3-demand-heatmap', chainId],
        queryFn: async () => {
            const res = await fetch(`${API_URL}/api/v3/analytics/demand-heatmap?chainId=${chainId}`);
            return res.json() as Promise<DemandHeatmapCell[]>;
        },
        refetchInterval: 300000,
        staleTime: 120000,
    });
    return { heatmap: data || [], loading: isLoading };
}

export function useSolverEconomics(chainId: number, days = 30) {
    const { data, isLoading } = useQuery({
        queryKey: ['v3-solver-economics', chainId, days],
        queryFn: async () => {
            const res = await fetch(`${API_URL}/api/v3/solvers/economics?chainId=${chainId}&days=${days}`);
            return res.json() as Promise<SolverEconEntry[]>;
        },
        refetchInterval: 60000,
        staleTime: 30000,
    });
    return { economics: data || [], loading: isLoading };
}

export interface SolverEconHistoryEntry {
    period: string;
    intentsSolved: number;
    intentsFailed: number;
    totalRevenueUsd: number;
    totalGasCostUsd: number;
    netProfitUsd: number;
    avgSettlementTimeMs: number;
    avgBatchSize: number;
    successRate: number;
    intentTypesJson: string | null;
}

export interface SolverEconHistoryResponse {
    history: SolverEconHistoryEntry[];
    intentBreakdown: { intentType: string; count: number; totalVolumeUsd: number }[];
    totals: { totalDays: number; totalIntents: number; totalRevenue: number; totalGasCost: number; netProfit: number };
}

export function useSolverEconomicHistory(chainId: number, address: string | null) {
    const { data, isLoading } = useQuery({
        queryKey: ['v3-solver-econ-history', chainId, address],
        queryFn: async () => {
            if (!address) return null;
            const res = await fetch(`${API_URL}/api/v3/solvers/${address}/economics?chainId=${chainId}`);
            return res.json() as Promise<SolverEconHistoryResponse>;
        },
        enabled: !!address,
        staleTime: 60000,
        refetchInterval: 120000,
    });
    return { econHistory: data || null, loading: isLoading };
}

export function usePlatformOverview(chainId: number) {
    const { data, isLoading } = useQuery({
        queryKey: ['v3-overview', chainId],
        queryFn: async () => {
            const res = await fetch(`${API_URL}/api/v3/overview?chainId=${chainId}`);
            return res.json() as Promise<PlatformOverview>;
        },
        refetchInterval: 60000,
        staleTime: 30000,
    });
    return { overview: data || null, loading: isLoading };
}

// ============================================================
// Phase 2: Intelligence Layer API Hooks
// ============================================================

// Types
export interface SimulationResult {
    id: number;
    intentId: string;
    chainId: number;
    routeType: string;
    routeSteps: { stepIndex: number; action: string; protocol: string; inputToken: string; outputToken: string; estimatedGas: number; description: string }[];
    predictedOutputUsd: number;
    predictedGas: number;
    predictedGasCostUsd: number;
    predictedSlippage: number;
    predictedProfitUsd: number;
    riskScore: number;
    confidence: number;
    riskFactors: string[];
    aiModel: string;
    aiReasoning: string;
    predictionAccuracy: number | null;
    createdAt: number;
    simulationDurationMs: number;
}

export interface IntentAnnotation {
    id: number;
    intentId: string;
    chainId: number;
    annotationType: string;
    severity: string;
    title: string;
    description: string;
    metadata: string | null;
    aiConfidence: number;
    createdAt: number;
}

export interface CrossChainFlow {
    source: number;
    target: number;
    value: number;
    count: number;
}

export interface AIInsightsData {
    accuracy: {
        totalSimulations: number;
        avgAccuracy: number;
        highConfidenceCount: number;
        avgRiskScore: number;
        avgSimDurationMs: number;
    };
    recentAnnotations: IntentAnnotation[];
    annotationTypes: { type: string; count: number }[];
    routeTypes: { routeType: string; count: number; avgConfidence: number; avgRiskScore: number }[];
}

// Hooks
export function useIntentSimulation(intentId: string) {
    const { data, isLoading } = useQuery({
        queryKey: ['v3-intent-simulation', intentId],
        queryFn: async () => {
            const res = await fetch(`${API_URL}/api/v3/intents/${intentId}/simulation`);
            return res.json() as Promise<{ simulations: SimulationResult[]; annotations: IntentAnnotation[] }>;
        },
        enabled: !!intentId,
        staleTime: 30000,
    });
    return { simulations: data?.simulations || [], annotations: data?.annotations || [], loading: isLoading };
}

export function useCrossChainFlows(days = 30) {
    const { data, isLoading } = useQuery({
        queryKey: ['v3-cross-chain-flows', days],
        queryFn: async () => {
            const res = await fetch(`${API_URL}/api/v3/analytics/cross-chain-flows?days=${days}`);
            return res.json() as Promise<{ flows: CrossChainFlow[]; chains: Record<string, string> }>;
        },
        refetchInterval: 300000,
        staleTime: 120000,
    });
    return { flows: data?.flows || [], chains: data?.chains || {}, loading: isLoading };
}

export function useAIInsights(chainId: number) {
    const { data, isLoading } = useQuery({
        queryKey: ['v3-ai-insights', chainId],
        queryFn: async () => {
            const res = await fetch(`${API_URL}/api/v3/analytics/ai-insights?chainId=${chainId}`);
            return res.json() as Promise<AIInsightsData>;
        },
        refetchInterval: 60000,
        staleTime: 30000,
    });
    return { insights: data || null, loading: isLoading };
}