/**
 * AnomaScan SDK Types — v1.0
 * Complete response types for all API endpoints + Agent Autonomy
 */
interface ApiResponse<T> {
    success: boolean;
    data?: T;
    error?: string;
    pagination?: Pagination;
}
interface Pagination {
    page: number;
    limit: number;
    total: number;
    totalPages: number;
}
interface Intent {
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
interface IntentDetail extends Intent {
    lifecycle: LifecycleEvent[];
    simulation?: SimulationResult;
    correlations?: CrossChainCorrelation[];
    tokenTransfers?: TokenTransfer[];
    payloads?: IntentPayload[];
}
interface LifecycleEvent {
    state: string;
    timestamp: number;
    txHash?: string;
    metadata?: Record<string, any>;
}
interface TokenTransfer {
    tokenAddress: string;
    symbol?: string;
    from: string;
    to: string;
    amount: string;
    amountUsd?: number;
}
interface IntentPayload {
    type: string;
    data: Record<string, any>;
}
interface Solver {
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
interface SolverEconomics {
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
interface SolverEconHistory {
    history: SolverEconHistoryEntry[];
    intentBreakdown: IntentBreakdownEntry[];
    totals: SolverEconTotals;
}
interface SolverEconHistoryEntry {
    period: string;
    intentCount: number;
    totalRevenueUsd: number;
    totalGasCostUsd: number;
    netProfitUsd: number;
    successRate: number;
}
interface IntentBreakdownEntry {
    intentType: string;
    count: number;
    totalVolumeUsd: number;
}
interface SolverEconTotals {
    totalRevenue: number;
    totalGasCost: number;
    netProfit: number;
    totalDays: number;
}
interface CrossChainFlow {
    sourceChain: number;
    targetChain: number;
    volume: number;
    count: number;
}
interface CrossChainCorrelation {
    id: number;
    intentId: string;
    correlatedIntentId: string;
    sourceChain: number;
    targetChain: number;
    confidence: number;
    correlationType: string;
}
interface AIInsight {
    predictionAccuracy: number;
    topOpportunities: Array<{
        type: string;
        description: string;
        estimatedValue: number;
        confidence: number;
    }>;
    recentSimulations: SimulationResult[];
}
interface SimulationResult {
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
interface VolumeAnalytics {
    totalVolume: number;
    intentCount: number;
    avgValue: number;
    timeSeries: Array<{
        timestamp: number;
        volume: number;
        count: number;
    }>;
}
interface IntentTypeDistribution {
    type: string;
    count: number;
    volume: number;
}
interface DemandHeatmap {
    tokenPairs: Array<{
        inputToken: string;
        outputToken: string;
        count: number;
        volume: number;
    }>;
}
interface LifecycleFunnel {
    stages: Array<{
        stage: string;
        count: number;
        percentage: number;
    }>;
}
interface StreamEvent {
    id?: number;
    eventType: 'intent_created' | 'intent_settled' | 'solver_matched' | 'simulation_complete' | 'cross_chain_detected';
    chainId: number;
    payload: Record<string, any>;
    createdAt: number;
}
interface TokenPrice {
    symbol: string;
    priceUsd: number;
    change24h: number;
    marketCap: number;
}
interface ApiKeyInfo {
    keyHash: string;
    name: string;
    tier: string;
    rateLimit: number;
    dailyLimit: number;
    createdAt: number;
    lastUsed: number | null;
    isActive: boolean;
}
interface AgentConfig {
    name: string;
    strategy: 'arbitrage' | 'market_maker' | 'liquidator' | 'mev' | 'custom';
    description?: string;
    walletAddress?: string;
    maxGasPerTx?: number;
    maxDailySpend?: number;
    allowedChains?: number[];
    allowedIntentTypes?: string[];
}
interface Agent {
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
interface AgentExecParams {
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
interface AgentExecResult {
    executionId: string;
    agentId: string;
    status: 'simulated' | 'submitted' | 'confirmed' | 'failed';
    txHash?: string;
    gasUsed?: number;
    result?: Record<string, any>;
    simulation?: SimulationResult;
    createdAt: number;
}
interface AgentHistory {
    executions: AgentExecResult[];
    summary: {
        total: number;
        succeeded: number;
        failed: number;
        totalGasSpent: number;
    };
}
interface AnomaScanClientOptions {
    apiKey?: string;
    baseUrl?: string;
    timeout?: number;
    retryOnRateLimit?: boolean;
    maxRetries?: number;
}
interface ListIntentsParams {
    chainId?: number;
    page?: number;
    limit?: number;
    status?: string;
    type?: string;
    solver?: string;
}
interface ListSolversParams {
    chainId?: number;
    page?: number;
    limit?: number;
    sortBy?: string;
}
interface SolverEconomicsParams {
    chainId?: number;
    days?: number;
    sortBy?: string;
}
interface AnalyticsParams {
    chainId?: number;
    days?: number;
    period?: string;
}
interface SimulateIntentParams {
    inputToken: string;
    outputToken: string;
    amount: string;
    chainId: number;
    maxSlippage?: number;
}

/**
 * AnomaScan SDK v1.0 — Client
 * Zero-dependency TypeScript client for the AnomaScan API.
 * Supports: Intents, Solvers, Analytics, Developer Keys, Streaming, and Agent Autonomy.
 */

declare class AnomaScanClient {
    private baseUrl;
    private apiKey?;
    private timeout;
    private retryOnRateLimit;
    private maxRetries;
    intents: IntentsAPI;
    solvers: SolversAPI;
    analytics: AnalyticsAPI;
    developer: DeveloperAPI;
    stream: StreamAPI;
    agents: AgentAPI;
    prices: PricesAPI;
    constructor(options?: AnomaScanClientOptions);
    request<T>(path: string, options?: RequestInit): Promise<ApiResponse<T>>;
    private sleep;
    getBaseUrl(): string;
}
declare class IntentsAPI {
    private client;
    constructor(client: AnomaScanClient);
    /** List intents with pagination and filtering */
    list(params?: ListIntentsParams): Promise<ApiResponse<Intent[]>>;
    /** Get full intent detail with lifecycle, payloads, and token transfers */
    get(id: string, chainId?: number): Promise<ApiResponse<IntentDetail>>;
    /** Get intent lifecycle events */
    lifecycle(id: string): Promise<ApiResponse<IntentDetail>>;
    /** Get AI simulation results for an intent */
    simulation(id: string): Promise<ApiResponse<SimulationResult>>;
    /** Simulate a hypothetical intent with AI-powered route analysis */
    simulate(params: SimulateIntentParams): Promise<ApiResponse<SimulationResult>>;
}
declare class SolversAPI {
    private client;
    constructor(client: AnomaScanClient);
    /** Solver leaderboard with rankings */
    list(params?: ListSolversParams): Promise<ApiResponse<Solver[]>>;
    /** Detailed solver profile */
    get(address: string, chainId?: number): Promise<ApiResponse<Solver>>;
    /** Solver economics — P&L, ROI, success rate leaderboard */
    economics(params?: SolverEconomicsParams): Promise<ApiResponse<SolverEconomics[]>>;
    /** Historical economic data for a specific solver */
    economicHistory(address: string, chainId?: number): Promise<ApiResponse<SolverEconHistory>>;
}
declare class AnalyticsAPI {
    private client;
    constructor(client: AnomaScanClient);
    /** Volume metrics over time */
    volume(params?: AnalyticsParams): Promise<ApiResponse<VolumeAnalytics>>;
    /** Cross-chain value flow data for Sankey visualization */
    crossChainFlows(params?: AnalyticsParams): Promise<ApiResponse<CrossChainFlow[]>>;
    /** Aggregated AI prediction accuracy and insights */
    aiInsights(params?: AnalyticsParams): Promise<ApiResponse<AIInsight>>;
    /** Distribution of intent types */
    intentTypes(params?: AnalyticsParams): Promise<ApiResponse<IntentTypeDistribution[]>>;
    /** Demand heatmap — hot token pairs and routes */
    demandHeatmap(params?: AnalyticsParams): Promise<ApiResponse<DemandHeatmap>>;
    /** Intent lifecycle funnel — conversion at each stage */
    lifecycleFunnel(params?: AnalyticsParams): Promise<ApiResponse<LifecycleFunnel>>;
}
declare class DeveloperAPI {
    private client;
    constructor(client: AnomaScanClient);
    /** Create a new API key (shown only once) */
    createKey(userId: string, name: string): Promise<ApiResponse<{
        key: string;
        keyHash: string;
    }>>;
    /** List your API keys */
    listKeys(userId: string): Promise<ApiResponse<ApiKeyInfo[]>>;
    /** Revoke an API key */
    revokeKey(keyHash: string, userId: string): Promise<ApiResponse<void>>;
    /** Get usage analytics for a key */
    getUsage(keyHash: string, days?: number): Promise<ApiResponse<any>>;
    /** Full API reference catalog */
    getCatalog(): Promise<ApiResponse<any>>;
}
declare class StreamAPI {
    private client;
    constructor(client: AnomaScanClient);
    /** Get events via polling (Node.js + Browser) */
    getEvents(since?: number, type?: string): Promise<ApiResponse<StreamEvent[]>>;
    /**
     * Subscribe to SSE events (browser only).
     * Returns a cleanup function to stop listening.
     */
    subscribe(onEvent: (event: StreamEvent) => void, options?: {
        types?: string[];
        since?: number;
    }): () => void;
}
declare class AgentAPI {
    private client;
    constructor(client: AnomaScanClient);
    /**
     * Register a new autonomous agent.
     * Returns the agent ID and provisioned wallet address.
     */
    register(config: AgentConfig): Promise<ApiResponse<Agent>>;
    /**
     * Execute an intent through an agent.
     * If `simulate` is true, runs AI simulation first without submitting.
     */
    execute(params: AgentExecParams): Promise<ApiResponse<AgentExecResult>>;
    /** Get agent status and runtime data */
    status(agentId: string): Promise<ApiResponse<Agent>>;
    /** Get execution history for an agent */
    history(agentId: string, limit?: number): Promise<ApiResponse<AgentHistory>>;
    /** Pause an agent's autonomous execution */
    pause(agentId: string): Promise<ApiResponse<Agent>>;
    /** Resume a paused agent */
    resume(agentId: string): Promise<ApiResponse<Agent>>;
}
declare class PricesAPI {
    private client;
    constructor(client: AnomaScanClient);
    /** Get all cached token prices */
    getAll(): Promise<ApiResponse<Record<string, TokenPrice>>>;
    /** Get price for a specific token symbol */
    get(symbol: string): Promise<TokenPrice | null>;
}

export { type AIInsight, type Agent, type AgentConfig, type AgentExecParams, type AgentExecResult, type AgentHistory, type AnalyticsParams, AnomaScanClient, type AnomaScanClientOptions, type ApiKeyInfo, type ApiResponse, type CrossChainCorrelation, type CrossChainFlow, type DemandHeatmap, type Intent, type IntentBreakdownEntry, type IntentDetail, type IntentPayload, type IntentTypeDistribution, type LifecycleEvent, type LifecycleFunnel, type ListIntentsParams, type ListSolversParams, type Pagination, type SimulateIntentParams, type SimulationResult, type Solver, type SolverEconHistory, type SolverEconHistoryEntry, type SolverEconTotals, type SolverEconomics, type SolverEconomicsParams, type StreamEvent, type TokenPrice, type TokenTransfer, type VolumeAnalytics };
