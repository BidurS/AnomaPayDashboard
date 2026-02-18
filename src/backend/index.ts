import { Hono } from 'hono';
import { cors } from 'hono/cors';
import { createDb } from './db';
import { runBlockscoutIndexer } from './services/blockscoutIndexer';
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

export interface Env {
  DB: D1Database;
  ADMIN_API_KEY?: string;
  DISCORD_WEBHOOK_URL?: string;
}

const app = new Hono<{ Bindings: Env }>();

// Middleware: CORS
app.use('/*', cors());

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

app.post('/api/admin/import', async (c) => {
  return adminController.handleImportData(createDb(c.env.DB), await c.req.json(), corsHeaders);
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
  return withCache(c.req.raw, 5, () => transactionController.handleGetLatestTransactions(createDb(c.env.DB), cid.data, corsHeaders));
});

app.get('/api/solvers', (c) => {
  const cid = parseQueryParam(chainIdSchema, c.req.query('chainId') || null);
  if (!cid.success) return cid.response;
  return withCache(c.req.raw, 60, () => solverController.handleGetSolvers(createDb(c.env.DB), cid.data, corsHeaders));
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

app.get('/api/transactions', (c) => {
  const url = new URL(c.req.url);
  return transactionController.handleGetTransactions(createDb(c.env.DB), url.searchParams, corsHeaders);
});

app.get('/api/token-transfers', (c) => {
  const url = new URL(c.req.url);
  return transactionController.handleGetTokenTransfers(createDb(c.env.DB), url.searchParams, corsHeaders);
});

app.get('/api/tx/:hash', (c) => {
  const cid = parseQueryParam(chainIdSchema, c.req.query('chainId') || null);
  if (!cid.success) return cid.response;
  const h = parseQueryParam(txHashSchema, c.req.param('hash') || null);
  if (!h.success) return h.response;
  return transactionController.handleGetTxDetail(createDb(c.env.DB), cid.data, h.data, corsHeaders);
});

app.get('/api/solver/:address', (c) => {
  const cid = parseQueryParam(chainIdSchema, c.req.query('chainId') || null);
  if (!cid.success) return cid.response;
  const a = parseQueryParam(addressSchema, c.req.param('address') || null);
  if (!a.success) return a.response;
  return solverController.handleGetSolverDetail(createDb(c.env.DB), cid.data, a.data, corsHeaders);
});

export default {
  fetch: app.fetch,
  async scheduled(event: ScheduledEvent, env: Env, ctx: ExecutionContext) {
    const db = createDb(env.DB);
    try {
      const activeChains = await db.select().from(schema.chains).where(eq(schema.chains.isEnabled, 1));
      const results = await Promise.allSettled(activeChains.map(async (chain) => {
        return runBlockscoutIndexer(db, { id: chain.id, rpcUrl: chain.rpcUrl, contractAddress: chain.contractAddress });
      }));
      // ... error handling
      const errors: string[] = [];
      let totalTxs = 0;
      results.forEach((r, i) => {
        if (r.status === 'fulfilled') {
          totalTxs += r.value.newTransactions;
          if (r.value.errors.length > 0) errors.push(`Chain ${activeChains[i].id}: ${r.value.errors.join(', ')}`);
        } else {
          errors.push(`Chain ${activeChains[i].id} CRASH: ${r.reason.message}`);
        }
      });
      if (errors.length > 0) {
        await sendDiscordAlert(env.DISCORD_WEBHOOK_URL, 'Indexer Warnings', `Processed ${totalTxs} txs total. Errors:\n${errors.slice(0, 5).join('\n')}`, 'warning');
      }
    } catch (e: any) {
      await sendDiscordAlert(env.DISCORD_WEBHOOK_URL, 'Indexer Crash', `The scheduled indexer failed:\n\`\`\`\n${e.message}\n\`\`\``, 'critical');
    }
  }
};