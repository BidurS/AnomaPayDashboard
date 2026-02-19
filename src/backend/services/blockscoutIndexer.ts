/**
 * Blockscout-based Indexer — fetches data via Blockscout REST API
 * No block-range limits like Alchemy RPC's eth_getLogs.
 * Designed for the scheduled cron: fetches latest unprocessed transactions.
 */
import { DB } from '../db';
import * as schema from '../db/schema';
import { eq, sql, inArray, and } from 'drizzle-orm';
import { rpcRequest } from '../utils/rpc';

// Helper to get Blockscout API URL
function getBlockscoutApiUrl(chainId: number): string {
    switch (chainId) {
        case 1: return 'https://eth.blockscout.com/api/v2';
        case 10: return 'https://optimism.blockscout.com/api/v2';
        case 8453: return 'https://base.blockscout.com/api/v2';
        case 42161: return 'https://arbitrum.blockscout.com/api/v2';
        default: throw new Error(`Unsupported chain ID: ${chainId}`);
    }
}

const TOPICS: Record<string, string> = {
    '0x10dd528db2c49add6545679b976df90d24c035d6a75b17f41b700e8c18ca5364': 'TransactionExecuted',
    '0x0a2dc548ed950accb40d5d78541f3954c5e182a8ecf19e581a4f2263f61f59d2': 'CommitmentTreeRootAdded',
    '0x1cc9a0755dd734c1ebfe98b68ece200037e363eb366d0dee04e420e2f23cc010': 'ActionExecuted',
    '0x48243873b4752ddcb45e0d7b11c4c266583e5e099a0b798fdd9c1af7d49324f3': 'DiscoveryPayload',
    '0x3a134d01c07803003c63301717ddc4612e6c47ae408eeea3222cded532d02ae6': 'ResourcePayload',
    '0x9c61b290f631097f3de0d62c085b4a82c2d3c45b6bebe100a25cbbb577966a34': 'ExternalPayload',
    '0xa494dac4b71848437d4a5b21432e8a9de4e31d7d76dbb96e38e3a20c87c34e9e': 'ApplicationPayload',
    '0xcddb327adb31fe5437df2a8c68301bb13a6baae432a804838caaf682506aadf1': 'ForwarderCallExecuted',
};

const KNOWN_TOKENS: Record<string, { symbol: string; decimals: number; priceUsd: number }> = {
    '0x833589fcd6edb6e08f4c7c32d4f71b54bda02913': { symbol: 'USDC', decimals: 6, priceUsd: 1.0 },
    '0x4200000000000000000000000000000000000006': { symbol: 'WETH', decimals: 18, priceUsd: 2600 },
    '0x50c5725949a6f0c72e6c4a641f24049a917db0cb': { symbol: 'DAI', decimals: 18, priceUsd: 1.0 },
    '0xd9aaec86b65d86f6a7b5b1b0c42ffa531710b6ca': { symbol: 'USDbC', decimals: 6, priceUsd: 1.0 },
    '0xfde4c96c8593536e31f229ea8f37b2ada2699bb2': { symbol: 'USDT', decimals: 6, priceUsd: 1.0 },
    '0x0b3e328455822223971387461073df58222bc358': { symbol: 'cbBTC', decimals: 8, priceUsd: 95000 },
};

const PAYLOAD_TYPE_MAP: Record<string, string> = {
    'ResourcePayload': 'Resource',
    'DiscoveryPayload': 'Discovery',
    'ExternalPayload': 'External',
    'ApplicationPayload': 'Application',
};

const TOKEN_CACHE = new Map<string, { symbol: string; decimals: number; priceUsd: number }>();

async function fetchTokenMetadata(chain: ChainConfig, tokenAddress: string): Promise<{ symbol: string; decimals: number; priceUsd: number }> {
    if (KNOWN_TOKENS[tokenAddress]) return KNOWN_TOKENS[tokenAddress];
    if (TOKEN_CACHE.has(tokenAddress)) return TOKEN_CACHE.get(tokenAddress)!;

    try {
        // Parallel fetch for symbol (0x95d89b41) and decimals (0x313ce567)
        const [symbolHex, decimalsHex] = await Promise.all([
            rpcRequest(chain.rpcUrl, 'eth_call', [{ to: tokenAddress, data: '0x95d89b41' }, 'latest']).catch(() => null),
            rpcRequest(chain.rpcUrl, 'eth_call', [{ to: tokenAddress, data: '0x313ce567' }, 'latest']).catch(() => null)
        ]);

        let symbol = 'UNKNOWN';
        if (symbolHex && symbolHex !== '0x') {
            try {
                // Remove '0x', decode hex to string, filter control chars
                const hex = symbolHex.replace(/^0x/, '');
                let str = '';
                for (let i = 0; i < hex.length; i += 2) {
                    const code = parseInt(hex.substr(i, 2), 16);
                    if (code > 31 && code < 127) str += String.fromCharCode(code);
                }
                // Cleanup partial decoding if bytes32 padded
                symbol = str.replace(/[^A-Za-z0-9]/g, '').slice(0, 10) || 'UNKNOWN';
            } catch (e) { }
        }

        const decimals = decimalsHex ? parseInt(decimalsHex, 16) : 18;
        const metadata = { symbol, decimals, priceUsd: 0 };
        TOKEN_CACHE.set(tokenAddress, metadata);
        return metadata;
    } catch (e) {
        return { symbol: 'UNKNOWN', decimals: 18, priceUsd: 0 };
    }
}

interface IndexerResult {
    chainId: number;
    newTransactions: number;
    newPayloads: number;
    newPrivacyRoots: number;
    newTokenTransfers: number;
    newForwarderCalls: number;
    errors: string[];
    pages: number;
}

export type ChainConfig = {
    id: number;
    rpcUrl: string;
    contractAddress: string;
};

/**
 * Main entry point for the cron-based Blockscout indexer.
 * Fetches the latest transactions from Blockscout, checks which are new,
 * and imports them into the database.
 */
export async function runBlockscoutIndexer(db: DB, chain: ChainConfig): Promise<IndexerResult> {
    const result: IndexerResult = {
        chainId: chain.id,
        newTransactions: 0, newPayloads: 0, newPrivacyRoots: 0,
        newTokenTransfers: 0, newForwarderCalls: 0, errors: [], pages: 0,
    };

    const apiUrl = getBlockscoutApiUrl(chain.id);

    try {
        // Step 1: Fetch recent transactions from Blockscout (newest first)
        const newTxs = await fetchNewTransactions(db, chain, apiUrl, result);
        if (newTxs.length === 0) return result;

        // Step 2: Fetch logs for these transactions
        const { payloads, privacyStats, forwarderCalls } = await fetchAndProcessLogs(db, chain, apiUrl, newTxs, result);

        // Step 3: Fetch token transfers
        const tokenTransfers = await fetchTokenTransfersForTxs(chain, apiUrl, newTxs, result);

        // Step 4: Insert everything into DB
        const maxBlock = Math.max(...newTxs.map(t => t.blockNumber), 0);
        await insertData(db, chain.id, newTxs, payloads, privacyStats, tokenTransfers, forwarderCalls, result, maxBlock);

    } catch (e: any) {
        result.errors.push(`Top-level: ${e.message}`);
    }

    return result;
}

// ─────────────────────────────────────────────────────────
//  Step 1: Fetch NEW transactions from Blockscout
// ─────────────────────────────────────────────────────────
interface TxRecord {
    txHash: string;
    blockNumber: number;
    solverAddress: string;
    valueWei: string;
    gasUsed: number;
    gasPriceWei: string;
    dataJson: string;
    decodedInput: string | null;
    timestamp: number;
}

async function fetchNewTransactions(db: DB, chain: ChainConfig, apiUrl: string, result: IndexerResult): Promise<TxRecord[]> {
    const newTxs: TxRecord[] = [];
    let nextPageParams: any = null;
    let foundExisting = false;

    // Fetch up to 3 pages (150 txs) of recent transactions
    for (let page = 0; page < 3 && !foundExisting; page++) {
        let url = `${apiUrl}/addresses/${chain.contractAddress}/transactions?filter=to`;
        if (nextPageParams) {
            url += `&${new URLSearchParams(nextPageParams).toString()}`;
        }

        try {
            const res = await fetchWithRetry(url);
            if (!res.ok) throw new Error(`Blockscout HTTP ${res.status}`);
            const data: any = await res.json();

            if (!data.items || data.items.length === 0) break;
            result.pages++;

            for (const tx of data.items) {
                const txHash = tx.hash?.toLowerCase();
                if (!txHash) continue;

                // Check if we already have this transaction
                const existing = await db.select({ id: schema.events.id })
                    .from(schema.events)
                    .where(eq(schema.events.txHash, txHash))
                    .get();

                if (existing) {
                    foundExisting = true; // Stop fetching older pages
                    break;
                }

                newTxs.push({
                    txHash: tx.hash,
                    blockNumber: tx.block_number || 0,
                    solverAddress: tx.from?.hash || '0x0',
                    valueWei: tx.value || '0',
                    gasUsed: parseInt(tx.gas_used || '0'),
                    gasPriceWei: tx.gas_price || '0',
                    dataJson: JSON.stringify(tx.decoded_input || {}),
                    decodedInput: tx.decoded_input ? JSON.stringify(tx.decoded_input) : null,
                    timestamp: Math.floor(new Date(tx.timestamp).getTime() / 1000),
                });
            }

            nextPageParams = data.next_page_params;
            if (!nextPageParams) break;
        } catch (e: any) {
            result.errors.push(`fetchTxs page ${page}: ${e.message}`);
            break;
        }
    }

    result.newTransactions = newTxs.length;
    return newTxs;
}

// ─────────────────────────────────────────────────────────
//  Step 2: Fetch logs for new transactions
// ─────────────────────────────────────────────────────────
interface PayloadRecord {
    chainId: number; txHash: string; blockNumber: number;
    payloadType: string; payloadIndex: number; blob: string; timestamp: number;
}
interface PrivacyRecord {
    chainId: number; blockNumber: number; rootHash: string;
    timestamp: number; estimatedPoolSize: number;
}
interface ForwarderCallRecord {
    chainId: number; txHash: string; blockNumber: number;
    untrustedForwarder: string; input: string; output: string; timestamp: number;
}

async function fetchAndProcessLogs(
    db: DB, chain: ChainConfig, apiUrl: string, txs: TxRecord[], result: IndexerResult
): Promise<{ payloads: PayloadRecord[]; privacyStats: PrivacyRecord[]; forwarderCalls: ForwarderCallRecord[] }> {
    const payloads: PayloadRecord[] = [];
    const privacyStats: PrivacyRecord[] = [];
    const forwarderCalls: ForwarderCallRecord[] = [];
    const txHashSet = new Set(txs.map(t => t.txHash.toLowerCase()));
    const txMap = new Map(txs.map(t => [t.txHash.toLowerCase(), t]));

    // Fetch first 2 pages of logs (newest first)
    let nextPageParams: any = null;
    let foundOld = false;

    for (let page = 0; page < 2 && !foundOld; page++) {
        let url = `${apiUrl}/addresses/${chain.contractAddress}/logs`;
        if (nextPageParams) {
            url += `?${new URLSearchParams(nextPageParams).toString()}`;
        }

        try {
            const res = await fetchWithRetry(url);
            if (!res.ok) throw new Error(`Blockscout logs HTTP ${res.status}`);
            const data: any = await res.json();
            if (!data.items || data.items.length === 0) break;

            for (const log of data.items) {
                const logTxHash = log.transaction_hash?.toLowerCase();
                if (!logTxHash || !txHashSet.has(logTxHash)) {
                    // This log belongs to a tx we already have — stop
                    if (!txHashSet.has(logTxHash)) foundOld = true;
                    continue;
                }

                const topicHash = log.topics?.[0];
                const eventType = TOPICS[topicHash];
                if (!eventType) continue;

                const txData = txMap.get(logTxHash);
                const timestamp = txData?.timestamp || Math.floor(Date.now() / 1000);
                const blockNumber = log.block_number || txData?.blockNumber || 0;

                // Process payload events
                if (PAYLOAD_TYPE_MAP[eventType]) {
                    const blob = log.decoded?.parameters?.[2]?.value || log.data || '';
                    payloads.push({
                        chainId: chain.id,
                        txHash: log.transaction_hash,
                        blockNumber,
                        payloadType: PAYLOAD_TYPE_MAP[eventType],
                        payloadIndex: parseInt(log.decoded?.parameters?.[1]?.value ?? '0'),
                        blob: blob.substring(0, 500),
                        timestamp,
                    });
                }

                // Process commitment root events
                if (eventType === 'CommitmentTreeRootAdded') {
                    const root = log.decoded?.parameters?.[0]?.value || log.data?.substring(0, 66) || '';
                    privacyStats.push({
                        chainId: chain.id,
                        blockNumber,
                        rootHash: root,
                        timestamp,
                        estimatedPoolSize: 0, // Will be computed during insert
                    });
                }

                // Enrich TransactionExecuted with tags
                if (eventType === 'TransactionExecuted' && txData) {
                    const tags = log.decoded?.parameters?.[0]?.value || [];
                    const logicRefs = log.decoded?.parameters?.[1]?.value || [];
                    txData.dataJson = JSON.stringify({ ...JSON.parse(txData.dataJson || '{}'), tags, logicRefs });
                }

                // Process ForwarderCallExecuted events
                if (eventType === 'ForwarderCallExecuted') {
                    const params = log.decoded?.parameters || [];
                    const untrustedForwarder = params[0]?.value || '';
                    const input = params[1]?.value || '';
                    const outputStr = params[2]?.value || '';
                    forwarderCalls.push({
                        chainId: chain.id,
                        txHash: log.transaction_hash,
                        blockNumber,
                        untrustedForwarder,
                        input,
                        output: outputStr,
                        timestamp,
                    });
                }
            }

            nextPageParams = data.next_page_params;
            if (!nextPageParams) break;
        } catch (e: any) {
            result.errors.push(`fetchLogs page ${page}: ${e.message}`);
            break;
        }
    }

    result.newPayloads = payloads.length;
    result.newPrivacyRoots = privacyStats.length;
    result.newForwarderCalls = forwarderCalls.length;
    return { payloads, privacyStats, forwarderCalls };
}

// ─────────────────────────────────────────────────────────
//  Step 3: Fetch token transfers for new transactions
// ─────────────────────────────────────────────────────────
interface TransferRecord {
    chainId: number; txHash: string; blockNumber: number;
    tokenAddress: string; tokenSymbol: string; tokenDecimals: number;
    fromAddress: string; toAddress: string;
    amountRaw: string; amountDisplay: number; amountUsd: number;
    timestamp: number;
}

async function fetchTokenTransfersForTxs(chain: ChainConfig, apiUrl: string, txs: TxRecord[], result: IndexerResult): Promise<TransferRecord[]> {
    const transfers: TransferRecord[] = [];

    for (const tx of txs) {
        try {
            const res = await fetchWithRetry(
                `${apiUrl}/transactions/${tx.txHash}/token-transfers`
            );
            if (!res.ok) continue;
            const data: any = await res.json();

            if (data.items) {
                for (const t of data.items) {
                    const tokenAddr = t.token?.address?.toLowerCase() || '';
                    let decimals = 18;
                    let symbol = 'UNKNOWN';
                    let priceUsd = 0;

                    if (KNOWN_TOKENS[tokenAddr]) {
                        decimals = KNOWN_TOKENS[tokenAddr].decimals;
                        symbol = KNOWN_TOKENS[tokenAddr].symbol;
                        priceUsd = KNOWN_TOKENS[tokenAddr].priceUsd;
                    } else if (t.token?.symbol && t.token?.decimals) {
                        decimals = parseInt(t.token.decimals);
                        symbol = t.token.symbol;
                    } else {
                        // Fallback to RPC fetch
                        const metadata = await fetchTokenMetadata(chain, tokenAddr);
                        decimals = metadata.decimals;
                        symbol = metadata.symbol;
                        priceUsd = metadata.priceUsd;
                    }

                    const amountRaw = t.total?.value || '0';
                    const amountDisplay = parseFloat(amountRaw) / Math.pow(10, decimals);

                    transfers.push({
                        chainId: chain.id,
                        txHash: tx.txHash,
                        blockNumber: tx.blockNumber,
                        tokenAddress: tokenAddr,
                        tokenSymbol: symbol,
                        tokenDecimals: decimals,
                        fromAddress: (t.from?.hash || '').toLowerCase(),
                        toAddress: (t.to?.hash || '').toLowerCase(),
                        amountRaw,
                        amountDisplay,
                        amountUsd: amountDisplay * priceUsd,
                        timestamp: tx.timestamp,
                    });
                }
            }
        } catch {
            // Skip failed token transfer fetches
        }
    }

    result.newTokenTransfers = transfers.length;
    return transfers;
}

// ─────────────────────────────────────────────────────────
//  Helper: Retry Fetch
// ─────────────────────────────────────────────────────────
async function fetchWithRetry(url: string, retries = 3, backoff = 1000): Promise<Response> {
    for (let i = 0; i < retries; i++) {
        try {
            const res = await fetch(url, { headers: { 'User-Agent': 'Gnoma-Indexer/3.0' } });
            if (res.status === 429 || res.status >= 500) {
                const retryAfter = res.headers.get('Retry-After');
                const wait = retryAfter ? parseInt(retryAfter) * 1000 : backoff * Math.pow(2, i);
                console.warn(`[Indexer] Rate limited/Error ${res.status}. Retrying in ${wait}ms...`);
                await new Promise(r => setTimeout(r, wait));
                continue;
            }
            return res;
        } catch (e) {
            if (i === retries - 1) throw e;
            await new Promise(r => setTimeout(r, backoff * Math.pow(2, i)));
        }
    }
    throw new Error(`Failed to fetch ${url} after ${retries} retries`);
}


// ─────────────────────────────────────────────────────────
//  Step 4: Insert all data into D1 (Atomic Batch)
// ─────────────────────────────────────────────────────────
async function insertData(
    db: DB,
    chainId: number,
    txs: TxRecord[],
    payloads: PayloadRecord[],
    privacyStats: PrivacyRecord[],
    tokenTransfers: TransferRecord[],
    forwarderCalls: ForwarderCallRecord[],
    result: IndexerResult,
    maxBlock: number
) {
    const batch: any[] = [];

    // Map TxHash -> Primary Payload Type
    const txTypeMap = new Map<string, string>();
    for (const p of payloads) {
        if (!txTypeMap.has(p.txHash.toLowerCase())) {
            txTypeMap.set(p.txHash.toLowerCase(), p.payloadType);
        }
    }

    // 1. Events (Transactions)
    if (txs.length > 0) {
        batch.push(
            db.insert(schema.events).values(
                txs.map(t => ({
                    chainId: chainId,
                    txHash: t.txHash,
                    blockNumber: t.blockNumber,
                    eventType: 'TransactionExecuted',
                    solverAddress: t.solverAddress,
                    valueWei: t.valueWei,
                    gasUsed: t.gasUsed,
                    gasPriceWei: t.gasPriceWei,
                    dataJson: t.dataJson,
                    decodedInput: t.decodedInput,
                    primaryPayloadType: txTypeMap.get(t.txHash.toLowerCase()) || null,
                    timestamp: t.timestamp,
                }))
            ).onConflictDoUpdate({
                target: [schema.events.chainId, schema.events.txHash],
                set: {
                    decodedInput: sql`excluded.decoded_input`,
                    primaryPayloadType: sql`excluded.primary_payload_type`
                },
            })
        );
    }

    // 2. Payloads
    if (payloads.length > 0) {
        batch.push(db.insert(schema.payloads).values(payloads).onConflictDoNothing());
    }

    // 3. Privacy Stats
    if (privacyStats.length > 0) {
        const [poolQuery] = await db.select({
            poolSize: sql<number>`MAX(${schema.privacyStates.estimatedPoolSize})`
        }).from(schema.privacyStates).where(eq(schema.privacyStates.chainId, chainId));
        let poolSize = poolQuery?.poolSize || 0;

        privacyStats.sort((a, b) => a.blockNumber - b.blockNumber);
        for (const p of privacyStats) {
            poolSize++;
            p.estimatedPoolSize = poolSize;
        }

        batch.push(db.insert(schema.privacyStates).values(privacyStats).onConflictDoNothing());
    }

    // 4. Token Transfers
    if (tokenTransfers.length > 0) {
        batch.push(db.insert(schema.tokenTransfers).values(tokenTransfers).onConflictDoNothing());
    }

    // 5. Forwarder Calls
    if (forwarderCalls.length > 0) {
        batch.push(
            db.insert(schema.forwarderCalls).values(
                forwarderCalls.map(f => ({
                    chainId: f.chainId,
                    txHash: f.txHash,
                    blockNumber: f.blockNumber,
                    untrustedForwarder: f.untrustedForwarder,
                    input: f.input,
                    output: f.output,
                    timestamp: f.timestamp,
                }))
            ).onConflictDoNothing()
        );
    }

    // 5. Solvers (Upsert with BigInt Safety)
    const solverUpdates = new Map<string, { count: number; gas: bigint; val: bigint; ts: number }>();
    for (const tx of txs) {
        const addr = tx.solverAddress?.toLowerCase();
        if (!addr || addr === '0x0') continue;
        const s = solverUpdates.get(addr) || { count: 0, gas: BigInt(0), val: BigInt(0), ts: 0 };
        s.count++;
        s.gas += BigInt(tx.gasUsed);
        s.val += BigInt(tx.valueWei || '0');
        s.ts = Math.max(s.ts, tx.timestamp);
        solverUpdates.set(addr, s);
    }

    if (solverUpdates.size > 0) {
        const addresses = Array.from(solverUpdates.keys());
        // Fetch existing values to add safely in JS
        // Chunking inArray to avoid getting too many params error if many solvers
        // Simplified: assuming < 100 solvers per batch
        const existingSolvers = await db.select().from(schema.solvers)
            .where(and(eq(schema.solvers.chainId, chainId), inArray(schema.solvers.address, addresses)));

        const existingMap = new Map(existingSolvers.map(s => [s.address.toLowerCase(), s]));

        for (const [addr, update] of solverUpdates) {
            const existing = existingMap.get(addr);
            const currentCount = existing?.txCount || 0;
            const currentGas = BigInt(existing?.totalGasSpent || '0');
            const currentValue = BigInt(existing?.totalValueProcessed || '0');
            const currentLastSeen = existing?.lastSeen || 0;

            batch.push(
                db.insert(schema.solvers).values({
                    chainId: chainId,
                    address: addr,
                    txCount: update.count,
                    totalGasSpent: update.gas.toString(),
                    totalValueProcessed: update.val.toString(),
                    firstSeen: Math.floor(Date.now() / 1000),
                    lastSeen: update.ts,
                }).onConflictDoUpdate({
                    target: [schema.solvers.chainId, schema.solvers.address],
                    set: {
                        txCount: currentCount + update.count,
                        totalGasSpent: (currentGas + update.gas).toString(),
                        totalValueProcessed: (currentValue + update.val).toString(),
                        lastSeen: Math.max(currentLastSeen, update.ts)
                    },
                })
            );
        }
    }

    // 6. Daily Stats (Upsert with BigInt Safety)
    const dailyUpdates = new Map<string, { count: number; vol: number; gas: number; solvers: Set<string> }>();
    for (const tx of txs) {
        const date = new Date(tx.timestamp * 1000).toISOString().split('T')[0];
        const d = dailyUpdates.get(date) || { count: 0, vol: 0, gas: 0, solvers: new Set() };
        d.count++;
        d.gas += tx.gasUsed;
        d.solvers.add(tx.solverAddress?.toLowerCase());
        dailyUpdates.set(date, d);
    }
    // Add volume from transfers
    for (const t of tokenTransfers) {
        const date = new Date(t.timestamp * 1000).toISOString().split('T')[0];
        if (!dailyUpdates.has(date)) dailyUpdates.set(date, { count: 0, vol: 0, gas: 0, solvers: new Set() });
        dailyUpdates.get(date)!.vol += t.amountUsd;
    }

    if (dailyUpdates.size > 0) {
        const dates = Array.from(dailyUpdates.keys());
        const existingDaily = await db.select().from(schema.dailyStats)
            .where(and(eq(schema.dailyStats.chainId, chainId), inArray(schema.dailyStats.date, dates)));

        const existingMap = new Map(existingDaily.map(d => [d.date, d]));

        for (const [date, update] of dailyUpdates) {
            const existing = existingMap.get(date);
            const currentIntentCount = existing?.intentCount || 0;
            // Volume is stored as TEXT but it's technically a float-like USD value multiplied by 100?
            // "Math.round(d.vol * 100).toString()"
            const currentVolume = BigInt(existing?.totalVolume || '0');
            const newVolume = BigInt(Math.round(update.vol * 100)); // Cents
            const currentGas = existing?.totalGasUsed || 0;
            const currentSolvers = existing?.uniqueSolvers || 0;

            batch.push(
                db.insert(schema.dailyStats).values({
                    chainId: chainId,
                    date,
                    intentCount: update.count,
                    totalVolume: newVolume.toString(),
                    uniqueSolvers: update.solvers.size,
                    totalGasUsed: update.gas,
                    gasSaved: 0,
                }).onConflictDoUpdate({
                    target: [schema.dailyStats.chainId, schema.dailyStats.date],
                    set: {
                        intentCount: currentIntentCount + update.count,
                        totalVolume: (currentVolume + newVolume).toString(),
                        uniqueSolvers: Math.max(currentSolvers, update.solvers.size),
                        totalGasUsed: currentGas + update.gas,
                    },
                })
            );
        }
    }

    // 7. Atomic Sync State Update
    if (maxBlock > 0) {
        batch.push(
            db.insert(schema.syncState).values({
                chainId: chainId,
                lastBlock: maxBlock,
                updatedAt: Math.floor(Date.now() / 1000),
            }).onConflictDoUpdate({
                target: schema.syncState.chainId,
                set: {
                    lastBlock: sql`MAX(${schema.syncState.lastBlock}, ${maxBlock})`,
                    updatedAt: Math.floor(Date.now() / 1000),
                },
            })
        );
    }

    // Execute Atomic Batch
    if (batch.length > 0) {
        await db.batch(batch as [any, ...any[]]);
    }
}
