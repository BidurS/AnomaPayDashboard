import { decodeAbiParameters, parseAbiParameters } from 'viem';

/**
 * AnomaPay Multichain Indexer & API
 * 
 * Architecture:
 * - All data is stored in Cloudflare D1 (SQLite)
 * - Scheduled indexer runs every 5 minutes to fetch new events
 * - Historical backfill available via /api/admin/backfill endpoint
 * - Frontend reads from D1 (fast, free, no blockchain calls)
 */

interface Env {
  DB: D1Database;
  ADMIN_API_KEY?: string;
  DISCORD_WEBHOOK_URL?: string;
}

interface ChainConfig {
  id: number;
  name: string;
  rpc_url: string;
  contract_address: string;
  start_block: number;
  explorer_url: string | null;
  icon: string;
  is_enabled: number;
}

// CORRECTED TOPICS — Matching actual ABI keccak256 hashes
const TOPICS = {
  TRANSACTION_EXECUTED: '0x10dd528db2c49add6545679b976df90d24c035d6a75b17f41b700e8c18ca5364',
  RESOURCE_PAYLOAD: '0x3a134d01c07803003c63301717ddc4612e6c47ae408eeea3222cded532d02ae6',
  DISCOVERY_PAYLOAD: '0x48243873b4752ddcb45e0d7b11c4c266583e5e099a0b798fdd9c1af7d49324f3',
  EXTERNAL_PAYLOAD: '0x9c61b290f631097f3de0d62c085b4a82c2d3c45b6bebe100a25cbbb577966a34',
  APPLICATION_PAYLOAD: '0xa494dac4b71848437d4a5b21432e8a9de4e31d7d76dbb96e38e3a20c87c34e9e',
  ACTION_EXECUTED: '0x1cc9a0755dd734c1ebfe98b68ece200037e363eb366d0dee04e420e2f23cc010',
  COMMITMENT_ROOT_ADDED: '0x0a2dc548ed950accb40d5d78541f3954c5e182a8ecf19e581a4f2263f61f59d2',
  FORWARDER_CALL_EXECUTED: '0xcddb327adb31fe5437df2a8c68301bb13a6baae432a804838caaf682506aadf1'
};

// ============================================================
// Pyth Network Integration — Real-time USD pricing for ALL assets
// ============================================================

// Map token contract address (lowercase) → Pyth feed ID
// This covers well-known tokens. Unknown tokens get $0 price
// but are still tracked with full metadata.
const TOKEN_TO_PYTH_FEED: Record<string, string> = {
  // USDC on Base
  '0x833589fcd6edb6e08f4c7c32d4f71b54bda02913': '0xeaa020c61cc479712813461ce153894a96a6c00b21ed0cfc2798d1f9a9e9c94a',
  // WETH on Base  
  '0x4200000000000000000000000000000000000006': '0xff61491a931112ddf1bd8147cd1b641375f79f5825126d665480874634fd0ace',
  // DAI on Base
  '0x50c5725949a6f0c72e6c4a641f24049a917db0cb': '0xb0948a5e5313200c632b51bb5ca32f6de0d36e9950a942d19751e6f20f28b06',
  // USDbC on Base (bridged USDC → same USDC price feed)
  '0xd9aaec86b65d86f6a7b5b1b0c42ffa531710b6ca': '0xeaa020c61cc479712813461ce153894a96a6c00b21ed0cfc2798d1f9a9e9c94a',
  // cbETH on Base
  '0x2ae3f1ec7f1f5012cfeab0185bfc7aa3cf0dec22': '0x15ecddd26d49e1eb8d7987b9fce317f030fa22fd19abbb1a1b4706fd67483e86',
  // WBTC (if bridged to Base)
  '0x0555e30da8f98308edb960aa94c0db47230d2b9c': '0xe62df6c8b4a85fe1a67db44dc12de5db330f7ac66b72dc658afedf0f4a415b43',
};

// Fallback token metadata for known tokens (used when RPC calls fail)
const KNOWN_TOKEN_META: Record<string, { symbol: string; decimals: number }> = {
  '0x833589fcd6edb6e08f4c7c32d4f71b54bda02913': { symbol: 'USDC', decimals: 6 },
  '0x4200000000000000000000000000000000000006': { symbol: 'WETH', decimals: 18 },
  '0x50c5725949a6f0c72e6c4a641f24049a917db0cb': { symbol: 'DAI', decimals: 18 },
  '0xd9aaec86b65d86f6a7b5b1b0c42ffa531710b6ca': { symbol: 'USDbC', decimals: 6 },
  '0x2ae3f1ec7f1f5012cfeab0185bfc7aa3cf0dec22': { symbol: 'cbETH', decimals: 18 },
};

// In-memory price cache (lives for the duration of a single sync)
const priceCache: Map<string, number> = new Map();
const metadataCache: Map<string, { symbol: string; decimals: number }> = new Map();

/**
 * Fetch real-time USD prices from Pyth Hermes API for a set of tokens.
 * Batches all feed IDs into a single HTTP request.
 */
async function fetchPythPrices(tokenAddresses: string[]): Promise<Map<string, number>> {
  const prices = new Map<string, number>();
  const feedsToFetch: { token: string; feedId: string }[] = [];

  for (const addr of tokenAddresses) {
    const cached = priceCache.get(addr);
    if (cached !== undefined) {
      prices.set(addr, cached);
      continue;
    }
    const feedId = TOKEN_TO_PYTH_FEED[addr];
    if (feedId) feedsToFetch.push({ token: addr, feedId });
    else prices.set(addr, 0); // Unknown token → $0 (still tracked)
  }

  if (feedsToFetch.length === 0) return prices;

  try {
    const idsParam = feedsToFetch.map(f => `ids[]=${f.feedId}`).join('&');
    const res = await fetch(`https://hermes.pyth.network/v2/updates/price/latest?${idsParam}`);
    if (!res.ok) throw new Error(`Pyth HTTP ${res.status}`);
    const data: any = await res.json();

    if (data.parsed) {
      for (const parsed of data.parsed) {
        const feedId = '0x' + parsed.id;
        const match = feedsToFetch.find(f => f.feedId === feedId);
        if (match) {
          const price = Number(parsed.price.price) * Math.pow(10, parsed.price.expo);
          prices.set(match.token, price);
          priceCache.set(match.token, price);
        }
      }
    }
  } catch (e) {
    console.error('Pyth price fetch failed:', e);
    // Fallback: all unfetched tokens get $0
    for (const f of feedsToFetch) {
      if (!prices.has(f.token)) prices.set(f.token, 0);
    }
  }

  return prices;
}

/**
 * Auto-detect token symbol and decimals from any ERC-20 contract.
 * Calls `symbol()` and `decimals()` on the token contract via RPC.
 * Falls back to KNOWN_TOKEN_META or defaults.
 */
async function fetchTokenMetadata(tokenAddress: string, rpcUrl: string): Promise<{ symbol: string; decimals: number }> {
  // Check cache first
  const cached = metadataCache.get(tokenAddress);
  if (cached) return cached;

  // Check known tokens
  const known = KNOWN_TOKEN_META[tokenAddress];
  if (known) {
    metadataCache.set(tokenAddress, known);
    return known;
  }

  // Try ERC-20 calls
  try {
    // symbol() = 0x95d89b41
    const symResult = await rpcRequest(rpcUrl, 'eth_call', [
      { to: tokenAddress, data: '0x95d89b41' }, 'latest'
    ]);
    // decimals() = 0x313ce567
    const decResult = await rpcRequest(rpcUrl, 'eth_call', [
      { to: tokenAddress, data: '0x313ce567' }, 'latest'
    ]);

    let symbol = 'UNKNOWN';
    try {
      // ABI-decode string return
      const decoded = decodeAbiParameters(parseAbiParameters('string'), symResult);
      symbol = decoded[0] as string;
    } catch {
      // Some tokens return bytes32 instead of string
      if (symResult && symResult.length > 2) {
        const hex = symResult.replace(/0+$/, '').slice(2);
        if (hex.length > 0) {
          // Worker-compatible hex decode (no Buffer needed)
          const bytes = new Uint8Array(hex.length / 2);
          for (let i = 0; i < hex.length; i += 2) bytes[i / 2] = parseInt(hex.substring(i, i + 2), 16);
          symbol = new TextDecoder().decode(bytes).replace(/\0/g, '').trim() || 'UNKNOWN';
        }
      }
    }

    let decimals = 18;
    try {
      decimals = parseInt(decResult, 16);
      if (isNaN(decimals) || decimals > 77) decimals = 18;
    } catch { decimals = 18; }

    const meta = { symbol, decimals };
    metadataCache.set(tokenAddress, meta);
    return meta;
  } catch {
    const fallback = { symbol: 'UNKNOWN', decimals: 18 };
    metadataCache.set(tokenAddress, fallback);
    return fallback;
  }
}

const SHIELDED_POOL_ADDRESS = '0x990c1773c28b985c2cf32c0a920192bd8717c871'.toLowerCase();
const ERC20_TRANSFER_TOPIC = '0xddf252ad1be2c89b69c2b068fc378daa952ba7f163c4a11628f55a4df523b3ef';

const MAX_BLOCKS_PER_BATCH = 2000;

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

    try {
      if (url.pathname === '/api/chains') return handleGetChains(env.DB, corsHeaders);
      if (url.pathname === '/api/proxy/blockscout') return handleProxyBlockscout(corsHeaders);
      if (url.pathname === '/api/stats') return handleGetStats(env.DB, parseInt(url.searchParams.get('chainId') || '8453'), corsHeaders);
      if (url.pathname === '/api/latest-transactions') return handleGetLatestTransactions(env.DB, parseInt(url.searchParams.get('chainId') || '8453'), corsHeaders);
      if (url.pathname === '/api/solvers') return handleGetSolvers(env.DB, parseInt(url.searchParams.get('chainId') || '8453'), corsHeaders);
      if (url.pathname === '/api/daily-stats') return handleGetDailyStats(env.DB, parseInt(url.searchParams.get('chainId') || '8453'), parseInt(url.searchParams.get('days') || '7'), corsHeaders);
      if (url.pathname === '/api/assets') return handleGetAssets(env.DB, parseInt(url.searchParams.get('chainId') || '8453'), corsHeaders);
      if (url.pathname === '/api/network-health') return handleGetNetworkHealth(env.DB, parseInt(url.searchParams.get('chainId') || '8453'), corsHeaders);
      if (url.pathname === '/api/privacy-stats') return handleGetPrivacyStats(env.DB, parseInt(url.searchParams.get('chainId') || '8453'), corsHeaders);
      if (url.pathname === '/api/payload-stats') return handleGetPayloadStats(env.DB, parseInt(url.searchParams.get('chainId') || '8453'), corsHeaders);
      if (url.pathname === '/api/transactions') return handleGetTransactions(env.DB, url.searchParams, corsHeaders);
      if (url.pathname === '/api/token-transfers') return handleGetTokenTransfers(env.DB, url.searchParams, corsHeaders);

      // Dynamic routes: /api/tx/:hash and /api/solver/:address
      const txMatch = url.pathname.match(/^\/api\/tx\/(.+)$/);
      if (txMatch) return handleGetTxDetail(env.DB, parseInt(url.searchParams.get('chainId') || '8453'), txMatch[1], corsHeaders);
      const solverMatch = url.pathname.match(/^\/api\/solver\/(.+)$/);
      if (solverMatch) return handleGetSolverDetail(env.DB, parseInt(url.searchParams.get('chainId') || '8453'), solverMatch[1], corsHeaders);

      if (url.pathname.startsWith('/api/admin/')) {
        const apiKey = request.headers.get('X-Admin-Key');
        if (!env.ADMIN_API_KEY || apiKey !== env.ADMIN_API_KEY) return new Response(JSON.stringify({ error: 'Unauthorized' }), { status: 401, headers: corsHeaders });

        if (url.pathname === '/api/admin/login' && method === 'POST') {
          return new Response(JSON.stringify({ success: true }), { headers: corsHeaders });
        }
        if (url.pathname === '/api/admin/chains') {
          if (method === 'GET') return handleGetAdminChains(env.DB, corsHeaders);
          if (method === 'POST') return handleAddChain(env.DB, await request.json(), corsHeaders);
        }
        if (url.pathname.match(/^\/api\/admin\/chains\/\d+$/)) {
          const chainId = parseInt(url.pathname.split('/').pop()!);
          if (method === 'PUT') return handleUpdateChain(env.DB, chainId, await request.json(), corsHeaders);
          if (method === 'DELETE') return handleDeleteChain(env.DB, chainId, corsHeaders);
        }

        if (url.pathname === '/api/admin/backfill' && method === 'POST') {
          const body = await request.json() as { chainId?: number; fromBlock?: number; toBlock?: number };
          return handleHistoricalBackfill(env, body.chainId || 8453, body.fromBlock, body.toBlock, corsHeaders);
        }
        if (url.pathname === '/api/admin/sync' && method === 'POST') {
          await runIndexer(env);
          return new Response(JSON.stringify({ success: true }), { headers: corsHeaders });
        }
        if (url.pathname === '/api/admin/import' && method === 'POST') {
          const body = await request.json();
          return handleImportData(env.DB, body, corsHeaders);
        }
      }

      return new Response(JSON.stringify({ message: 'Gnoma Explorer API', version: '3.0' }), { headers: corsHeaders });
    } catch (e: any) {
      return new Response(JSON.stringify({ error: e.message, stack: e.stack }), { status: 500, headers: corsHeaders });
    }
  },
  async scheduled(event: ScheduledEvent, env: Env, ctx: ExecutionContext) {
    ctx.waitUntil(runIndexer(env));
  }
};

// --- Handlers ---

async function handleGetChains(db: D1Database, headers: any) {
  const { results } = await db.prepare('SELECT id, name, explorer_url, icon FROM chains WHERE is_enabled = 1').all();
  return new Response(JSON.stringify(results), { headers });
}

async function handleGetAdminChains(db: D1Database, headers: any) {
  // Admin sees ALL chains, including disabled ones + full details
  const { results } = await db.prepare('SELECT * FROM chains ORDER BY id').all();
  return new Response(JSON.stringify(results), { headers });
}

async function handleAddChain(db: D1Database, body: any, headers: any) {
  const { name, rpc_url, contract_address, start_block, explorer_url, icon } = body;
  if (!name || !rpc_url || !contract_address) return new Response(JSON.stringify({ error: 'Missing required fields' }), { status: 400, headers });

  try {
    const res = await db.prepare('INSERT INTO chains (name, rpc_url, contract_address, start_block, explorer_url, icon, is_enabled) VALUES (?, ?, ?, ?, ?, ?, 1) RETURNING id')
      .bind(name, rpc_url, contract_address, start_block || 0, explorer_url, icon || 'https://raw.githubusercontent.com/trustwallet/assets/master/blockchains/ethereum/info/logo.png')
      .first<{ id: number }>();

    if (!res) throw new Error('Failed to create chain');
    return new Response(JSON.stringify({ success: true, id: res.id }), { headers });
  } catch (e: any) {
    return new Response(JSON.stringify({ error: e.message }), { status: 500, headers });
  }
}

async function handleUpdateChain(db: D1Database, id: number, body: any, headers: any) {
  const { name, rpc_url, contract_address, start_block, explorer_url, icon, is_enabled } = body;
  try {
    // Build dynamic update query
    const updates: string[] = [];
    const args: any[] = [];
    if (name !== undefined) { updates.push('name = ?'); args.push(name); }
    if (rpc_url !== undefined) { updates.push('rpc_url = ?'); args.push(rpc_url); }
    if (contract_address !== undefined) { updates.push('contract_address = ?'); args.push(contract_address); }
    if (start_block !== undefined) { updates.push('start_block = ?'); args.push(start_block); }
    if (explorer_url !== undefined) { updates.push('explorer_url = ?'); args.push(explorer_url); }
    if (icon !== undefined) { updates.push('icon = ?'); args.push(icon); }
    if (is_enabled !== undefined) { updates.push('is_enabled = ?'); args.push(is_enabled ? 1 : 0); }

    if (updates.length === 0) return new Response(JSON.stringify({ success: true, message: 'No changes' }), { headers });

    args.push(id);
    await db.prepare(`UPDATE chains SET ${updates.join(', ')} WHERE id = ?`).bind(...args).run();
    return new Response(JSON.stringify({ success: true }), { headers });
  } catch (e: any) {
    return new Response(JSON.stringify({ error: e.message }), { status: 500, headers });
  }
}

async function handleDeleteChain(db: D1Database, id: number, headers: any) {
  try {
    await db.prepare('DELETE FROM chains WHERE id = ?').bind(id).run();
    // Optional: cascade delete events? Probably safer to keep data or require manual cleanup
    // For now just delete config.
    return new Response(JSON.stringify({ success: true }), { headers });
  } catch (e: any) {
    return new Response(JSON.stringify({ error: e.message }), { status: 500, headers });
  }
}

// Proxy Blockscout to avoid CORS
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

async function handleGetStats(db: D1Database, chainId: number, headers: any) {
  const countQuery = await db.prepare('SELECT COUNT(*) as intentCount, COUNT(DISTINCT solver_address) as uniqueSolvers, COALESCE(SUM(CAST(gas_used AS INTEGER)), 0) as totalGasUsed FROM events WHERE chain_id = ?').bind(chainId).first();
  const payloadQuery = await db.prepare('SELECT COUNT(*) as payloadCount FROM payloads WHERE chain_id = ?').bind(chainId).first();

  // Volume from token transfers (real multi-asset USD value)
  const volQuery = await db.prepare('SELECT COALESCE(SUM(amount_usd), 0) as totalVolumeUsd FROM token_transfers WHERE chain_id = ?').bind(chainId).first();

  // Unique assets tracked
  const assetQuery = await db.prepare('SELECT COUNT(DISTINCT token_address) as assetCount FROM token_transfers WHERE chain_id = ?').bind(chainId).first();

  const totalIntents = ((countQuery?.intentCount as number) || 0) + ((payloadQuery?.payloadCount as number) || 0);

  return new Response(JSON.stringify({
    totalVolume: ((volQuery?.totalVolumeUsd as number) || 0),
    intentCount: totalIntents,
    uniqueSolvers: (countQuery?.uniqueSolvers as number) || 0,
    totalGasUsed: (countQuery?.totalGasUsed as number) || 0,
    assetCount: (assetQuery?.assetCount as number) || 0,
  }), { headers });
}

async function handleGetLatestTransactions(db: D1Database, chainId: number, headers: any) {
  const { results } = await db.prepare('SELECT tx_hash, block_number, solver_address, value_wei, gas_used, timestamp, (SELECT payload_type FROM payloads WHERE payloads.tx_hash = events.tx_hash LIMIT 1) as primary_type FROM events WHERE chain_id = ? ORDER BY block_number DESC LIMIT 20').bind(chainId).all();
  return new Response(JSON.stringify(results), { headers });
}

async function handleGetSolvers(db: D1Database, chainId: number, headers: any) {
  const { results } = await db.prepare('SELECT address, tx_count, total_gas_spent, total_value_processed, first_seen, last_seen FROM solvers WHERE chain_id = ? ORDER BY tx_count DESC LIMIT 20').bind(chainId).all();
  return new Response(JSON.stringify(results), { headers });
}

async function handleGetDailyStats(db: D1Database, chainId: number, days: number, headers: any) {
  const { results } = await db.prepare('SELECT date, intent_count as count, total_volume as volume, unique_solvers, total_gas_used, gas_saved FROM daily_stats WHERE chain_id = ? ORDER BY date DESC LIMIT ?').bind(chainId, days).all();
  return new Response(JSON.stringify(results?.reverse() || []), { headers });
}

async function handleGetAssets(db: D1Database, chainId: number, headers: any) {
  const { results } = await db.prepare('SELECT token_address, token_symbol as asset_symbol, flow_in, flow_out, tx_count FROM asset_flows WHERE chain_id = ? ORDER BY tx_count DESC').bind(chainId).all();
  return new Response(JSON.stringify(results), { headers });
}

async function handleGetNetworkHealth(db: D1Database, chainId: number, headers: any) {
  // TVL from token transfers (net inflows to contract)
  const tvlQuery = await db.prepare('SELECT COALESCE(SUM(amount_usd), 0) as tvl FROM token_transfers WHERE chain_id = ? AND to_address = ?').bind(chainId, '0x9ed43c229480659bf6b6607c46d7b96c6d760cbb').first();
  const outQuery = await db.prepare('SELECT COALESCE(SUM(amount_usd), 0) as outflow FROM token_transfers WHERE chain_id = ? AND from_address = ?').bind(chainId, '0x9ed43c229480659bf6b6607c46d7b96c6d760cbb').first();
  const tvl = Math.max(0, ((tvlQuery?.tvl as number) || 0) - ((outQuery?.outflow as number) || 0));

  return new Response(JSON.stringify({
    tvl,
    shieldingRate: 0
  }), { headers });
}

async function handleGetPrivacyStats(db: D1Database, chainId: number, headers: any) {
  const { results } = await db.prepare('SELECT block_number, timestamp, estimated_pool_size, root_hash FROM privacy_pool_stats WHERE chain_id = ? ORDER BY block_number DESC LIMIT 50').bind(chainId).all();
  return new Response(JSON.stringify(results?.reverse() || []), { headers });
}

async function handleGetPayloadStats(db: D1Database, chainId: number, headers: any) {
  const { results } = await db.prepare('SELECT payload_type as type, COUNT(*) as count FROM payloads WHERE chain_id = ? GROUP BY payload_type').bind(chainId).all();
  return new Response(JSON.stringify(results), { headers });
}

// NEW: Transaction detail endpoint
async function handleGetTxDetail(db: D1Database, chainId: number, txHash: string, headers: any) {
  const event = await db.prepare('SELECT tx_hash, block_number, event_type, solver_address, value_wei, gas_used, gas_price_wei, data_json, decoded_input, timestamp FROM events WHERE chain_id = ? AND tx_hash = ?').bind(chainId, txHash).first();
  if (!event) return new Response(JSON.stringify({ error: 'Transaction not found' }), { status: 404, headers });

  const { results: payloads } = await db.prepare('SELECT payload_type, payload_index, blob, timestamp FROM payloads WHERE chain_id = ? AND tx_hash = ? ORDER BY payload_index').bind(chainId, txHash).all();
  const { results: tokenTransfers } = await db.prepare('SELECT token_address, token_symbol, token_decimals, from_address, to_address, amount_raw, amount_display, amount_usd, timestamp FROM token_transfers WHERE chain_id = ? AND tx_hash = ? ORDER BY id').bind(chainId, txHash).all();
  const privacyRoot = await db.prepare('SELECT root_hash, estimated_pool_size FROM privacy_pool_stats WHERE chain_id = ? AND block_number = (SELECT block_number FROM events WHERE chain_id = ? AND tx_hash = ?)').bind(chainId, chainId, txHash).first();

  return new Response(JSON.stringify({
    ...event,
    payloads: payloads || [],
    tokenTransfers: tokenTransfers || [],
    privacyRoot: privacyRoot || null
  }), { headers });
}

// NEW: Solver detail endpoint
async function handleGetSolverDetail(db: D1Database, chainId: number, address: string, headers: any) {
  const solver = await db.prepare('SELECT address, tx_count, total_gas_spent, total_value_processed, first_seen, last_seen FROM solvers WHERE chain_id = ? AND address = ?').bind(chainId, address.toLowerCase()).first();
  if (!solver) return new Response(JSON.stringify({ error: 'Solver not found' }), { status: 404, headers });

  const { results: recentTxs } = await db.prepare('SELECT tx_hash, block_number, value_wei, gas_used, timestamp FROM events WHERE chain_id = ? AND solver_address = ? ORDER BY block_number DESC LIMIT 50').bind(chainId, address.toLowerCase()).all();

  // Daily activity for sparkline 
  const { results: dailyActivity } = await db.prepare('SELECT DATE(timestamp, "unixepoch") as date, COUNT(*) as count FROM events WHERE chain_id = ? AND solver_address = ? GROUP BY date ORDER BY date DESC LIMIT 30').bind(chainId, address.toLowerCase()).all();

  // Total volume processed by this solver
  const volQuery = await db.prepare('SELECT COALESCE(SUM(t.amount_usd), 0) as totalVolume FROM token_transfers t JOIN events e ON t.chain_id = e.chain_id AND t.tx_hash = e.tx_hash WHERE e.chain_id = ? AND e.solver_address = ?').bind(chainId, address.toLowerCase()).first();

  return new Response(JSON.stringify({
    ...solver,
    totalVolumeUsd: (volQuery?.totalVolume as number) || 0,
    recentTransactions: recentTxs || [],
    dailyActivity: (dailyActivity || []).reverse()
  }), { headers });
}

// NEW: Token transfers endpoint
async function handleGetTokenTransfers(db: D1Database, params: URLSearchParams, headers: any) {
  const chainId = parseInt(params.get('chainId') || '8453');
  const txHash = params.get('txHash');
  const tokenAddress = params.get('token');
  const page = parseInt(params.get('page') || '1');
  const limit = Math.min(parseInt(params.get('limit') || '50'), 100);
  const offset = (page - 1) * limit;

  let query = 'SELECT tx_hash, block_number, token_address, token_symbol, token_decimals, from_address, to_address, amount_raw, amount_display, amount_usd, timestamp FROM token_transfers WHERE chain_id = ?';
  const args: any[] = [chainId];

  if (txHash) { query += ' AND tx_hash = ?'; args.push(txHash); }
  if (tokenAddress) { query += ' AND token_address = ?'; args.push(tokenAddress.toLowerCase()); }

  const countStr = query.replace(/SELECT .+ FROM/, 'SELECT COUNT(*) as total FROM');
  const countResult = await db.prepare(countStr).bind(...args).first();
  const total = (countResult?.total as number) || 0;

  query += ' ORDER BY timestamp DESC LIMIT ? OFFSET ?';
  args.push(limit, offset);

  const { results } = await db.prepare(query).bind(...args).all();

  // Also return per-asset summary
  const { results: assetSummary } = await db.prepare('SELECT token_address, token_symbol, token_decimals, COUNT(*) as transfer_count, SUM(amount_display) as total_amount, SUM(amount_usd) as total_usd FROM token_transfers WHERE chain_id = ? GROUP BY token_address ORDER BY total_usd DESC').bind(chainId).all();

  return new Response(JSON.stringify({
    data: results,
    assetSummary: assetSummary || [],
    pagination: { page, limit, total, totalPages: Math.ceil(total / limit) }
  }), { headers });
}

async function handleGetTransactions(db: D1Database, params: URLSearchParams, headers: any) {
  const chainId = parseInt(params.get('chainId') || '8453');
  const address = params.get('address');
  const hash = params.get('hash');
  const page = parseInt(params.get('page') || '1');
  const limit = Math.min(parseInt(params.get('limit') || '50'), 100); // Max 100
  const offset = (page - 1) * limit;

  let query = 'SELECT tx_hash, block_number, solver_address, value_wei, gas_used, timestamp, decoded_input FROM events WHERE chain_id = ?';
  const args: any[] = [chainId];

  if (address) {
    query += ' AND (solver_address = ? OR json_extract(decoded_input, "$.args.transaction.actions[0].appData") LIKE ?)';
    args.push(address.toLowerCase());
    args.push(address.toLowerCase());
  } else if (hash) {
    query += ' AND tx_hash = ?';
    args.push(hash);
  }

  // Get total count (approximate for performance if needed, but exact is better for pagination)
  // For simplicity/speed, we might skip total count or do a separate query. 
  // Let's do a separate query for count if page=1 or just return count with data.
  // actually standard pagination usually needs count.
  const countQueryStr = query.replace('SELECT tx_hash, block_number, solver_address, value_wei, gas_used, timestamp, decoded_input', 'SELECT COUNT(*) as total');
  const countResult = await db.prepare(countQueryStr).bind(...args).first();
  const total = (countResult?.total as number) || 0;

  query += ' ORDER BY block_number DESC LIMIT ? OFFSET ?';
  args.push(limit, offset);

  const { results } = await db.prepare(query).bind(...args).all();

  return new Response(JSON.stringify({
    data: results,
    pagination: {
      page,
      limit,
      total,
      totalPages: Math.ceil(total / limit)
    }
  }), { headers });
}

async function handleHistoricalBackfill(env: Env, chainId: number, fromBlock?: number, toBlock?: number, headers?: any) {
  const chain = await env.DB.prepare('SELECT * FROM chains WHERE id = ?').bind(chainId).first<ChainConfig>();
  if (!chain) return new Response(JSON.stringify({ error: 'Chain not found' }), { status: 404, headers });
  const currentBlockHex = await rpcRequest(chain.rpc_url, 'eth_blockNumber', []);
  const currentBlock = parseInt(currentBlockHex, 16);
  const start = fromBlock || chain.start_block;
  const end = toBlock || currentBlock;
  const result = await syncBlockRange(chain, env.DB, start, end);
  return new Response(JSON.stringify({ success: true, firstBatchResult: result }), { headers });
}

async function handleImportData(db: D1Database, data: any, headers: any) {
  const batch: D1PreparedStatement[] = [];

  if (data.events) {
    for (const e of data.events) {
      batch.push(db.prepare('INSERT INTO events (chain_id, tx_hash, block_number, event_type, solver_address, value_wei, gas_used, gas_price_wei, data_json, decoded_input, timestamp) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?) ON CONFLICT(chain_id, tx_hash) DO UPDATE SET decoded_input=excluded.decoded_input').bind(e.chain_id, e.tx_hash, e.block_number, e.event_type, e.solver_address, e.value_wei, e.gas_used, e.gas_price_wei, e.data_json, e.decoded_input ? JSON.stringify(e.decoded_input) : null, e.timestamp));
    }
  }
  if (data.payloads) {
    for (const p of data.payloads) {
      batch.push(db.prepare('INSERT INTO payloads (chain_id, tx_hash, block_number, payload_type, payload_index, blob, timestamp) VALUES (?, ?, ?, ?, ?, ?, ?) ON CONFLICT(chain_id, tx_hash, payload_type, payload_index) DO NOTHING').bind(p.chain_id, p.tx_hash, p.block_number, p.payload_type, p.payload_index, p.blob, p.timestamp));
    }
  }
  if (data.privacy_stats) {
    for (const p of data.privacy_stats) {
      batch.push(db.prepare('INSERT INTO privacy_pool_stats (chain_id, block_number, root_hash, timestamp, estimated_pool_size) VALUES (?, ?, ?, ?, ?) ON CONFLICT(chain_id, root_hash) DO UPDATE SET estimated_pool_size=excluded.estimated_pool_size').bind(p.chain_id, p.block_number, p.root_hash, p.timestamp, p.estimated_pool_size));
    }
  }
  if (data.solvers) {
    for (const s of data.solvers) {
      batch.push(db.prepare('INSERT INTO solvers (chain_id, address, tx_count, total_gas_spent, total_value_processed, first_seen, last_seen) VALUES (?, ?, ?, ?, ?, ?, ?) ON CONFLICT(chain_id, address) DO UPDATE SET tx_count=tx_count+excluded.tx_count, total_gas_spent=CAST(CAST(total_gas_spent AS INTEGER)+CAST(excluded.total_gas_spent AS INTEGER) AS TEXT), total_value_processed=CAST(CAST(total_value_processed AS INTEGER)+CAST(excluded.total_value_processed AS INTEGER) AS TEXT), last_seen=MAX(last_seen, excluded.last_seen)').bind(s.chain_id, s.address, s.count, s.gas, s.val, s.timestamp, s.timestamp));
    }
  }
  if (data.assets) {
    for (const a of data.assets) {
      batch.push(db.prepare('INSERT INTO asset_flows (chain_id, token_address, token_symbol, flow_in, flow_out, tx_count) VALUES (?, ?, ?, ?, ?, 1) ON CONFLICT(chain_id, token_address) DO UPDATE SET flow_in=CAST(CAST(flow_in AS INTEGER)+CAST(excluded.flow_in AS INTEGER) AS TEXT), flow_out=CAST(CAST(flow_out AS INTEGER)+CAST(excluded.flow_out AS INTEGER) AS TEXT), tx_count=tx_count+1').bind(a.chain_id, a.token_address, a.token_symbol, a.flow_in, a.flow_out));
    }
  }
  if (data.daily_stats) {
    for (const d of data.daily_stats) {
      batch.push(db.prepare('INSERT INTO daily_stats (chain_id, date, intent_count, total_volume, unique_solvers, total_gas_used, gas_saved) VALUES (?, ?, ?, ?, ?, ?, ?) ON CONFLICT(chain_id, date) DO UPDATE SET intent_count=excluded.intent_count, total_volume=excluded.total_volume, unique_solvers=excluded.unique_solvers, total_gas_used=excluded.total_gas_used').bind(d.chain_id, d.date, d.count, d.volume || '0', d.unique_solvers || 1, d.gas || 0, 0));
    }
  }
  if (data.token_transfers) {
    for (const t of data.token_transfers) {
      batch.push(db.prepare('INSERT INTO token_transfers (chain_id, tx_hash, block_number, token_address, token_symbol, token_decimals, from_address, to_address, amount_raw, amount_display, amount_usd, timestamp) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?) ON CONFLICT(chain_id, tx_hash, token_address, from_address, to_address) DO UPDATE SET amount_usd=excluded.amount_usd').bind(t.chain_id, t.tx_hash, t.block_number, t.token_address, t.token_symbol, t.token_decimals, t.from_address, t.to_address, t.amount_raw, t.amount_display, t.amount_usd, t.timestamp));
    }
  }

  const BATCH_LIMIT = 20;
  for (let i = 0; i < batch.length; i += BATCH_LIMIT) {
    await db.batch(batch.slice(i, i + BATCH_LIMIT));
  }
  return new Response(JSON.stringify({ success: true, count: batch.length }), { headers });
}

// --- Indexer Logic ---

async function runIndexer(env: Env) {
  const { results } = await env.DB.prepare('SELECT * FROM chains WHERE is_enabled = 1').all<ChainConfig>();
  for (const chain of results || []) {
    try {
      const lastSync = await env.DB.prepare('SELECT last_block FROM sync_state WHERE chain_id = ?').bind(chain.id).first();
      const fromBlock = (lastSync?.last_block as number) || chain.start_block;
      const currentBlockHex = await rpcRequest(chain.rpc_url, 'eth_blockNumber', []);
      const currentBlock = parseInt(currentBlockHex, 16);
      if (fromBlock >= currentBlock) continue;

      // Index in small steps to avoid timeouts
      await syncBlockRange(chain, env.DB, fromBlock, Math.min(fromBlock + 500, currentBlock));
    } catch (e) { console.error(`Failed to sync chain ${chain.name}:`, e); }
  }
}

async function syncBlockRange(chain: ChainConfig, db: D1Database, fromBlock: number, toBlock: number) {
  const logs = await rpcRequest(chain.rpc_url, 'eth_getLogs', [{
    fromBlock: '0x' + fromBlock.toString(16),
    toBlock: '0x' + toBlock.toString(16),
    address: chain.contract_address,
    topics: [Object.values(TOPICS)]
  }]);

  if (logs.length === 0) {
    await db.prepare('INSERT INTO sync_state (chain_id, last_block) VALUES (?, ?) ON CONFLICT(chain_id) DO UPDATE SET last_block = ?, updated_at = strftime(\'%s\', \'now\')').bind(chain.id, toBlock, toBlock).run();
    return { eventsFound: 0, blocksProcessed: toBlock - fromBlock };
  }

  const txHashes = Array.from(new Set(logs.map((l: any) => l.transactionHash)));
  const CONCURRENCY = 10;
  const receipts: any[] = [];

  for (let i = 0; i < txHashes.length; i += CONCURRENCY) {
    const batchHashes = txHashes.slice(i, i + CONCURRENCY);
    const batchReceipts = await Promise.all(batchHashes.map(hash =>
      rpcRequest(chain.rpc_url, 'eth_getTransactionReceipt', [hash]).catch(() => null)
    ));
    receipts.push(...batchReceipts);
  }

  const receiptMap = new Map(receipts.filter(r => r !== null).map(r => [r.transactionHash, r]));
  const logsByTx: Record<string, any[]> = {};
  for (const log of logs) {
    if (!logsByTx[log.transactionHash]) logsByTx[log.transactionHash] = [];
    logsByTx[log.transactionHash].push(log);
  }

  const batch: D1PreparedStatement[] = [];
  const solverUpdates: Map<string, any> = new Map();
  const dailyAggregates: Map<string, any> = new Map();
  const assetUpdates: Map<string, any> = new Map();
  const tokenTransferRows: any[] = [];  // Collect for batch Pyth price lookup

  const poolQuery = await db.prepare('SELECT MAX(estimated_pool_size) as poolSize FROM privacy_pool_stats WHERE chain_id = ?').bind(chain.id).first();
  let cumulativePoolSize = (poolQuery?.poolSize as number) || 0;

  for (const txHash in logsByTx) {
    const txReceipt = receiptMap.get(txHash);
    if (!txReceipt) continue;

    const txLogs = logsByTx[txHash];
    const solverAddress = txReceipt.from?.toLowerCase();
    const blockNumber = parseInt(txLogs[0].blockNumber, 16);
    // Note: getBlockByNumber required for timestamp, skipping for perf/batch optimization (using Date.now() or approximate if block not fetched). 
    // Ideally we fetch block. For now, assume current time or fetch block sparingly.
    // To be safe, we will fetch block.
    const block = await rpcRequest(chain.rpc_url, 'eth_getBlockByNumber', [txLogs[0].blockNumber, false]);
    const timestamp = parseInt(block?.timestamp || '0x0', 16);
    const date = new Date(timestamp * 1000).toISOString().split('T')[0];

    // 1. Transaction Value (ETH)
    // We don't have tx value in receipt, need 'eth_getTransactionByHash' for that. 
    // To save calls, we can skip ETH value tracking or do it in a separate call.
    // Let's fetch tx data.
    const txData = await rpcRequest(chain.rpc_url, 'eth_getTransactionByHash', [txHash]);
    const valWei = BigInt(txData?.value || '0x0');

    // 2. Asset Flows (ERC20s) + Token Transfers
    for (const rLog of txReceipt.logs) {
      if (rLog.topics[0] === ERC20_TRANSFER_TOPIC) {
        const from = ('0x' + (rLog.topics[1]?.slice(26) || '')).toLowerCase();
        const to = ('0x' + (rLog.topics[2]?.slice(26) || '')).toLowerCase();
        const amount = BigInt(rLog.data || '0x0');
        const tokenAddr = rLog.address.toLowerCase();

        // Track ALL token transfers for this tx
        tokenTransferRows.push({
          chain_id: chain.id,
          tx_hash: txHash,
          block_number: blockNumber,
          token_address: tokenAddr,
          from_address: from,
          to_address: to,
          amount_raw: amount.toString(),
          timestamp: timestamp
        });

        if (to === SHIELDED_POOL_ADDRESS || from === SHIELDED_POOL_ADDRESS) {
          const key = tokenAddr;
          const a = assetUpdates.get(key) || { in: BigInt(0), out: BigInt(0) };
          if (to === SHIELDED_POOL_ADDRESS) a.in += amount;
          else a.out += amount;
          assetUpdates.set(key, a);
        }
      }
    }

    const gasUsed = parseInt(txReceipt.gasUsed || '0x0', 16);
    const gasPrice = BigInt(txReceipt.effectiveGasPrice || '0x0');

    for (const log of txLogs) {
      if (log.topics[0] === TOPICS.TRANSACTION_EXECUTED) {
        batch.push(db.prepare('INSERT INTO events (chain_id, tx_hash, block_number, event_type, solver_address, value_wei, gas_used, gas_price_wei, data_json, timestamp) VALUES (?, ?, ?, \'TransactionExecuted\', ?, ?, ?, ?, ?, ?) ON CONFLICT(chain_id, tx_hash) DO UPDATE SET value_wei=excluded.value_wei, gas_used=excluded.gas_used').bind(chain.id, txHash, blockNumber, solverAddress, valWei.toString(), gasUsed, gasPrice.toString(), JSON.stringify(log.topics), timestamp));
      } else if (log.topics[0] === TOPICS.COMMITMENT_ROOT_ADDED) {
        try {
          const root = decodeAbiParameters(parseAbiParameters('bytes32 root'), log.data)[0];
          cumulativePoolSize++;
          batch.push(db.prepare('INSERT INTO privacy_pool_stats (chain_id, block_number, root_hash, timestamp, estimated_pool_size) VALUES (?, ?, ?, ?, ?) ON CONFLICT(chain_id, root_hash) DO NOTHING').bind(chain.id, blockNumber, root, timestamp, cumulativePoolSize));
        } catch { }
      } else if ([TOPICS.RESOURCE_PAYLOAD, TOPICS.DISCOVERY_PAYLOAD, TOPICS.EXTERNAL_PAYLOAD, TOPICS.APPLICATION_PAYLOAD].includes(log.topics[0])) {
        const type = log.topics[0] === TOPICS.RESOURCE_PAYLOAD ? 'Resource' : log.topics[0] === TOPICS.DISCOVERY_PAYLOAD ? 'Discovery' : log.topics[0] === TOPICS.EXTERNAL_PAYLOAD ? 'External' : 'Application';
        batch.push(db.prepare('INSERT INTO payloads (chain_id, tx_hash, block_number, payload_type, payload_index, blob, timestamp) VALUES (?, ?, ?, ?, 0, ?, ?) ON CONFLICT(chain_id, tx_hash, payload_type, payload_index) DO NOTHING').bind(chain.id, txHash, blockNumber, type, log.data, timestamp));
      }
    }

    const s = solverUpdates.get(solverAddress) || { count: 0, gas: BigInt(0), val: BigInt(0) };
    s.count++; s.gas += BigInt(gasUsed) * gasPrice; s.val += valWei; // Tracking ETH value processed
    solverUpdates.set(solverAddress, s);

    const d = dailyAggregates.get(date) || { intents: 0, vol: BigInt(0), gas: 0, solvers: new Set() };
    d.intents++; d.vol += valWei; d.gas += gasUsed; d.solvers.add(solverAddress);
    dailyAggregates.set(date, d);
  }

  // --- Pyth Price Resolution for token transfers ---
  if (tokenTransferRows.length > 0) {
    // 1. Collect unique token addresses
    const uniqueTokens = [...new Set(tokenTransferRows.map(t => t.token_address))];

    // 2. Batch fetch metadata for all tokens
    const metadataMap = new Map<string, { symbol: string; decimals: number }>();
    for (const addr of uniqueTokens) {
      metadataMap.set(addr, await fetchTokenMetadata(addr, chain.rpc_url));
    }

    // 3. Batch fetch Pyth prices for all tokens
    const pricesMap = await fetchPythPrices(uniqueTokens);

    // 4. Insert token_transfers with real USD values
    for (const t of tokenTransferRows) {
      const meta = metadataMap.get(t.token_address) || { symbol: 'UNKNOWN', decimals: 18 };
      const priceUsd = pricesMap.get(t.token_address) || 0;
      const amountDisplay = Number(BigInt(t.amount_raw)) / Math.pow(10, meta.decimals);
      const amountUsd = amountDisplay * priceUsd;

      batch.push(db.prepare(
        'INSERT INTO token_transfers (chain_id, tx_hash, block_number, token_address, token_symbol, token_decimals, from_address, to_address, amount_raw, amount_display, amount_usd, timestamp) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?) ON CONFLICT(chain_id, tx_hash, token_address, from_address, to_address) DO UPDATE SET amount_usd=excluded.amount_usd'
      ).bind(t.chain_id, t.tx_hash, t.block_number, t.token_address, meta.symbol, meta.decimals, t.from_address, t.to_address, t.amount_raw, amountDisplay, amountUsd, t.timestamp));
    }
  }

  // Batch Inserts — Asset Flows
  for (const [token, a] of assetUpdates) {
    const meta = metadataCache.get(token) || KNOWN_TOKEN_META[token] || { symbol: 'UNKNOWN' };
    batch.push(db.prepare('INSERT INTO asset_flows (chain_id, token_address, token_symbol, flow_in, flow_out, tx_count) VALUES (?, ?, ?, ?, ?, 1) ON CONFLICT(chain_id, token_address) DO UPDATE SET flow_in=CAST(CAST(flow_in AS INTEGER)+CAST(? AS INTEGER) AS TEXT), flow_out=CAST(CAST(flow_out AS INTEGER)+CAST(? AS INTEGER) AS TEXT), tx_count=tx_count+1').bind(chain.id, token, meta.symbol, a.in.toString(), a.out.toString()));
  }

  for (const [addr, s] of solverUpdates) batch.push(db.prepare('INSERT INTO solvers (chain_id, address, tx_count, total_gas_spent, total_value_processed) VALUES (?, ?, ?, ?, ?) ON CONFLICT(chain_id, address) DO UPDATE SET tx_count=tx_count+?, total_gas_spent=CAST(CAST(total_gas_spent AS INTEGER)+CAST(? AS INTEGER) AS TEXT), total_value_processed=CAST(CAST(total_value_processed AS INTEGER)+CAST(? AS INTEGER) AS TEXT)').bind(chain.id, addr, s.count, s.gas.toString(), s.val.toString(), s.count, s.gas.toString(), s.val.toString()));

  for (const [date, d] of dailyAggregates) batch.push(db.prepare('INSERT INTO daily_stats (chain_id, date, intent_count, total_volume, unique_solvers, total_gas_used, gas_saved) VALUES (?, ?, ?, ?, ?, ?, ?) ON CONFLICT(chain_id, date) DO UPDATE SET intent_count=intent_count+?, total_volume=CAST(CAST(total_volume AS INTEGER)+CAST(? AS INTEGER) AS TEXT)').bind(chain.id, date, d.intents, d.vol.toString(), d.solvers.size, d.gas, 0, d.intents, d.vol.toString()));

  const STMT_LIMIT = 20;
  for (let i = 0; i < batch.length; i += STMT_LIMIT) {
    await db.batch(batch.slice(i, i + STMT_LIMIT));
  }

  await db.prepare('INSERT INTO sync_state (chain_id, last_block) VALUES (?, ?) ON CONFLICT(chain_id) DO UPDATE SET last_block = ?, updated_at = strftime(\'%s\', \'now\')').bind(chain.id, toBlock, toBlock).run();
  return { eventsFound: logs.length, blocksProcessed: toBlock - fromBlock };
}

async function rpcRequest(url: string, method: string, params: any[]) {
  const r = await fetch(url, { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ jsonrpc: '2.0', id: 1, method, params }) });
  const j: any = await r.json();
  if (j.error) throw new Error(j.error.message);
  return j.result;
}