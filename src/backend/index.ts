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

// CORRECTED TOPICS (Matching local_indexer.mjs)
const TOPICS = {
  TRANSACTION_EXECUTED: '0x1cc9a0755dd734c1ebfe98b68ece200037e363eb366d0dee04e420e2f23cc010',
  RESOURCE_PAYLOAD: '0xcddb327adb31fe5437df2a8c68301bb13a6baae432a804838caaf682506aadf1',
  DISCOVERY_PAYLOAD: '0x0a2dc548ed950accb40d5d78541f3954c5e182a8ecf19e581a4f2263f61f59d2',
  EXTERNAL_PAYLOAD: '0x742915307a0914d79dfa684b976df90d24c035d6a75b17f41b700e8c18ca5364',
  APPLICATION_PAYLOAD: '0x842915307a0914d79dfa684b976df90d24c035d6a75b17f41b700e8c18ca5364',
  COMMITMENT_ROOT_ADDED: '0x10dd528db2c49add6545679b976df90d24c035d6a75b17f41b700e8c18ca5364'
};

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

      if (url.pathname.startsWith('/api/admin/')) {
        const apiKey = request.headers.get('X-Admin-Key');
        if (!env.ADMIN_API_KEY || apiKey !== env.ADMIN_API_KEY) return new Response(JSON.stringify({ error: 'Unauthorized' }), { status: 401, headers: corsHeaders });

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

      return new Response(JSON.stringify({ message: 'Gnoma Explorer API', version: '2.3' }), { headers: corsHeaders });
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
  // Using CAST to REAL for approximation in stats, but data is stored as TEXT (BigInt)
  const countQuery = await db.prepare('SELECT COUNT(*) as intentCount, COUNT(DISTINCT solver_address) as uniqueSolvers, COALESCE(SUM(CAST(gas_used AS INTEGER)), 0) as totalGasUsed FROM events WHERE chain_id = ?').bind(chainId).first();
  const payloadQuery = await db.prepare('SELECT COUNT(*) as payloadCount FROM payloads WHERE chain_id = ?').bind(chainId).first();

  // Volume needs to be handled carefully. For now, simple sum of ETH value (approx).
  // Ideally, this should sum USD value if we had it, but we only have raw wei.
  const volQuery = await db.prepare('SELECT COALESCE(SUM(CAST(value_wei AS REAL)), 0) as totalEthWei FROM events WHERE chain_id = ?').bind(chainId).first();

  const totalIntents = ((countQuery?.intentCount as number) || 0) + ((payloadQuery?.payloadCount as number) || 0);

  return new Response(JSON.stringify({
    totalVolume: ((volQuery?.totalEthWei as number) || 0),
    intentCount: totalIntents,
    uniqueSolvers: (countQuery?.uniqueSolvers as number) || 0,
    gasSaved: 0, // Deprecated logic
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
  // Approximate TVL logic (Raw Units)
  const tvlQuery = await db.prepare('SELECT COALESCE(SUM(CAST(flow_in AS REAL) - CAST(flow_out AS REAL)), 0) as tvl FROM asset_flows WHERE chain_id = ?').bind(chainId).first();
  const tvl = parseFloat((tvlQuery?.tvl as string) || '0');

  return new Response(JSON.stringify({
    tvl: Math.max(0, tvl),
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
      batch.push(db.prepare('INSERT INTO daily_stats (chain_id, date, intent_count, total_volume, unique_solvers, total_gas_used, gas_saved) VALUES (?, ?, ?, ?, ?, ?, ?) ON CONFLICT(chain_id, date) DO UPDATE SET intent_count=intent_count+excluded.intent_count, total_volume=CAST(CAST(total_volume AS INTEGER)+CAST(excluded.total_volume AS INTEGER) AS TEXT), total_gas_used=total_gas_used+excluded.total_gas_used').bind(d.chain_id, d.date, d.count, d.volume, 1, d.gas, 0));
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

    // 2. Asset Flows (ERC20s)
    for (const rLog of txReceipt.logs) {
      if (rLog.topics[0] === ERC20_TRANSFER_TOPIC) {
        const from = ('0x' + (rLog.topics[1]?.slice(26) || '')).toLowerCase();
        const to = ('0x' + (rLog.topics[2]?.slice(26) || '')).toLowerCase();
        const amount = BigInt(rLog.data || '0x0');

        if (to === SHIELDED_POOL_ADDRESS || from === SHIELDED_POOL_ADDRESS) {
          const token = rLog.address.toLowerCase();
          const key = token;
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

  // Batch Inserts
  for (const [token, a] of assetUpdates) {
    batch.push(db.prepare('INSERT INTO asset_flows (chain_id, token_address, token_symbol, flow_in, flow_out, tx_count) VALUES (?, ?, ?, ?, ?, 1) ON CONFLICT(chain_id, token_address) DO UPDATE SET flow_in=CAST(CAST(flow_in AS INTEGER)+CAST(? AS INTEGER) AS TEXT), flow_out=CAST(CAST(flow_out AS INTEGER)+CAST(? AS INTEGER) AS TEXT), tx_count=tx_count+1').bind(chain.id, token, 'UNKNOWN', a.in.toString(), a.out.toString()));
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