import { createDb } from './db';
import { runBlockscoutIndexer } from './services/blockscoutIndexer';
import { withCache } from './utils/cache';
import { sendDiscordAlert, checkAndAlertHealth } from './utils/alerts';
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

export default {
  async fetch(request: Request, env: Env): Promise<Response> {
    const url = new URL(request.url);
    const method = request.method;
    const corsHeaders = {
      'Content-Type': 'application/json',
      'Access-Control-Allow-Origin': '*',
      'Access-Control-Allow-Methods': 'GET, POST, PUT, DELETE, OPTIONS',
      'Access-Control-Allow-Headers': 'Content-Type, X-Admin-Key',
    };

    if (method === 'OPTIONS') return new Response(null, { headers: corsHeaders });

    const db = createDb(env.DB);

    try {
      // Admin Routes — handle first, before chainId validation (admin POST endpoints don't always have chainId)
      if (url.pathname.startsWith('/api/admin/')) {
        const apiKey = request.headers.get('X-Admin-Key');
        if (!env.ADMIN_API_KEY || apiKey !== env.ADMIN_API_KEY) return new Response(JSON.stringify({ error: 'Unauthorized' }), { status: 401, headers: corsHeaders });

        if (url.pathname === '/api/admin/login' && method === 'POST') {
          return new Response(JSON.stringify({ success: true }), { headers: corsHeaders });
        }
        if (url.pathname === '/api/admin/chains') {
          if (method === 'GET') return chainController.handleGetAdminChains(db, corsHeaders);
          if (method === 'POST') return chainController.handleAddChain(db, await request.json(), corsHeaders);
        }
        if (url.pathname.match(/^\/api\/admin\/chains\/\d+$/)) {
          const chainId = parseInt(url.pathname.split('/').pop()!);
          if (method === 'PUT') return chainController.handleUpdateChain(db, chainId, await request.json(), corsHeaders);
          if (method === 'DELETE') return chainController.handleDeleteChain(db, chainId, corsHeaders);
        }

        if (url.pathname === '/api/admin/backfill' && method === 'POST') {
          const body = await request.json() as { chainId?: number; fromBlock?: number; toBlock?: number };
          return adminController.handleHistoricalBackfill(db, body.chainId || 8453, body.fromBlock, body.toBlock, corsHeaders);
        }
        if (url.pathname === '/api/admin/sync' && method === 'POST') {
          try {
            const body = await request.json() as { chainId?: number };
            const targetChainId = body.chainId || 8453;

            const chain = await db.select().from(schema.chains).where(eq(schema.chains.id, targetChainId)).get();
            if (!chain) return new Response(JSON.stringify({ error: 'Chain not found' }), { status: 404, headers: corsHeaders });

            const indexerResults = await runBlockscoutIndexer(db, { id: chain.id, rpcUrl: chain.rpcUrl, contractAddress: chain.contractAddress });
            const syncState = await db.select().from(schema.syncState).where(eq(schema.syncState.chainId, targetChainId)).get();

            return new Response(JSON.stringify({ success: true, lastBlock: syncState?.lastBlock, updatedAt: syncState?.updatedAt, indexerResults }, null, 2), { headers: corsHeaders });
          } catch (e: any) {
            return new Response(JSON.stringify({ success: false, error: e.message, stack: e.stack }), { status: 500, headers: corsHeaders });
          }
        }
        if (url.pathname === '/api/admin/debug-sync' && method === 'GET') {
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
          return new Response(JSON.stringify(info, null, 2), { headers: corsHeaders });
        }
        if (url.pathname === '/api/admin/import' && method === 'POST') {
          return adminController.handleImportData(db, await request.json(), corsHeaders);
        }
        return new Response(JSON.stringify({ error: 'Not Found' }), { status: 404, headers: corsHeaders });
      }

      // --- Validate common query params (public routes only) ---
      const cid = parseQueryParam(chainIdSchema, url.searchParams.get('chainId'));
      if (!cid.success) return cid.response;
      const chainId = cid.data;

      // Public Endpoints
      if (url.pathname === '/api/chains') return withCache(request, 300, () => chainController.handleGetChains(db, corsHeaders));
      if (url.pathname === '/api/proxy/blockscout') return handleProxyBlockscout(corsHeaders);
      if (url.pathname === '/api/health') return statsController.handleGetHealth(db, chainId, corsHeaders);

      if (url.pathname === '/api/stats') return withCache(request, 60, () => statsController.handleGetStats(db, chainId, corsHeaders));
      if (url.pathname === '/api/latest-transactions') return withCache(request, 5, () => transactionController.handleGetLatestTransactions(db, chainId, corsHeaders));
      if (url.pathname === '/api/solvers') return withCache(request, 60, () => solverController.handleGetSolvers(db, chainId, corsHeaders));
      if (url.pathname === '/api/daily-stats') {
        const d = parseQueryParam(daysSchema, url.searchParams.get('days'));
        if (!d.success) return d.response;
        return withCache(request, 300, () => statsController.handleGetDailyStats(db, chainId, d.data, corsHeaders));
      }
      if (url.pathname === '/api/assets') return withCache(request, 60, () => statsController.handleGetAssets(db, chainId, corsHeaders));
      if (url.pathname === '/api/network-health') return withCache(request, 60, () => statsController.handleGetNetworkHealth(db, chainId, corsHeaders));
      if (url.pathname === '/api/privacy-stats') return withCache(request, 60, () => statsController.handleGetPrivacyStats(db, chainId, corsHeaders));
      if (url.pathname === '/api/payload-stats') return withCache(request, 300, () => statsController.handleGetPayloadStats(db, chainId, corsHeaders));

      if (url.pathname === '/api/transactions') return transactionController.handleGetTransactions(db, url.searchParams, corsHeaders);
      if (url.pathname === '/api/token-transfers') return transactionController.handleGetTokenTransfers(db, url.searchParams, corsHeaders);

      // Dynamic routes with validation
      const txMatch = url.pathname.match(/^\/api\/tx\/(.+)$/);
      if (txMatch) {
        const h = parseQueryParam(txHashSchema, txMatch[1]);
        if (!h.success) return h.response;
        return transactionController.handleGetTxDetail(db, chainId, h.data, corsHeaders);
      }

      const solverMatch = url.pathname.match(/^\/api\/solver\/(.+)$/);
      if (solverMatch) {
        const a = parseQueryParam(addressSchema, solverMatch[1]);
        if (!a.success) return a.response;
        return solverController.handleGetSolverDetail(db, chainId, a.data, corsHeaders);
      }

      return new Response(JSON.stringify({ message: 'Gnoma Explorer API', version: '3.0' }), { headers: corsHeaders });
    } catch (e: any) {
      // Send error to Discord on uncaught exceptions
      await sendDiscordAlert(env.DISCORD_WEBHOOK_URL, 'API Error', `**Path**: ${url.pathname}\n**Error**: ${e.message}`, 'critical');
      return new Response(JSON.stringify({ error: e.message }), { status: 500, headers: corsHeaders });
    }
  },
  async scheduled(event: ScheduledEvent, env: Env, ctx: ExecutionContext) {
    const db = createDb(env.DB);
    try {
      const activeChains = await db.select().from(schema.chains).where(eq(schema.chains.isEnabled, 1));

      const results = await Promise.allSettled(activeChains.map(async (chain) => {
        return runBlockscoutIndexer(db, { id: chain.id, rpcUrl: chain.rpcUrl, contractAddress: chain.contractAddress });
      }));

      // Collect errors
      const errors: string[] = [];
      let totalTxs = 0;

      results.forEach((r, i) => {
        if (r.status === 'fulfilled') {
          totalTxs += r.value.newTransactions;
          if (r.value.errors.length > 0) {
            errors.push(`Chain ${activeChains[i].id}: ${r.value.errors.join(', ')}`);
          }
        } else {
          errors.push(`Chain ${activeChains[i].id} CRASH: ${r.reason.message}`);
        }
      });

      if (errors.length > 0) {
        await sendDiscordAlert(env.DISCORD_WEBHOOK_URL, 'Indexer Warnings',
          `Processed ${totalTxs} txs total. Errors:\n${errors.slice(0, 5).join('\n')}`, 'warning');
      }
    } catch (e: any) {
      await sendDiscordAlert(env.DISCORD_WEBHOOK_URL, 'Indexer Crash', `The scheduled indexer failed:\n\`\`\`\n${e.message}\n\`\`\``, 'critical');
    }
  }
};

// Helper: Proxy Blockscout
async function handleProxyBlockscout(headers: any) {
  const CONTRACT_ADDRESS = '0x9ed43c229480659bf6b6607c46d7b96c6d760cbb';
  try {
    const resp = await fetch(`https://base.blockscout.com/api/v2/addresses/${CONTRACT_ADDRESS}/transactions?filter=to`, {
      headers: { 'User-Agent': 'Cloudflare-Worker' }
    });
    const data = await resp.json();
    return new Response(JSON.stringify(data), { headers });
  } catch (e: any) {
    return new Response(JSON.stringify({ error: 'Failed to fetch from Blockscout', details: e.message }), { status: 502, headers });
  }
}