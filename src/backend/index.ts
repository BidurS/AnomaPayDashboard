/**
 * AnomaPay Multichain Indexer & API
 * 
 * Cloudflare Worker that:
 * 1. Indexes 'TransactionExecuted' events from DB-configured chains via Cron Trigger.
 * 2. Serves analytics API via HTTP fetch handler.
 * 3. Provides admin API for chain management.
 */

interface Env {
  DB: D1Database;
  ADMIN_API_KEY?: string; // Optional: Set in wrangler.toml for admin auth
}

// --- Types ---

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

interface StatResponse {
  totalVolume: number;
  intentCount: number;
  uniqueSolvers: number;
  avgGasPrice: string;
}

// For the purpose of this demo, we use a placeholder topic.
// In production, use proper keccak256 of "TransactionExecuted(bytes32,address,uint256)"
const TRANSACTION_EXECUTED_TOPIC = '0x7e834d8906f362241680d2fc2c43141209b0b83321db8dc92fb2b8423297a72d';

// --- Worker Handlers ---

export default {
  async fetch(request: Request, env: Env): Promise<Response> {
    const url = new URL(request.url);
    const method = request.method;

    // CORS headers
    const corsHeaders = {
      'Content-Type': 'application/json',
      'Access-Control-Allow-Origin': '*',
      'Access-Control-Allow-Methods': 'GET, POST, PUT, DELETE, OPTIONS',
      'Access-Control-Allow-Headers': 'Content-Type, X-Admin-Key',
    };

    if (method === 'OPTIONS') {
      return new Response(null, { headers: corsHeaders });
    }

    // --- Public API ---
    if (url.pathname === '/api/chains') {
      return handleGetChains(env.DB, corsHeaders);
    }

    if (url.pathname === '/api/stats') {
      const chainId = parseInt(url.searchParams.get('chainId') || '8453');
      return handleGetStats(env.DB, chainId, corsHeaders);
    }

    if (url.pathname === '/api/latest-transactions') {
      const chainId = parseInt(url.searchParams.get('chainId') || '8453');
      return handleGetLatestTransactions(env.DB, chainId, corsHeaders);
    }

    // --- Admin API (Protected) ---
    if (url.pathname.startsWith('/api/admin/')) {
      // Simple API key auth
      const apiKey = request.headers.get('X-Admin-Key');
      if (env.ADMIN_API_KEY && apiKey !== env.ADMIN_API_KEY) {
        return new Response(JSON.stringify({ error: 'Unauthorized' }), { status: 401, headers: corsHeaders });
      }

      // GET /api/admin/chains - List all chains (including disabled)
      if (url.pathname === '/api/admin/chains' && method === 'GET') {
        return handleAdminGetChains(env.DB, corsHeaders);
      }

      // POST /api/admin/chains - Add a new chain
      if (url.pathname === '/api/admin/chains' && method === 'POST') {
        const body = await request.json() as Partial<ChainConfig>;
        return handleAdminAddChain(env.DB, body, corsHeaders);
      }

      // PUT /api/admin/chains/:id - Update a chain
      const updateMatch = url.pathname.match(/^\/api\/admin\/chains\/(\d+)$/);
      if (updateMatch && method === 'PUT') {
        const chainId = parseInt(updateMatch[1]);
        const body = await request.json() as Partial<ChainConfig>;
        return handleAdminUpdateChain(env.DB, chainId, body, corsHeaders);
      }

      // DELETE /api/admin/chains/:id - Delete a chain
      if (updateMatch && method === 'DELETE') {
        const chainId = parseInt(updateMatch[1]);
        return handleAdminDeleteChain(env.DB, chainId, corsHeaders);
      }
    }

    return new Response(JSON.stringify({ message: 'AnomaPay Indexer API' }), { headers: corsHeaders });
  },

  async scheduled(event: ScheduledEvent, env: Env, ctx: ExecutionContext) {
    ctx.waitUntil(runIndexer(env));
  }
};

// --- Public API Handlers ---

async function handleGetChains(db: D1Database, headers: Record<string, string>): Promise<Response> {
  const { results } = await db.prepare('SELECT id, name, explorer_url, icon FROM chains WHERE is_enabled = 1').all();
  return new Response(JSON.stringify(results), { headers });
}

async function handleGetStats(db: D1Database, chainId: number, headers: Record<string, string>): Promise<Response> {
  const query = `
    SELECT 
      COUNT(*) as intentCount, 
      COUNT(DISTINCT json_extract(data_json, '$.solver')) as uniqueSolvers 
    FROM events 
    WHERE chain_id = ?
  `;
  const result = await db.prepare(query).bind(chainId).first();

  const response: StatResponse = {
    totalVolume: 1250000, // Mock for demo
    intentCount: result?.intentCount as number || 0,
    uniqueSolvers: result?.uniqueSolvers as number || 0,
    avgGasPrice: '0.45 Gwei',
  };

  return new Response(JSON.stringify(response), { headers });
}

async function handleGetLatestTransactions(db: D1Database, chainId: number, headers: Record<string, string>): Promise<Response> {
  const query = `
    SELECT tx_hash, block_number, timestamp, data_json 
    FROM events 
    WHERE chain_id = ? 
    ORDER BY timestamp DESC 
    LIMIT 20
  `;
  const { results } = await db.prepare(query).bind(chainId).all();
  return new Response(JSON.stringify(results), { headers });
}

// --- Admin API Handlers ---

async function handleAdminGetChains(db: D1Database, headers: Record<string, string>): Promise<Response> {
  const { results } = await db.prepare('SELECT * FROM chains ORDER BY created_at DESC').all();
  return new Response(JSON.stringify(results), { headers });
}

async function handleAdminAddChain(db: D1Database, data: Partial<ChainConfig>, headers: Record<string, string>): Promise<Response> {
  if (!data.id || !data.name || !data.rpc_url || !data.contract_address) {
    return new Response(JSON.stringify({ error: 'Missing required fields: id, name, rpc_url, contract_address' }), { status: 400, headers });
  }

  try {
    await db.prepare(`
      INSERT INTO chains (id, name, rpc_url, contract_address, start_block, explorer_url, icon, is_enabled)
      VALUES (?, ?, ?, ?, ?, ?, ?, ?)
    `).bind(
      data.id,
      data.name,
      data.rpc_url,
      data.contract_address,
      data.start_block || 0,
      data.explorer_url || null,
      data.icon || '🔗',
      data.is_enabled ?? 1
    ).run();

    return new Response(JSON.stringify({ success: true, message: `Chain ${data.name} added` }), { status: 201, headers });
  } catch (e: any) {
    return new Response(JSON.stringify({ error: e.message }), { status: 500, headers });
  }
}

async function handleAdminUpdateChain(db: D1Database, chainId: number, data: Partial<ChainConfig>, headers: Record<string, string>): Promise<Response> {
  const updates: string[] = [];
  const values: any[] = [];

  if (data.name !== undefined) { updates.push('name = ?'); values.push(data.name); }
  if (data.rpc_url !== undefined) { updates.push('rpc_url = ?'); values.push(data.rpc_url); }
  if (data.contract_address !== undefined) { updates.push('contract_address = ?'); values.push(data.contract_address); }
  if (data.start_block !== undefined) { updates.push('start_block = ?'); values.push(data.start_block); }
  if (data.explorer_url !== undefined) { updates.push('explorer_url = ?'); values.push(data.explorer_url); }
  if (data.icon !== undefined) { updates.push('icon = ?'); values.push(data.icon); }
  if (data.is_enabled !== undefined) { updates.push('is_enabled = ?'); values.push(data.is_enabled); }

  if (updates.length === 0) {
    return new Response(JSON.stringify({ error: 'No fields to update' }), { status: 400, headers });
  }

  updates.push("updated_at = strftime('%s', 'now')");
  values.push(chainId);

  try {
    await db.prepare(`UPDATE chains SET ${updates.join(', ')} WHERE id = ?`).bind(...values).run();
    return new Response(JSON.stringify({ success: true, message: `Chain ${chainId} updated` }), { headers });
  } catch (e: any) {
    return new Response(JSON.stringify({ error: e.message }), { status: 500, headers });
  }
}

async function handleAdminDeleteChain(db: D1Database, chainId: number, headers: Record<string, string>): Promise<Response> {
  try {
    await db.prepare('DELETE FROM chains WHERE id = ?').bind(chainId).run();
    return new Response(JSON.stringify({ success: true, message: `Chain ${chainId} deleted` }), { headers });
  } catch (e: any) {
    return new Response(JSON.stringify({ error: e.message }), { status: 500, headers });
  }
}

// --- Indexer Logic ---

async function runIndexer(env: Env) {
  // Fetch enabled chains from DB
  const { results } = await env.DB.prepare('SELECT * FROM chains WHERE is_enabled = 1').all<ChainConfig>();

  for (const chain of results || []) {
    try {
      await syncChain(chain, env.DB);
    } catch (e) {
      console.error(`Failed to sync chain ${chain.name}:`, e);
    }
  }
}

async function syncChain(chain: ChainConfig, db: D1Database) {
  // 1. Get last synced block
  const lastSync = await db.prepare('SELECT last_block FROM sync_state WHERE chain_id = ?').bind(chain.id).first();
  let fromBlock = (lastSync?.last_block as number) || chain.start_block;

  // 2. Fetch latest block from RPC
  const currentBlockHex = await rpcRequest(chain.rpc_url, 'eth_blockNumber', []);
  const currentBlock = parseInt(currentBlockHex, 16);

  if (fromBlock >= currentBlock) return; // Nothing new

  // Limit range to avoid timeouts
  const toBlock = Math.min(fromBlock + 100, currentBlock);

  // 3. Fetch Logs
  const logs = await rpcRequest(chain.rpc_url, 'eth_getLogs', [{
    fromBlock: '0x' + fromBlock.toString(16),
    toBlock: '0x' + toBlock.toString(16),
    address: chain.contract_address,
    topics: [TRANSACTION_EXECUTED_TOPIC]
  }]);

  // 4. Process and Batch Insert
  const batch = [];
  for (const log of logs) {
    const mockParsedData = {
      solver: '0x' + (log.topics[1] || '').slice(26),
      value: parseInt((log.data || '0x0').slice(0, 66), 16)
    };

    batch.push(
      db.prepare(`
        INSERT INTO events (chain_id, tx_hash, block_number, event_type, data_json, timestamp)
        VALUES (?, ?, ?, 'TransactionExecuted', ?, ?)
        ON CONFLICT(chain_id, tx_hash) DO NOTHING
      `).bind(
        chain.id,
        log.transactionHash,
        parseInt(log.blockNumber, 16),
        JSON.stringify(mockParsedData),
        Math.floor(Date.now() / 1000)
      )
    );
  }

  if (batch.length > 0) {
    await db.batch(batch);
  }

  // 5. Update Sync State
  await db.prepare(`
    INSERT INTO sync_state (chain_id, last_block) VALUES (?, ?)
    ON CONFLICT(chain_id) DO UPDATE SET last_block = ?, updated_at = strftime('%s', 'now')
  `).bind(chain.id, toBlock, toBlock).run();

  console.log(`Synced ${chain.name} to block ${toBlock}. Found ${logs.length} events.`);
}

async function rpcRequest(url: string, method: string, params: any[]) {
  const resp = await fetch(url, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ jsonrpc: '2.0', id: 1, method, params })
  });
  const json: any = await resp.json();
  if (json.error) throw new Error(json.error.message);
  return json.result;
}
