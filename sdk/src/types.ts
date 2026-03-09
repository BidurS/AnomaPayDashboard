/**
 * AnomaScan SDK Types — v1.0
 * Complete response types for all API endpoints + Agent Autonomy
 */

/* ── Common ── */
export interface ApiResponse<T> {
    success: boolean;
    data?: T;
    error?: string;
    pagination?: Pagination;
}

export interface Pagination {
    page: number;
    limit: number;
    total: number;
    totalPages: number;
}

/* ── Intents ── */
export interface Intent {
    id: string;
    txHash: string;
    chainId: number;
    blockNumber: number;
    timestamp: number;
    from: string;
    to: string;
    value: string;
    method: string;
    status: 'pending' | 'matched' | 'settling' | 'settled' | 'failed';
    type: 'swap' | 'bridge' | 'transfer' | 'resource' | 'discovery';
    solver?: string;
    gasUsed?: number;
    gasPrice?: string;
}

export interface IntentDetail extends Intent {
    lifecycle: LifecycleEvent[];
    simulation?: SimulationResult;
    correlations?: CrossChainCorrelation[];
    tokenTransfers?: TokenTransfer[];
    payloads?: IntentPayload[];
}

export interface LifecycleEvent {
    state: string;
    timestamp: number;
    txHash?: string;
    metadata?: Record<string, any>;
}

export interface TokenTransfer {
    tokenAddress: string;
    symbol?: string;
    from: string;
    to: string;
    amount: string;
    amountUsd?: number;
}

export interface IntentPayload {
    type: string;
    data: Record<string, any>;
}

/* ── Solvers ── */
export interface Solver {
    address: string;
    chainId: number;
    totalSolved: number;
    successRate: number;
    totalValueUsd: number;
    avgGasCost: number;
    profitLoss: number;
    rank: number;
    firstSeen: number;
    lastActive: number;
    /** Reputation data (available when fetching with chainId=0) */
    reputationScore?: number;
    reputationTier?: 'Bronze' | 'Silver' | 'Gold' | 'Diamond';
    reputationBreakdown?: {
        volume: number;
        activity: number;
        consistency: number;
        chainDiversity: number;
        longevity: number;
    };
    chainBreakdown?: Array<{
        chainId: number;
        chainName: string;
        txCount: number;
        gasSpent: number;
    }>;
    badges?: string[];
}

export interface SolverEconomics {
    address: string;
    intentCount: number;
    totalRevenueUsd: number;
    totalGasCostUsd: number;
    netProfitUsd: number;
    roiPercent: number;
    successRate: number;
    activeDays: number;
    avgRevenuePerIntent: number;
}

export interface SolverEconHistory {
    history: SolverEconHistoryEntry[];
    intentBreakdown: IntentBreakdownEntry[];
    totals: SolverEconTotals;
}

export interface SolverEconHistoryEntry {
    period: string;
    intentCount: number;
    totalRevenueUsd: number;
    totalGasCostUsd: number;
    netProfitUsd: number;
    successRate: number;
}

export interface IntentBreakdownEntry {
    intentType: string;
    count: number;
    totalVolumeUsd: number;
}

export interface SolverEconTotals {
    totalRevenue: number;
    totalGasCost: number;
    netProfit: number;
    totalDays: number;
}

/* ── Analytics ── */
export interface CrossChainFlow {
    sourceChain: number;
    targetChain: number;
    volume: number;
    count: number;
}

export interface CrossChainCorrelation {
    id: number;
    intentId: string;
    correlatedIntentId: string;
    sourceChain: number;
    targetChain: number;
    confidence: number;
    correlationType: string;
}

export interface AIInsight {
    predictionAccuracy: number;
    topOpportunities: Array<{
        type: string;
        description: string;
        estimatedValue: number;
        confidence: number;
    }>;
    recentSimulations: SimulationResult[];
}

export interface SimulationResult {
    intentId: string;
    predictedOutput: string;
    predictedGas: number;
    riskScore: number;
    routes: Array<{
        type: string;
        path: string[];
        estimatedOutput: string;
        confidence: number;
    }>;
    accuracy?: number;
}

export interface VolumeAnalytics {
    totalVolume: number;
    intentCount: number;
    avgValue: number;
    timeSeries: Array<{
        timestamp: number;
        volume: number;
        count: number;
    }>;
}

export interface IntentTypeDistribution {
    type: string;
    count: number;
    volume: number;
}

export interface DemandHeatmap {
    tokenPairs: Array<{
        inputToken: string;
        outputToken: string;
        count: number;
        volume: number;
    }>;
}

export interface LifecycleFunnel {
    stages: Array<{
        stage: string;
        count: number;
        percentage: number;
    }>;
}

/* ── Streaming ── */
export interface StreamEvent {
    id?: number;
    eventType: 'intent_created' | 'intent_settled' | 'solver_matched' | 'simulation_complete' | 'cross_chain_detected';
    chainId: number;
    payload: Record<string, any>;
    createdAt: number;
}

/* ── Prices ── */
export interface TokenPrice {
    symbol: string;
    priceUsd: number;
    change24h: number;
    marketCap: number;
}

/* ── API Key ── */
export interface ApiKeyInfo {
    keyHash: string;
    name: string;
    tier: string;
    rateLimit: number;
    dailyLimit: number;
    createdAt: number;
    lastUsed: number | null;
    isActive: boolean;
}

/* ── Agent Autonomy ── */
export interface AgentConfig {
    name: string;
    strategy: 'arbitrage' | 'market_maker' | 'liquidator' | 'mev' | 'custom';
    description?: string;
    walletAddress?: string;
    maxGasPerTx?: number;
    maxDailySpend?: number;
    allowedChains?: number[];
    allowedIntentTypes?: string[];
}

export interface Agent {
    id: string;
    name: string;
    strategy: string;
    walletAddress: string;
    status: 'active' | 'paused' | 'disabled';
    totalExecutions: number;
    successRate: number;
    totalGasSpent: number;
    createdAt: number;
    lastActive: number;
}

export interface AgentExecParams {
    agentId: string;
    chainId: number;
    intentType: 'swap' | 'bridge' | 'transfer' | 'resource' | 'discovery';
    params: {
        inputToken?: string;
        outputToken?: string;
        amount?: string;
        recipient?: string;
        maxSlippage?: number;
        [key: string]: any;
    };
    simulate?: boolean;
}

export interface AgentExecResult {
    executionId: string;
    agentId: string;
    status: 'simulated' | 'submitted' | 'confirmed' | 'failed';
    txHash?: string;
    gasUsed?: number;
    result?: Record<string, any>;
    simulation?: SimulationResult;
    createdAt: number;
}

export interface AgentHistory {
    executions: AgentExecResult[];
    summary: {
        total: number;
        succeeded: number;
        failed: number;
        totalGasSpent: number;
    };
}

/* ── Client Options ── */
export interface AnomaScanClientOptions {
    apiKey?: string;
    baseUrl?: string;
    timeout?: number;
    retryOnRateLimit?: boolean;
    maxRetries?: number;
}

export interface ListIntentsParams {
    chainId?: number;
    page?: number;
    limit?: number;
    status?: string;
    type?: string;
    solver?: string;
}

export interface ListSolversParams {
    chainId?: number;
    page?: number;
    limit?: number;
    sortBy?: string;
}

export interface SolverEconomicsParams {
    chainId?: number;
    days?: number;
    sortBy?: string;
}

export interface AnalyticsParams {
    chainId?: number;
    days?: number;
    period?: string;
}

export interface SimulateIntentParams {
    inputToken: string;
    outputToken: string;
    amount: string;
    chainId: number;
    maxSlippage?: number;
}
