import { Hono } from 'hono';
import { cors } from 'hono/cors';
import { createDb } from './db';
import { runBlockscoutIndexer, runDeepBackfill } from './services/blockscoutIndexer';
import { runIndexer, syncBlockRange } from './services/indexer';
import { processLifecycleForNewEvents, computeSolverEconomics } from './services/lifecycleEngine';
import { processSimulationsForNewIntents, backfillAccuracy } from './services/simulationEngine';
import { findCrossChainCorrelations } from './services/correlationEngine';
import { handleSSEStream, getRecentEvents, pushIndexerEvents, cleanupOldEvents } from './services/eventStream';
import { withCache } from './utils/cache';
import { sendDiscordAlert } from './utils/alerts';
import { chainIdSchema, daysSchema, txHashSchema, addressSchema, parseQueryParam } from './utils/validators';
import { rpcRequest } from './utils/rpc';
import * as schema from './db/schema';
import { eq } from 'drizzle-orm';
import * as chainController from './controllers/chainController';
import * as statsController from './controllers/statsController';
import * as transactionController from './controllers/transactionController';
import * as solverController from './controllers/solverController';
import * as adminController from './controllers/adminController';
import * as intentController from './controllers/intentController';
import * as developerController from './controllers/developerController';
import * as solverLabelController from './controllers/solverLabelController';
import * as searchController from './controllers/searchController';
import * as healthController from './controllers/healthController';
import * as agentController from './controllers/agentController';

export interface Env {
  DB: D1Database;
  ADMIN_API_KEY?: string;
  DISCORD_WEBHOOK_URL?: string;
  GEMINI_API_KEY?: string;
  PRIVY_APP_ID?: string;
  PRIVY_APP_SECRET?: string;
}

const app = new Hono<{ Bindings: Env }>();

// Middleware: CORS - Restrict to prevent unauthorized API consumption
app.use('/*', cors({
  origin: (origin) => {
    // Allow local development and the specific production domains
    if (!origin || origin.includes('localhost') || origin.includes('127.0.0.1') || origin === 'https://anomapay-explorer.pages.dev' || origin.endsWith('.anomapay-explorer.pages.dev') || origin === 'https://gnoma.eth.limo' || origin.endsWith('.eth.limo')) {
      return origin;
    }
    return 'https://anomapay-explorer.pages.dev';
  },
}));

// Middleware: Global Error Handler
app.onError(async (err, c) => {
  console.error(err);
  await sendDiscordAlert(c.env.DISCORD_WEBHOOK_URL, 'API Error', `**Path**: ${c.req.path}\n**Error**: ${err.message}`, 'critical');
  return c.json({ error: err.message }, 500);
});

// Helper to pass empty headers to controllers (controllers manually add CORS, but Hono handles it too)
const corsHeaders = {};

// --- Admin Routes (`/api/admin/*`) ---
// Middleware: Admin Auth
app.use('/api/admin/*', async (c, next) => {
  const apiKey = c.req.header('X-Admin-Key');
  if (!c.env.ADMIN_API_KEY || apiKey !== c.env.ADMIN_API_KEY) {
    return c.json({ error: 'Unauthorized' }, 401);
  }
  await next();
});

app.post('/api/admin/login', (c) => c.json({ success: true }));

app.get('/api/admin/chains', (c) => chainController.handleGetAdminChains(createDb(c.env.DB), corsHeaders));
app.post('/api/admin/chains', async (c) => chainController.handleAddChain(createDb(c.env.DB), await c.req.json(), corsHeaders));
app.put('/api/admin/chains/:id', async (c) => {
  const id = parseInt(c.req.param('id'));
  return chainController.handleUpdateChain(createDb(c.env.DB), id, await c.req.json(), corsHeaders);
});
app.delete('/api/admin/chains/:id', async (c) => {
  const id = parseInt(c.req.param('id'));
  return chainController.handleDeleteChain(createDb(c.env.DB), id, corsHeaders);
});

app.post('/api/admin/backfill', async (c) => {
  const body = await c.req.json() as { chainId?: number; fromBlock?: number; toBlock?: number };
  return adminController.handleHistoricalBackfill(createDb(c.env.DB), body.chainId || 8453, body.fromBlock, body.toBlock, corsHeaders);
});

// Deep backfill via Blockscout pagination (up to 50 pages / 2,500 txs)
app.post('/api/admin/deep-backfill', async (c) => {
  const body = await c.req.json() as { chainId?: number; pages?: number };
  const chainId = body.chainId || 8453;
  const pages = Math.min(body.pages || 50, 100);
  const chains = await createDb(c.env.DB).select().from(schema.chains).where(eq(schema.chains.id, chainId)).all();
  if (chains.length === 0) return new Response(JSON.stringify({ error: 'Chain not found' }), { status: 404, headers: corsHeaders });
  const chain = chains[0];
  const result = await runDeepBackfill(createDb(c.env.DB), { id: chain.id, rpcUrl: chain.rpcUrl, contractAddress: chain.contractAddress }, pages);
  return new Response(JSON.stringify({ success: true, ...result }), { status: 200, headers: corsHeaders });
});

app.post('/api/admin/import', async (c) => {
  return adminController.handleImportData(createDb(c.env.DB), await c.req.json(), corsHeaders);
});

// --- Admin: Solver Labels ---
app.get('/api/admin/solvers', (c) => solverLabelController.handleGetSolvers(createDb(c.env.DB), corsHeaders));
app.post('/api/admin/solvers/label', async (c) => solverLabelController.handleSetSolverLabel(createDb(c.env.DB), await c.req.json(), corsHeaders));
app.delete('/api/admin/solvers/label/:address', (c) => solverLabelController.handleDeleteSolverLabel(createDb(c.env.DB), c.req.param('address'), corsHeaders));

// --- Admin: Universal Search ---
app.get('/api/admin/search', (c) => {
  const q = c.req.query('q') || '';
  return searchController.handleSearch(createDb(c.env.DB), q, corsHeaders);
});

// --- Admin: Transaction Inspector ---
app.get('/api/admin/tx/:chainId/:txHash', (c) => {
  const chainId = parseInt(c.req.param('chainId'));
  const txHash = c.req.param('txHash');
  return searchController.handleTxInspect(createDb(c.env.DB), chainId, txHash, corsHeaders);
});

// --- Admin: System Health ---
app.get('/api/admin/health', (c) => healthController.handleGetHealth(createDb(c.env.DB), corsHeaders));

// --- Admin: Project Intelligence ---
app.get('/api/admin/project', async (c) => {
  const db = createDb(c.env.DB);
  try {
    const allAgents = await db.select().from(schema.agents);
    const recentExecs = await db.select().from(schema.agentExecutions).orderBy(schema.agentExecutions.createdAt).limit(50);

    // Compute fleet stats
    const activeAgents = allAgents.filter(a => a.status === 'active').length;
    const pausedAgents = allAgents.filter(a => a.status === 'paused').length;
    const totalExecs = allAgents.reduce((sum, a) => sum + (a.totalExecutions || 0), 0);
    const totalSuccess = allAgents.reduce((sum, a) => sum + (a.successfulExecutions || 0), 0);
    const totalGas = allAgents.reduce((sum, a) => sum + (a.totalGasSpent || 0), 0);

    // Strategy breakdown
    const strategyMap: Record<string, number> = {};
    allAgents.forEach(a => { strategyMap[a.strategy] = (strategyMap[a.strategy] || 0) + 1; });

    // Chain coverage
    const chainSet = new Set<number>();
    allAgents.forEach(a => {
      if (a.allowedChains) {
        try { JSON.parse(a.allowedChains).forEach((c: number) => chainSet.add(c)); } catch { }
      }
    });

    return Response.json({
      success: true,
      data: {
        agents: {
          total: allAgents.length,
          active: activeAgents,
          paused: pausedAgents,
          disabled: allAgents.filter(a => a.status === 'disabled').length,
          totalExecutions: totalExecs,
          successRate: totalExecs > 0 ? ((totalSuccess / totalExecs) * 100).toFixed(1) : '0.0',
          totalGasSpent: totalGas,
          strategies: strategyMap,
          chainsCovered: Array.from(chainSet),
          fleet: allAgents.map(a => ({
            id: a.id,
            name: a.name,
            strategy: a.strategy,
            walletAddress: a.walletAddress,
            status: a.status,
            executions: a.totalExecutions || 0,
            successRate: (a.totalExecutions || 0) > 0
              ? (((a.successfulExecutions || 0) / (a.totalExecutions || 1)) * 100).toFixed(1) : '0.0',
            lastActive: a.lastActive,
            createdAt: a.createdAt,
          })),
        },
        recentExecutions: recentExecs.slice(0, 10).map(e => ({
          id: e.id,
          agentId: e.agentId,
          chainId: e.chainId,
          intentType: e.intentType,
          status: e.status,
          txHash: e.txHash,
          gasUsed: e.gasUsed,
          createdAt: e.createdAt,
        })),
      },
    }, { headers: corsHeaders });
  } catch (e: any) {
    return Response.json({ error: e.message }, { status: 500, headers: corsHeaders });
  }
});

// --- Admin: Data Export ---
app.get('/api/admin/export/:type', (c) => {
  const type = c.req.param('type');
  const chainId = c.req.query('chainId') ? parseInt(c.req.query('chainId')!) : null;
  return healthController.handleExport(createDb(c.env.DB), type, chainId, corsHeaders);
});

app.post('/api/admin/sync', async (c) => {
  try {
    const db = createDb(c.env.DB);
    const body = await c.req.json() as { chainId?: number };
    const targetChainId = body.chainId || 8453;

    const chain = await db.select().from(schema.chains).where(eq(schema.chains.id, targetChainId)).get();
    if (!chain) return c.json({ error: 'Chain not found' }, 404);

    const indexerResults = await runBlockscoutIndexer(db, { id: chain.id, rpcUrl: chain.rpcUrl, contractAddress: chain.contractAddress });
    const syncState = await db.select().from(schema.syncState).where(eq(schema.syncState.chainId, targetChainId)).get();

    return c.json({ success: true, lastBlock: syncState?.lastBlock, updatedAt: syncState?.updatedAt, indexerResults }, 200);
  } catch (e: any) {
    return c.json({ success: false, error: e.message, stack: e.stack }, 500);
  }
});

app.get('/api/admin/debug-sync', async (c) => {
  const db = createDb(c.env.DB);
  const chain = await db.select().from(schema.chains).where(eq(schema.chains.id, 8453)).get();
  const syncState = await db.select().from(schema.syncState).where(eq(schema.syncState.chainId, 8453)).get();

  const info: any = { chain: chain ? { id: chain.id, name: chain.name, rpcUrl: chain.rpcUrl, contractAddress: chain.contractAddress, startBlock: chain.startBlock } : null, syncState };

  try {
    const blockHex = await rpcRequest(chain!.rpcUrl, 'eth_blockNumber', []);
    info.currentBlock = parseInt(blockHex, 16);
    info.gap = info.currentBlock - (syncState?.lastBlock || 0);

    // Test eth_getLogs with a small range
    const fromBlock = syncState?.lastBlock || chain!.startBlock;
    const toBlock = fromBlock + 100;
    const logs = await rpcRequest(chain!.rpcUrl, 'eth_getLogs', [{
      fromBlock: '0x' + fromBlock.toString(16),
      toBlock: '0x' + toBlock.toString(16),
      address: chain!.contractAddress,
    }]);
    info.testLogs = { fromBlock, toBlock, count: logs?.length ?? 0 };
  } catch (e: any) {
    info.rpcError = e.message;
  }
  return c.json(info);
});


// --- Public Routes ---

app.get('/api/solvers/labels', (c) => withCache(c.req.raw, 300, () => solverLabelController.handleGetPublicLabels(createDb(c.env.DB), corsHeaders)));

app.get('/api/chains', (c) => withCache(c.req.raw, 300, () => chainController.handleGetChains(createDb(c.env.DB), corsHeaders)));

app.get('/api/proxy/blockscout', async (c) => {
  const CONTRACT_ADDRESS = '0x9ed43c229480659bf6b6607c46d7b96c6d760cbb';
  try {
    const resp = await fetch(`https://base.blockscout.com/api/v2/addresses/${CONTRACT_ADDRESS}/transactions?filter=to`, {
      headers: { 'User-Agent': 'Cloudflare-Worker' }
    });
    const data = await resp.json();
    return c.json(data);
  } catch (e: any) {
    return c.json({ error: 'Failed to fetch from Blockscout', details: e.message }, 502);
  }
});

app.get('/api/health', (c) => {
  const cid = parseQueryParam(chainIdSchema, c.req.query('chainId') || null);
  if (!cid.success) return cid.response;
  return statsController.handleGetHealth(createDb(c.env.DB), cid.data, corsHeaders);
});

app.get('/api/stats', (c) => {
  const cid = parseQueryParam(chainIdSchema, c.req.query('chainId') || null);
  if (!cid.success) return cid.response;
  return withCache(c.req.raw, 60, () => statsController.handleGetStats(createDb(c.env.DB), cid.data, corsHeaders));
});

app.get('/api/latest-transactions', (c) => {
  const cid = parseQueryParam(chainIdSchema, c.req.query('chainId') || null);
  if (!cid.success) return cid.response;
  return withCache(c.req.raw, 10, () => transactionController.handleGetLatestTransactions(createDb(c.env.DB), cid.data, corsHeaders));
});

app.get('/api/solvers', (c) => {
  const rawChainId = c.req.query('chainId');
  const chainId = rawChainId ? parseInt(rawChainId, 10) : 0; // 0 = all chains
  if (isNaN(chainId) || chainId < 0) return new Response(JSON.stringify({ error: 'Invalid chainId' }), { status: 400, headers: corsHeaders });
  return withCache(c.req.raw, 60, () => solverController.handleGetSolvers(createDb(c.env.DB), chainId, corsHeaders));
});

app.get('/api/daily-stats', (c) => {
  const cid = parseQueryParam(chainIdSchema, c.req.query('chainId') || null);
  if (!cid.success) return cid.response;
  const d = parseQueryParam(daysSchema, c.req.query('days') || null);
  if (!d.success) return d.response;
  return withCache(c.req.raw, 300, () => statsController.handleGetDailyStats(createDb(c.env.DB), cid.data, d.data, corsHeaders));
});

app.get('/api/assets', (c) => {
  const cid = parseQueryParam(chainIdSchema, c.req.query('chainId') || null);
  if (!cid.success) return cid.response;
  return withCache(c.req.raw, 60, () => statsController.handleGetAssets(createDb(c.env.DB), cid.data, corsHeaders));
});

app.get('/api/network-health', (c) => {
  const cid = parseQueryParam(chainIdSchema, c.req.query('chainId') || null);
  if (!cid.success) return cid.response;
  return withCache(c.req.raw, 60, () => statsController.handleGetNetworkHealth(createDb(c.env.DB), cid.data, corsHeaders));
});

app.get('/api/privacy-stats', (c) => {
  const cid = parseQueryParam(chainIdSchema, c.req.query('chainId') || null);
  if (!cid.success) return cid.response;
  return withCache(c.req.raw, 60, () => statsController.handleGetPrivacyStats(createDb(c.env.DB), cid.data, corsHeaders));
});

app.get('/api/payload-stats', (c) => {
  const cid = parseQueryParam(chainIdSchema, c.req.query('chainId') || null);
  if (!cid.success) return cid.response;
  return withCache(c.req.raw, 300, () => statsController.handleGetPayloadStats(createDb(c.env.DB), cid.data, corsHeaders));
});

app.get('/api/resource-churn', (c) => {
  const cid = parseQueryParam(chainIdSchema, c.req.query('chainId') || null);
  if (!cid.success) return cid.response;
  const d = parseQueryParam(daysSchema, c.req.query('days') || null);
  if (!d.success) return d.response;
  return withCache(c.req.raw, 300, () => statsController.handleGetResourceChurn(createDb(c.env.DB), cid.data, d.data, corsHeaders));
});

app.get('/api/transactions', (c) => {
  const url = new URL(c.req.url);
  // Cache paginated searches for 15 seconds to prevent DB spam
  return withCache(c.req.raw, 15, () => transactionController.handleGetTransactions(createDb(c.env.DB), url.searchParams, corsHeaders));
});

app.get('/api/token-transfers', (c) => {
  const url = new URL(c.req.url);
  return withCache(c.req.raw, 30, () => transactionController.handleGetTokenTransfers(createDb(c.env.DB), url.searchParams, corsHeaders));
});

app.get('/api/tx/:hash', (c) => {
  const cid = parseQueryParam(chainIdSchema, c.req.query('chainId') || null);
  if (!cid.success) return cid.response;
  const h = parseQueryParam(txHashSchema, c.req.param('hash') || null);
  if (!h.success) return h.response;
  // Cache individual transaction details for a long time (immutable)
  return withCache(c.req.raw, 300, () => transactionController.handleGetTxDetail(createDb(c.env.DB), cid.data, h.data, corsHeaders));
});

app.get('/api/solver/:address', (c) => {
  const rawChainId = c.req.query('chainId');
  const chainId = rawChainId ? parseInt(rawChainId, 10) : 0; // 0 = all chains by default
  if (isNaN(chainId) || chainId < 0) return new Response(JSON.stringify({ error: 'Invalid chainId' }), { status: 400, headers: corsHeaders });
  const a = parseQueryParam(addressSchema, c.req.param('address') || null);
  if (!a.success) return a.response;
  return withCache(c.req.raw, 60, () => solverController.handleGetSolverDetail(createDb(c.env.DB), chainId, a.data, corsHeaders));
});

// ═══════════════════════════════════════════════════════════
//  V3 API — Intent Lifecycle & Analytics (Phase 1)
// ═══════════════════════════════════════════════════════════

// Intent Endpoints
app.get('/api/v3/intents', (c) => {
  const cid = parseQueryParam(chainIdSchema, c.req.query('chainId') || null);
  if (!cid.success) return cid.response;
  const url = new URL(c.req.url);
  return withCache(c.req.raw, 15, () => intentController.handleGetIntents(createDb(c.env.DB), cid.data, url.searchParams, corsHeaders));
});

app.get('/api/v3/intents/:id', (c) => {
  const cid = parseQueryParam(chainIdSchema, c.req.query('chainId') || null);
  if (!cid.success) return cid.response;
  const intentId = c.req.param('id');
  return withCache(c.req.raw, 30, () => intentController.handleGetIntentDetail(createDb(c.env.DB), cid.data, intentId, corsHeaders));
});

app.get('/api/v3/intents/:id/lifecycle', (c) => {
  const intentId = c.req.param('id');
  return withCache(c.req.raw, 30, () => intentController.handleGetIntentLifecycle(createDb(c.env.DB), intentId, corsHeaders));
});

// Analytics Endpoints
app.get('/api/v3/analytics/intent-types', (c) => {
  const cid = parseQueryParam(chainIdSchema, c.req.query('chainId') || null);
  if (!cid.success) return cid.response;
  return withCache(c.req.raw, 120, () => intentController.handleGetIntentTypeDistribution(createDb(c.env.DB), cid.data, corsHeaders));
});

app.get('/api/v3/analytics/demand-heatmap', (c) => {
  const cid = parseQueryParam(chainIdSchema, c.req.query('chainId') || null);
  if (!cid.success) return cid.response;
  return withCache(c.req.raw, 300, () => intentController.handleGetDemandHeatmap(createDb(c.env.DB), cid.data, corsHeaders));
});

app.get('/api/v3/analytics/lifecycle-funnel', (c) => {
  const cid = parseQueryParam(chainIdSchema, c.req.query('chainId') || null);
  if (!cid.success) return cid.response;
  return withCache(c.req.raw, 120, () => intentController.handleGetLifecycleFunnel(createDb(c.env.DB), cid.data, corsHeaders));
});

app.get('/api/v3/overview', (c) => {
  const cid = parseQueryParam(chainIdSchema, c.req.query('chainId') || null);
  if (!cid.success) return cid.response;
  return withCache(c.req.raw, 60, () => intentController.handleGetOverview(createDb(c.env.DB), cid.data, corsHeaders));
});

// Enhanced Solver Economics
app.get('/api/v3/solvers/economics', (c) => {
  const cid = parseQueryParam(chainIdSchema, c.req.query('chainId') || null);
  if (!cid.success) return cid.response;
  const url = new URL(c.req.url);
  return withCache(c.req.raw, 60, () => intentController.handleGetSolverEconomics(createDb(c.env.DB), cid.data, url.searchParams, corsHeaders));
});

app.get('/api/v3/solvers/:address/economics', (c) => {
  const cid = parseQueryParam(chainIdSchema, c.req.query('chainId') || null);
  if (!cid.success) return cid.response;
  const a = parseQueryParam(addressSchema, c.req.param('address') || null);
  if (!a.success) return a.response;
  return withCache(c.req.raw, 60, () => intentController.handleGetSolverEconHistory(createDb(c.env.DB), cid.data, a.data, corsHeaders));
});

// ═══════════════════════════════════════════════════════════
//  V3 API — Phase 2 Intelligence Layer
// ═══════════════════════════════════════════════════════════

app.get('/api/v3/intents/:id/simulation', (c) => {
  const intentId = c.req.param('id');
  return withCache(c.req.raw, 30, () => intentController.handleGetIntentSimulation(createDb(c.env.DB), intentId, corsHeaders));
});

app.post('/api/v3/intents/simulate', async (c) => {
  const body = await c.req.json();
  return intentController.handleSimulateIntent(createDb(c.env.DB), body, c.env, corsHeaders);
});

app.get('/api/v3/analytics/cross-chain-flows', (c) => {
  const url = new URL(c.req.url);
  return withCache(c.req.raw, 300, () => intentController.handleGetCrossChainFlows(createDb(c.env.DB), url.searchParams, corsHeaders));
});

app.get('/api/v3/analytics/ai-insights', (c) => {
  const cid = parseQueryParam(chainIdSchema, c.req.query('chainId') || null);
  if (!cid.success) return cid.response;
  return withCache(c.req.raw, 60, () => intentController.handleGetAIInsights(createDb(c.env.DB), cid.data, corsHeaders));
});

// ═══════════════════════════════════════════════════════════
//  V3 API — Phase 3 Developer Portal
// ═══════════════════════════════════════════════════════════

app.get('/api/v3/developer/catalog', () => {
  return developerController.handleApiCatalog();
});

app.post('/api/v3/developer/keys', async (c) => {
  return developerController.handleCreateApiKey(createDb(c.env.DB), c.req.raw);
});

app.get('/api/v3/developer/keys', (c) => {
  return developerController.handleListApiKeys(createDb(c.env.DB), c.req.raw);
});

app.post('/api/v3/developer/keys/revoke', async (c) => {
  return developerController.handleRevokeApiKey(createDb(c.env.DB), c.req.raw);
});

app.get('/api/v3/developer/keys/usage', (c) => {
  return developerController.handleApiKeyUsage(createDb(c.env.DB), c.req.raw);
});

// ─── Phase 3: Real-time Event Streaming (SSE) ───
app.get('/api/v3/stream/events', async (c) => {
  const format = new URL(c.req.url).searchParams.get('format');
  if (format === 'json') {
    // JSON fallback for polling clients
    const since = parseInt(new URL(c.req.url).searchParams.get('since') || '0', 10);
    const events = await getRecentEvents(c.env.DB, since, 50);
    return c.json({ success: true, events, count: events.length });
  }
  return handleSSEStream(c.env.DB, c.req.raw);
});

// ═══════════════════════════════════════════════════════════
//  V3 API — Agent Autonomy
// ═══════════════════════════════════════════════════════════

app.post('/api/v3/agents/register', async (c) => {
  return agentController.handleRegisterAgent(createDb(c.env.DB), c.req.raw, c.env, corsHeaders);
});

app.post('/api/v3/agents/execute', async (c) => {
  return agentController.handleExecuteIntent(createDb(c.env.DB), c.req.raw, corsHeaders);
});

app.get('/api/v3/agents/:id/status', (c) => {
  const id = c.req.param('id');
  return agentController.handleGetAgentStatus(createDb(c.env.DB), id, corsHeaders);
});

app.get('/api/v3/agents/:id/history', (c) => {
  const id = c.req.param('id');
  const limit = parseInt(c.req.query('limit') || '25', 10);
  return agentController.handleGetAgentHistory(createDb(c.env.DB), id, limit, corsHeaders);
});

app.post('/api/v3/agents/:id/pause', async (c) => {
  const id = c.req.param('id');
  return agentController.handlePauseAgent(createDb(c.env.DB), id, corsHeaders);
});

app.post('/api/v3/agents/:id/resume', async (c) => {
  const id = c.req.param('id');
  return agentController.handleResumeAgent(createDb(c.env.DB), id, corsHeaders);
});

export default {
  fetch: app.fetch,
  async scheduled(event: ScheduledEvent, env: Env, ctx: ExecutionContext) {
    const db = createDb(env.DB);
    try {
      const activeChains = await db.select().from(schema.chains).where(eq(schema.chains.isEnabled, 1));

      // Phase 1: Run Blockscout indexer for all chains, with RPC fallback
      const results = await Promise.allSettled(activeChains.map(async (chain) => {
        try {
          // Primary: Blockscout REST API (no block-range limits)
          const bsResult = await runBlockscoutIndexer(db, { id: chain.id, rpcUrl: chain.rpcUrl, contractAddress: chain.contractAddress });
          // If Blockscout had critical errors, also try RPC fallback
          const hasCriticalError = bsResult.errors.some(e => e.includes('HTTP 5') || e.includes('HTTP 429') || e.includes('Top-level'));
          if (hasCriticalError && bsResult.newTransactions === 0) {
            console.log(`[Cron] Blockscout failed for chain ${chain.id}, falling back to RPC indexer`);
            throw new Error('Blockscout failed, using RPC fallback');
          }
          return bsResult;
        } catch (e: any) {
          // Fallback: RPC eth_getLogs with 2000-block batches (Alchemy paid tier)
          console.log(`[Cron] RPC fallback for chain ${chain.id}: ${e.message}`);
          const chainConfig = { id: chain.id, name: chain.name, rpc_url: chain.rpcUrl, contract_address: chain.contractAddress, start_block: chain.startBlock, explorer_url: chain.explorerUrl, icon: chain.icon || '🔗', is_enabled: chain.isEnabled };
          const syncState = await db.select().from(schema.syncState).where(eq(schema.syncState.chainId, chain.id)).get();
          const fromBlock = syncState?.lastBlock || chain.startBlock;
          const currentBlockHex = await rpcRequest(chain.rpcUrl, 'eth_blockNumber', []);
          const currentBlock = parseInt(currentBlockHex, 16);
          const toBlock = Math.min(fromBlock + 2000, currentBlock);
          if (fromBlock < currentBlock) {
            await syncBlockRange(chainConfig, db, fromBlock, toBlock);
          }
          return { chainId: chain.id, newTransactions: 0, errors: [`RPC fallback: synced ${fromBlock}-${toBlock}`], pages: 0, newPayloads: 0, newPrivacyRoots: 0, newTokenTransfers: 0, newForwarderCalls: 0 };
        }
      }));

      const errors: string[] = [];
      let totalTxs = 0;
      results.forEach((r, i) => {
        if (r.status === 'fulfilled') {
          totalTxs += r.value.newTransactions;
          if (r.value.errors.length > 0) errors.push(`Chain ${activeChains[i].id}: ${r.value.errors.join(', ')}`);
          // Phase 3: Push real-time events for new transactions
          if (r.value.newTransactions > 0) {
            ctx.waitUntil(pushIndexerEvents(env.DB, activeChains[i].id, r.value.newTransactions, 0));
          }
        } else {
          errors.push(`Chain ${activeChains[i].id} CRASH: ${r.reason.message}`);
        }
      });

      // Phase 1: Process intent lifecycle for newly indexed events
      const lifecycleResults = await Promise.allSettled(activeChains.map(async (chain) => {
        const lcResult = await processLifecycleForNewEvents(db, chain.id);
        if (lcResult.errors.length > 0) {
          errors.push(`Lifecycle ${chain.id}: ${lcResult.errors.join(', ')}`);
        }
        return lcResult;
      }));

      // Phase 1: Compute solver economics (every 10 minutes to save CPU)
      const minute = new Date().getMinutes();
      if (minute % 10 === 0) {
        await Promise.allSettled(activeChains.map(async (chain) => {
          const econResult = await computeSolverEconomics(db, chain.id);
          if (econResult.errors.length > 0) {
            errors.push(`Economics ${chain.id}: ${econResult.errors.join(', ')}`);
          }
        }));
      }

      // Phase 2: Run simulation engine for new intents (every 5 minutes)
      if (minute % 5 === 0) {
        try {
          const simCount = await processSimulationsForNewIntents(db, env, 5);
          if (simCount > 0) console.log(`[Cron] Simulated ${simCount} intents`);
          await backfillAccuracy(db);
        } catch (e: any) {
          errors.push(`SimEngine: ${e.message}`);
        }
      }

      // Phase 2: Cross-chain correlation (every 15 minutes)
      if (minute % 15 === 0) {
        try {
          const corrCount = await findCrossChainCorrelations(db, 7200);
          if (corrCount > 0) console.log(`[Cron] Found ${corrCount} cross-chain correlations`);
        } catch (e: any) {
          errors.push(`CorrEngine: ${e.message}`);
        }
      }

      let totalLifecycle = 0;
      lifecycleResults.forEach((r, i) => {
        if (r.status === 'fulfilled') {
          totalLifecycle += r.value.processed;
          // Phase 3: Push settlement events
          if (r.value.processed > 0) {
            ctx.waitUntil(pushIndexerEvents(env.DB, activeChains[i].id, 0, r.value.processed));
          }
        }
      });

      // Phase 3: Cleanup old events (once per hour)
      if (minute === 0) {
        ctx.waitUntil(cleanupOldEvents(env.DB));
      }

      if (errors.length > 0) {
        await sendDiscordAlert(env.DISCORD_WEBHOOK_URL, 'Indexer Warnings', `Processed ${totalTxs} txs, ${totalLifecycle} lifecycle records. Errors:\n${errors.slice(0, 5).join('\n')}`, 'warning');
      }
    } catch (e: any) {
      await sendDiscordAlert(env.DISCORD_WEBHOOK_URL, 'Indexer Crash', `The scheduled indexer failed:\n\`\`\`\n${e.message}\n\`\`\``, 'critical');
    }
  }
};