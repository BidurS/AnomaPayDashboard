/**
 * AnomaScan SDK v1.0 — Client
 * Zero-dependency TypeScript client for the AnomaScan API.
 * Supports: Intents, Solvers, Analytics, Developer Keys, Streaming, and Agent Autonomy.
 */
import type {
    AnomaScanClientOptions,
    ApiResponse,
    Intent,
    IntentDetail,
    Solver,
    SolverEconomics,
    SolverEconHistory,
    CrossChainFlow,
    AIInsight,
    SimulationResult,
    VolumeAnalytics,
    IntentTypeDistribution,
    DemandHeatmap,
    LifecycleFunnel,
    StreamEvent,
    ApiKeyInfo,
    Agent,
    AgentConfig,
    AgentExecParams,
    AgentExecResult,
    AgentHistory,
    ListIntentsParams,
    ListSolversParams,
    SolverEconomicsParams,
    AnalyticsParams,
    SimulateIntentParams,
} from './types';

const DEFAULT_BASE_URL = 'https://anomapay-explorer.bidurandblog.workers.dev/api/v3';
const DEFAULT_TIMEOUT = 15000;
const MAX_RETRIES = 3;

export class AnomaScanClient {
    private baseUrl: string;
    private apiKey?: string;
    private timeout: number;
    private retryOnRateLimit: boolean;
    private maxRetries: number;

    /* ── Sub-modules ── */
    public intents: IntentsAPI;
    public solvers: SolversAPI;
    public analytics: AnalyticsAPI;
    public developer: DeveloperAPI;
    public stream: StreamAPI;
    public agents: AgentAPI;

    constructor(options: AnomaScanClientOptions = {}) {
        this.baseUrl = (options.baseUrl || DEFAULT_BASE_URL).replace(/\/$/, '');
        this.apiKey = options.apiKey;
        this.timeout = options.timeout || DEFAULT_TIMEOUT;
        this.retryOnRateLimit = options.retryOnRateLimit !== false;
        this.maxRetries = options.maxRetries || MAX_RETRIES;

        this.intents = new IntentsAPI(this);
        this.solvers = new SolversAPI(this);
        this.analytics = new AnalyticsAPI(this);
        this.developer = new DeveloperAPI(this);
        this.stream = new StreamAPI(this);
        this.agents = new AgentAPI(this);
    }

    /* ── HTTP Core ── */
    async request<T>(path: string, options: RequestInit = {}): Promise<ApiResponse<T>> {
        const url = `${this.baseUrl}${path}`;
        const headers: Record<string, string> = {
            'Content-Type': 'application/json',
            ...(options.headers as Record<string, string> || {}),
        };

        if (this.apiKey) {
            headers['X-API-Key'] = this.apiKey;
        }

        let lastError: Error | null = null;

        for (let attempt = 0; attempt <= this.maxRetries; attempt++) {
            try {
                const controller = new AbortController();
                const timeoutId = setTimeout(() => controller.abort(), this.timeout);

                const response = await fetch(url, {
                    ...options,
                    headers,
                    signal: controller.signal,
                });

                clearTimeout(timeoutId);

                // Rate limit handling with exponential backoff
                if (response.status === 429 && this.retryOnRateLimit && attempt < this.maxRetries) {
                    const retryAfter = parseInt(response.headers.get('Retry-After') || '2', 10);
                    await this.sleep(retryAfter * 1000);
                    continue;
                }

                const data = await response.json() as ApiResponse<T>;
                return data;
            } catch (err) {
                lastError = err as Error;
                if (attempt < this.maxRetries) {
                    await this.sleep(1000 * Math.pow(2, attempt));
                }
            }
        }

        return { success: false, error: lastError?.message || 'Request failed' };
    }

    private sleep(ms: number): Promise<void> {
        return new Promise(resolve => setTimeout(resolve, ms));
    }

    /* ── Public helpers ── */
    getBaseUrl(): string { return this.baseUrl; }
}

/* ═══════════════════ Intents Module ═══════════════════ */
class IntentsAPI {
    constructor(private client: AnomaScanClient) { }

    /** List intents with pagination and filtering */
    async list(params: ListIntentsParams = {}): Promise<ApiResponse<Intent[]>> {
        const qs = toQueryString(params);
        return this.client.request<Intent[]>(`/intents${qs}`);
    }

    /** Get full intent detail with lifecycle, payloads, and token transfers */
    async get(id: string, chainId?: number): Promise<ApiResponse<IntentDetail>> {
        const qs = chainId ? `?chainId=${chainId}` : '';
        return this.client.request<IntentDetail>(`/intents/${id}${qs}`);
    }

    /** Get intent lifecycle events */
    async lifecycle(id: string): Promise<ApiResponse<IntentDetail>> {
        return this.client.request<IntentDetail>(`/intents/${id}/lifecycle`);
    }

    /** Get AI simulation results for an intent */
    async simulation(id: string): Promise<ApiResponse<SimulationResult>> {
        return this.client.request<SimulationResult>(`/intents/${id}/simulation`);
    }

    /** Simulate a hypothetical intent with AI-powered route analysis */
    async simulate(params: SimulateIntentParams): Promise<ApiResponse<SimulationResult>> {
        return this.client.request<SimulationResult>('/intents/simulate', {
            method: 'POST',
            body: JSON.stringify(params),
        });
    }
}

/* ═══════════════════ Solvers Module ═══════════════════ */
class SolversAPI {
    constructor(private client: AnomaScanClient) { }

    /** Solver leaderboard with rankings */
    async list(params: ListSolversParams = {}): Promise<ApiResponse<Solver[]>> {
        const qs = toQueryString(params);
        return this.client.request<Solver[]>(`/solvers${qs}`);
    }

    /** Detailed solver profile */
    async get(address: string, chainId?: number): Promise<ApiResponse<Solver>> {
        const qs = chainId ? `?chainId=${chainId}` : '';
        return this.client.request<Solver>(`/solvers/${address}${qs}`);
    }

    /** Solver economics — P&L, ROI, success rate leaderboard */
    async economics(params: SolverEconomicsParams = {}): Promise<ApiResponse<SolverEconomics[]>> {
        const qs = toQueryString(params);
        return this.client.request<SolverEconomics[]>(`/solvers/economics${qs}`);
    }

    /** Historical economic data for a specific solver */
    async economicHistory(address: string, chainId?: number): Promise<ApiResponse<SolverEconHistory>> {
        const qs = chainId ? `?chainId=${chainId}` : '';
        return this.client.request<SolverEconHistory>(`/solvers/${address}/economics${qs}`);
    }
}

/* ═══════════════════ Analytics Module ═══════════════════ */
class AnalyticsAPI {
    constructor(private client: AnomaScanClient) { }

    /** Volume metrics over time */
    async volume(params: AnalyticsParams = {}): Promise<ApiResponse<VolumeAnalytics>> {
        const qs = toQueryString(params);
        return this.client.request<VolumeAnalytics>(`/analytics/volume${qs}`);
    }

    /** Cross-chain value flow data for Sankey visualization */
    async crossChainFlows(params: AnalyticsParams = {}): Promise<ApiResponse<CrossChainFlow[]>> {
        const qs = toQueryString(params);
        return this.client.request<CrossChainFlow[]>(`/analytics/cross-chain-flows${qs}`);
    }

    /** Aggregated AI prediction accuracy and insights */
    async aiInsights(params: AnalyticsParams = {}): Promise<ApiResponse<AIInsight>> {
        const qs = toQueryString(params);
        return this.client.request<AIInsight>(`/analytics/ai-insights${qs}`);
    }

    /** Distribution of intent types */
    async intentTypes(params: AnalyticsParams = {}): Promise<ApiResponse<IntentTypeDistribution[]>> {
        const qs = toQueryString(params);
        return this.client.request<IntentTypeDistribution[]>(`/analytics/intent-types${qs}`);
    }

    /** Demand heatmap — hot token pairs and routes */
    async demandHeatmap(params: AnalyticsParams = {}): Promise<ApiResponse<DemandHeatmap>> {
        const qs = toQueryString(params);
        return this.client.request<DemandHeatmap>(`/analytics/demand-heatmap${qs}`);
    }

    /** Intent lifecycle funnel — conversion at each stage */
    async lifecycleFunnel(params: AnalyticsParams = {}): Promise<ApiResponse<LifecycleFunnel>> {
        const qs = toQueryString(params);
        return this.client.request<LifecycleFunnel>(`/analytics/lifecycle-funnel${qs}`);
    }
}

/* ═══════════════════ Developer Module ═══════════════════ */
class DeveloperAPI {
    constructor(private client: AnomaScanClient) { }

    /** Create a new API key (shown only once) */
    async createKey(userId: string, name: string): Promise<ApiResponse<{ key: string; keyHash: string }>> {
        return this.client.request('/developer/keys', {
            method: 'POST',
            body: JSON.stringify({ userId, name }),
        });
    }

    /** List your API keys */
    async listKeys(userId: string): Promise<ApiResponse<ApiKeyInfo[]>> {
        return this.client.request<ApiKeyInfo[]>(`/developer/keys?userId=${userId}`);
    }

    /** Revoke an API key */
    async revokeKey(keyHash: string, userId: string): Promise<ApiResponse<void>> {
        return this.client.request('/developer/keys/revoke', {
            method: 'POST',
            body: JSON.stringify({ keyHash, userId }),
        });
    }

    /** Get usage analytics for a key */
    async getUsage(keyHash: string, days?: number): Promise<ApiResponse<any>> {
        const qs = days ? `?keyHash=${keyHash}&days=${days}` : `?keyHash=${keyHash}`;
        return this.client.request(`/developer/keys/usage${qs}`);
    }

    /** Full API reference catalog */
    async getCatalog(): Promise<ApiResponse<any>> {
        return this.client.request('/developer/catalog');
    }
}

/* ═══════════════════ Stream Module ═══════════════════ */
class StreamAPI {
    constructor(private client: AnomaScanClient) { }

    /** Get events via polling (Node.js + Browser) */
    async getEvents(since: number = 0, type?: string): Promise<ApiResponse<StreamEvent[]>> {
        let qs = `?format=json&since=${since}`;
        if (type) qs += `&type=${type}`;
        return this.client.request<StreamEvent[]>(`/stream/events${qs}`);
    }

    /**
     * Subscribe to SSE events (browser only).
     * Returns a cleanup function to stop listening.
     */
    subscribe(
        onEvent: (event: StreamEvent) => void,
        options: { types?: string[]; since?: number } = {}
    ): () => void {
        if (typeof EventSource === 'undefined') {
            throw new Error('EventSource not available. Use getEvents() for polling in Node.js.');
        }

        let lastTs = options.since || 0;
        const baseUrl = this.client.getBaseUrl();
        let es: EventSource;
        let stopped = false;

        const connect = () => {
            if (stopped) return;
            es = new EventSource(`${baseUrl}/stream/events?since=${lastTs}`);

            const types = options.types || ['intent_created', 'intent_settled', 'solver_matched', 'simulation_complete', 'cross_chain_detected'];

            types.forEach(type => {
                es.addEventListener(type, ((e: Event) => {
                    const me = e as MessageEvent;
                    try {
                        const data = JSON.parse(me.data);
                        const evt: StreamEvent = {
                            eventType: type as StreamEvent['eventType'],
                            chainId: data.chainId,
                            payload: data,
                            createdAt: data.timestamp || Math.floor(Date.now() / 1000),
                        };
                        onEvent(evt);
                        if (evt.createdAt > lastTs) lastTs = evt.createdAt;
                    } catch { /* skip */ }
                }) as EventListener);
            });

            es.addEventListener('sync', ((e: Event) => {
                const me = e as MessageEvent;
                try {
                    const data = JSON.parse(me.data);
                    if (data.latestTimestamp > lastTs) lastTs = data.latestTimestamp;
                } catch { /* skip */ }
            }) as EventListener);

            es.onerror = () => {
                es.close();
                if (!stopped) setTimeout(connect, 3000);
            };
        };

        connect();

        return () => {
            stopped = true;
            if (es) es.close();
        };
    }
}

/* ═══════════════════ Agent Module ═══════════════════ */
class AgentAPI {
    constructor(private client: AnomaScanClient) { }

    /**
     * Register a new autonomous agent.
     * Returns the agent ID and provisioned wallet address.
     */
    async register(config: AgentConfig): Promise<ApiResponse<Agent>> {
        return this.client.request<Agent>('/agents/register', {
            method: 'POST',
            body: JSON.stringify(config),
        });
    }

    /**
     * Execute an intent through an agent.
     * If `simulate` is true, runs AI simulation first without submitting.
     */
    async execute(params: AgentExecParams): Promise<ApiResponse<AgentExecResult>> {
        return this.client.request<AgentExecResult>('/agents/execute', {
            method: 'POST',
            body: JSON.stringify(params),
        });
    }

    /** Get agent status and runtime data */
    async status(agentId: string): Promise<ApiResponse<Agent>> {
        return this.client.request<Agent>(`/agents/${agentId}/status`);
    }

    /** Get execution history for an agent */
    async history(agentId: string, limit?: number): Promise<ApiResponse<AgentHistory>> {
        const qs = limit ? `?limit=${limit}` : '';
        return this.client.request<AgentHistory>(`/agents/${agentId}/history${qs}`);
    }

    /** Pause an agent's autonomous execution */
    async pause(agentId: string): Promise<ApiResponse<Agent>> {
        return this.client.request<Agent>(`/agents/${agentId}/pause`, { method: 'POST' });
    }

    /** Resume a paused agent */
    async resume(agentId: string): Promise<ApiResponse<Agent>> {
        return this.client.request<Agent>(`/agents/${agentId}/resume`, { method: 'POST' });
    }
}

/* ── Utility ── */
function toQueryString(params: Record<string, any>): string {
    const entries = Object.entries(params).filter(([_, v]) => v !== undefined && v !== null);
    if (entries.length === 0) return '';
    return '?' + entries.map(([k, v]) => `${encodeURIComponent(k)}=${encodeURIComponent(v)}`).join('&');
}
