// src/client.ts
var DEFAULT_BASE_URL = "https://anomapay-explorer.bidurandblog.workers.dev/api/v3";
var DEFAULT_TIMEOUT = 15e3;
var MAX_RETRIES = 3;
var AnomaScanClient = class {
  constructor(options = {}) {
    this.baseUrl = (options.baseUrl || DEFAULT_BASE_URL).replace(/\/$/, "");
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
    this.prices = new PricesAPI(this);
  }
  /* ── HTTP Core ── */
  async request(path, options = {}) {
    const url = `${this.baseUrl}${path}`;
    const headers = {
      "Content-Type": "application/json",
      ...options.headers || {}
    };
    if (this.apiKey) {
      headers["X-API-Key"] = this.apiKey;
    }
    let lastError = null;
    for (let attempt = 0; attempt <= this.maxRetries; attempt++) {
      try {
        const controller = new AbortController();
        const timeoutId = setTimeout(() => controller.abort(), this.timeout);
        const response = await fetch(url, {
          ...options,
          headers,
          signal: controller.signal
        });
        clearTimeout(timeoutId);
        if (response.status === 429 && this.retryOnRateLimit && attempt < this.maxRetries) {
          const retryAfter = parseInt(response.headers.get("Retry-After") || "2", 10);
          await this.sleep(retryAfter * 1e3);
          continue;
        }
        const data = await response.json();
        return data;
      } catch (err) {
        lastError = err;
        if (attempt < this.maxRetries) {
          await this.sleep(1e3 * Math.pow(2, attempt));
        }
      }
    }
    return { success: false, error: lastError?.message || "Request failed" };
  }
  sleep(ms) {
    return new Promise((resolve) => setTimeout(resolve, ms));
  }
  /* ── Public helpers ── */
  getBaseUrl() {
    return this.baseUrl;
  }
};
var IntentsAPI = class {
  constructor(client) {
    this.client = client;
  }
  /** List intents with pagination and filtering */
  async list(params = {}) {
    const qs = toQueryString(params);
    return this.client.request(`/intents${qs}`);
  }
  /** Get full intent detail with lifecycle, payloads, and token transfers */
  async get(id, chainId) {
    const qs = chainId ? `?chainId=${chainId}` : "";
    return this.client.request(`/intents/${id}${qs}`);
  }
  /** Get intent lifecycle events */
  async lifecycle(id) {
    return this.client.request(`/intents/${id}/lifecycle`);
  }
  /** Get AI simulation results for an intent */
  async simulation(id) {
    return this.client.request(`/intents/${id}/simulation`);
  }
  /** Simulate a hypothetical intent with AI-powered route analysis */
  async simulate(params) {
    return this.client.request("/intents/simulate", {
      method: "POST",
      body: JSON.stringify(params)
    });
  }
};
var SolversAPI = class {
  constructor(client) {
    this.client = client;
  }
  /** Solver leaderboard with rankings */
  async list(params = {}) {
    const qs = toQueryString(params);
    return this.client.request(`/solvers${qs}`);
  }
  /** Detailed solver profile */
  async get(address, chainId) {
    const qs = chainId ? `?chainId=${chainId}` : "";
    return this.client.request(`/solvers/${address}${qs}`);
  }
  /** Solver economics — P&L, ROI, success rate leaderboard */
  async economics(params = {}) {
    const qs = toQueryString(params);
    return this.client.request(`/solvers/economics${qs}`);
  }
  /** Historical economic data for a specific solver */
  async economicHistory(address, chainId) {
    const qs = chainId ? `?chainId=${chainId}` : "";
    return this.client.request(`/solvers/${address}/economics${qs}`);
  }
};
var AnalyticsAPI = class {
  constructor(client) {
    this.client = client;
  }
  /** Volume metrics over time */
  async volume(params = {}) {
    const qs = toQueryString(params);
    return this.client.request(`/analytics/volume${qs}`);
  }
  /** Cross-chain value flow data for Sankey visualization */
  async crossChainFlows(params = {}) {
    const qs = toQueryString(params);
    return this.client.request(`/analytics/cross-chain-flows${qs}`);
  }
  /** Aggregated AI prediction accuracy and insights */
  async aiInsights(params = {}) {
    const qs = toQueryString(params);
    return this.client.request(`/analytics/ai-insights${qs}`);
  }
  /** Distribution of intent types */
  async intentTypes(params = {}) {
    const qs = toQueryString(params);
    return this.client.request(`/analytics/intent-types${qs}`);
  }
  /** Demand heatmap — hot token pairs and routes */
  async demandHeatmap(params = {}) {
    const qs = toQueryString(params);
    return this.client.request(`/analytics/demand-heatmap${qs}`);
  }
  /** Intent lifecycle funnel — conversion at each stage */
  async lifecycleFunnel(params = {}) {
    const qs = toQueryString(params);
    return this.client.request(`/analytics/lifecycle-funnel${qs}`);
  }
};
var DeveloperAPI = class {
  constructor(client) {
    this.client = client;
  }
  /** Create a new API key (shown only once) */
  async createKey(userId, name) {
    return this.client.request("/developer/keys", {
      method: "POST",
      body: JSON.stringify({ userId, name })
    });
  }
  /** List your API keys */
  async listKeys(userId) {
    return this.client.request(`/developer/keys?userId=${userId}`);
  }
  /** Revoke an API key */
  async revokeKey(keyHash, userId) {
    return this.client.request("/developer/keys/revoke", {
      method: "POST",
      body: JSON.stringify({ keyHash, userId })
    });
  }
  /** Get usage analytics for a key */
  async getUsage(keyHash, days) {
    const qs = days ? `?keyHash=${keyHash}&days=${days}` : `?keyHash=${keyHash}`;
    return this.client.request(`/developer/keys/usage${qs}`);
  }
  /** Full API reference catalog */
  async getCatalog() {
    return this.client.request("/developer/catalog");
  }
};
var StreamAPI = class {
  constructor(client) {
    this.client = client;
  }
  /** Get events via polling (Node.js + Browser) */
  async getEvents(since = 0, type) {
    let qs = `?format=json&since=${since}`;
    if (type) qs += `&type=${type}`;
    return this.client.request(`/stream/events${qs}`);
  }
  /**
   * Subscribe to SSE events (browser only).
   * Returns a cleanup function to stop listening.
   */
  subscribe(onEvent, options = {}) {
    if (typeof EventSource === "undefined") {
      throw new Error("EventSource not available. Use getEvents() for polling in Node.js.");
    }
    let lastTs = options.since || 0;
    const baseUrl = this.client.getBaseUrl();
    let es;
    let stopped = false;
    const connect = () => {
      if (stopped) return;
      es = new EventSource(`${baseUrl}/stream/events?since=${lastTs}`);
      const types = options.types || ["intent_created", "intent_settled", "solver_matched", "simulation_complete", "cross_chain_detected"];
      types.forEach((type) => {
        es.addEventListener(type, ((e) => {
          const me = e;
          try {
            const data = JSON.parse(me.data);
            const evt = {
              eventType: type,
              chainId: data.chainId,
              payload: data,
              createdAt: data.timestamp || Math.floor(Date.now() / 1e3)
            };
            onEvent(evt);
            if (evt.createdAt > lastTs) lastTs = evt.createdAt;
          } catch {
          }
        }));
      });
      es.addEventListener("sync", ((e) => {
        const me = e;
        try {
          const data = JSON.parse(me.data);
          if (data.latestTimestamp > lastTs) lastTs = data.latestTimestamp;
        } catch {
        }
      }));
      es.onerror = () => {
        es.close();
        if (!stopped) setTimeout(connect, 3e3);
      };
    };
    connect();
    return () => {
      stopped = true;
      if (es) es.close();
    };
  }
};
var AgentAPI = class {
  constructor(client) {
    this.client = client;
  }
  /**
   * Register a new autonomous agent.
   * Returns the agent ID and provisioned wallet address.
   */
  async register(config) {
    return this.client.request("/agents/register", {
      method: "POST",
      body: JSON.stringify(config)
    });
  }
  /**
   * Execute an intent through an agent.
   * If `simulate` is true, runs AI simulation first without submitting.
   */
  async execute(params) {
    return this.client.request("/agents/execute", {
      method: "POST",
      body: JSON.stringify(params)
    });
  }
  /** Get agent status and runtime data */
  async status(agentId) {
    return this.client.request(`/agents/${agentId}/status`);
  }
  /** Get execution history for an agent */
  async history(agentId, limit) {
    const qs = limit ? `?limit=${limit}` : "";
    return this.client.request(`/agents/${agentId}/history${qs}`);
  }
  /** Pause an agent's autonomous execution */
  async pause(agentId) {
    return this.client.request(`/agents/${agentId}/pause`, { method: "POST" });
  }
  /** Resume a paused agent */
  async resume(agentId) {
    return this.client.request(`/agents/${agentId}/resume`, { method: "POST" });
  }
};
function toQueryString(params) {
  const entries = Object.entries(params).filter(([_, v]) => v !== void 0 && v !== null);
  if (entries.length === 0) return "";
  return "?" + entries.map(([k, v]) => `${encodeURIComponent(k)}=${encodeURIComponent(v)}`).join("&");
}
var PricesAPI = class {
  constructor(client) {
    this.client = client;
  }
  /** Get all cached token prices */
  async getAll() {
    return this.client.request("/prices", {
      // Prices endpoint is at the root API level, not /v3
    });
  }
  /** Get price for a specific token symbol */
  async get(symbol) {
    const result = await this.getAll();
    if (result.success && result.data) {
      return result.data[symbol.toUpperCase()] || null;
    }
    return null;
  }
};
export {
  AnomaScanClient
};
