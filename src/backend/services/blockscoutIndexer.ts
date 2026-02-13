/**
 * Blockscout-based Indexer — fetches data via Blockscout REST API
 * No block-range limits like Alchemy RPC's eth_getLogs.
 * Designed for the scheduled cron: fetches latest unprocessed transactions.
 */
import { DB } from '../db';
import * as schema from '../db/schema';
import { eq, sql } from 'drizzle-orm';

const CONTRACT_ADDRESS = '0x9ed43c229480659bf6b6607c46d7b96c6d760cbb';
const BLOCKSCOUT_BASE = 'https://base.blockscout.com/api/v2';
const CHAIN_ID = 8453;

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
};

const PAYLOAD_TYPE_MAP: Record<string, string> = {
    'ResourcePayload': 'Resource',
    'DiscoveryPayload': 'Discovery',
    'ExternalPayload': 'External',
    'ApplicationPayload': 'Application',
};

interface IndexerResult {
    newTransactions: number;
    newPayloads: number;
    newPrivacyRoots: number;
    newTokenTransfers: number;
    errors: string[];
    pages: number;
}

/**
 * Main entry point for the cron-based Blockscout indexer.
 * Fetches the latest transactions from Blockscout, checks which are new,
 * and imports them into the database.
 */
export async function runBlockscoutIndexer(db: DB): Promise<IndexerResult> {
    const result: IndexerResult = {
        newTransactions: 0, newPayloads: 0, newPrivacyRoots: 0,
        newTokenTransfers: 0, errors: [], pages: 0,
    };

    try {
        // Step 1: Fetch recent transactions from Blockscout (newest first)
        const newTxs = await fetchNewTransactions(db, result);
        if (newTxs.length === 0) return result;

        // Step 2: Fetch logs for these transactions
        const { payloads, privacyStats } = await fetchAndProcessLogs(db, newTxs, result);

        // Step 3: Fetch token transfers
        const tokenTransfers = await fetchTokenTransfersForTxs(newTxs, result);

        // Step 4: Insert everything into DB
        await insertData(db, newTxs, payloads, privacyStats, tokenTransfers, result);

        // Step 5: Update sync state with highest block
        const maxBlock = Math.max(...newTxs.map(t => t.blockNumber));
        await db.insert(schema.syncState).values({
            chainId: CHAIN_ID,
            lastBlock: maxBlock,
            updatedAt: Math.floor(Date.now() / 1000),
        }).onConflictDoUpdate({
            target: schema.syncState.chainId,
            set: {
                lastBlock: sql`MAX(${schema.syncState.lastBlock}, ${maxBlock})`,
                updatedAt: Math.floor(Date.now() / 1000),
            },
        });

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

async function fetchNewTransactions(db: DB, result: IndexerResult): Promise<TxRecord[]> {
    const newTxs: TxRecord[] = [];
    let nextPageParams: any = null;
    let foundExisting = false;

    // Fetch up to 3 pages (150 txs) of recent transactions
    for (let page = 0; page < 3 && !foundExisting; page++) {
        let url = `${BLOCKSCOUT_BASE}/addresses/${CONTRACT_ADDRESS}/transactions?filter=to`;
        if (nextPageParams) {
            url += `&${new URLSearchParams(nextPageParams).toString()}`;
        }

        try {
            const res = await fetch(url, { headers: { 'User-Agent': 'Gnoma-Indexer/3.0' } });
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

async function fetchAndProcessLogs(
    db: DB, txs: TxRecord[], result: IndexerResult
): Promise<{ payloads: PayloadRecord[]; privacyStats: PrivacyRecord[] }> {
    const payloads: PayloadRecord[] = [];
    const privacyStats: PrivacyRecord[] = [];
    const txHashSet = new Set(txs.map(t => t.txHash.toLowerCase()));
    const txMap = new Map(txs.map(t => [t.txHash.toLowerCase(), t]));

    // Fetch first 2 pages of logs (newest first)
    let nextPageParams: any = null;
    let foundOld = false;

    for (let page = 0; page < 2 && !foundOld; page++) {
        let url = `${BLOCKSCOUT_BASE}/addresses/${CONTRACT_ADDRESS}/logs`;
        if (nextPageParams) {
            url += `?${new URLSearchParams(nextPageParams).toString()}`;
        }

        try {
            const res = await fetch(url, { headers: { 'User-Agent': 'Gnoma-Indexer/3.0' } });
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
                        chainId: CHAIN_ID,
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
                        chainId: CHAIN_ID,
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
    return { payloads, privacyStats };
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

async function fetchTokenTransfersForTxs(txs: TxRecord[], result: IndexerResult): Promise<TransferRecord[]> {
    const transfers: TransferRecord[] = [];

    for (const tx of txs) {
        try {
            const res = await fetch(
                `${BLOCKSCOUT_BASE}/transactions/${tx.txHash}/token-transfers`,
                { headers: { 'User-Agent': 'Gnoma-Indexer/3.0' } }
            );
            if (!res.ok) continue;
            const data: any = await res.json();

            if (data.items) {
                for (const t of data.items) {
                    const tokenAddr = t.token?.address?.toLowerCase() || '';
                    const known = KNOWN_TOKENS[tokenAddr];
                    const decimals = known?.decimals || parseInt(t.token?.decimals || '18');
                    const symbol = known?.symbol || t.token?.symbol || 'UNKNOWN';
                    const priceUsd = known?.priceUsd || 0;
                    const amountRaw = t.total?.value || '0';
                    const amountDisplay = parseFloat(amountRaw) / Math.pow(10, decimals);

                    transfers.push({
                        chainId: CHAIN_ID,
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
//  Step 4: Insert all data into D1
// ─────────────────────────────────────────────────────────
async function insertData(
    db: DB,
    txs: TxRecord[],
    payloads: PayloadRecord[],
    privacyStats: PrivacyRecord[],
    tokenTransfers: TransferRecord[],
    result: IndexerResult
) {
    // Events (transactions)
    if (txs.length > 0) {
        await db.insert(schema.events).values(
            txs.map(t => ({
                chainId: CHAIN_ID,
                txHash: t.txHash,
                blockNumber: t.blockNumber,
                eventType: 'TransactionExecuted',
                solverAddress: t.solverAddress,
                valueWei: t.valueWei,
                gasUsed: t.gasUsed,
                gasPriceWei: t.gasPriceWei,
                dataJson: t.dataJson,
                decodedInput: t.decodedInput,
                timestamp: t.timestamp,
            }))
        ).onConflictDoUpdate({
            target: [schema.events.chainId, schema.events.txHash],
            set: { decodedInput: sql`excluded.decoded_input` },
        });
    }

    // Payloads
    if (payloads.length > 0) {
        await db.insert(schema.payloads).values(payloads).onConflictDoNothing();
    }

    // Privacy stats — compute pool size from existing count
    if (privacyStats.length > 0) {
        const [poolQuery] = await db.select({
            poolSize: sql<number>`MAX(${schema.privacyPoolStats.estimatedPoolSize})`
        }).from(schema.privacyPoolStats).where(eq(schema.privacyPoolStats.chainId, CHAIN_ID));
        let poolSize = poolQuery?.poolSize || 0;

        privacyStats.sort((a, b) => a.blockNumber - b.blockNumber);
        for (const p of privacyStats) {
            poolSize++;
            p.estimatedPoolSize = poolSize;
        }

        await db.insert(schema.privacyPoolStats).values(privacyStats).onConflictDoNothing();
    }

    // Token transfers
    if (tokenTransfers.length > 0) {
        await db.insert(schema.tokenTransfers).values(tokenTransfers).onConflictDoNothing();
    }

    // Solvers — aggregate from new txs
    const solverMap = new Map<string, { count: number; gas: bigint; val: bigint; ts: number }>();
    for (const tx of txs) {
        const addr = tx.solverAddress?.toLowerCase();
        if (!addr || addr === '0x0') continue;
        const s = solverMap.get(addr) || { count: 0, gas: BigInt(0), val: BigInt(0), ts: 0 };
        s.count++;
        s.gas += BigInt(tx.gasUsed);
        s.val += BigInt(tx.valueWei || '0');
        s.ts = Math.max(s.ts, tx.timestamp);
        solverMap.set(addr, s);
    }

    for (const [addr, s] of solverMap) {
        await db.insert(schema.solvers).values({
            chainId: CHAIN_ID,
            address: addr,
            txCount: s.count,
            totalGasSpent: s.gas.toString(),
            totalValueProcessed: s.val.toString(),
            firstSeen: Math.floor(Date.now() / 1000),
            lastSeen: s.ts,
        }).onConflictDoUpdate({
            target: [schema.solvers.chainId, schema.solvers.address],
            set: {
                txCount: sql`${schema.solvers.txCount} + ${s.count}`,
                totalGasSpent: sql`CAST(CAST(${schema.solvers.totalGasSpent} AS INTEGER) + ${s.gas.toString()} AS TEXT)`,
                lastSeen: sql`excluded.last_seen`,
            },
        });
    }

    // Daily stats
    const dailyMap = new Map<string, { count: number; vol: number; gas: number; solvers: Set<string> }>();
    for (const tx of txs) {
        const date = new Date(tx.timestamp * 1000).toISOString().split('T')[0];
        const d = dailyMap.get(date) || { count: 0, vol: 0, gas: 0, solvers: new Set() };
        d.count++;
        d.gas += tx.gasUsed;
        d.solvers.add(tx.solverAddress?.toLowerCase());
        dailyMap.set(date, d);
    }
    for (const t of tokenTransfers) {
        const date = new Date(t.timestamp * 1000).toISOString().split('T')[0];
        if (dailyMap.has(date)) dailyMap.get(date)!.vol += t.amountUsd;
    }

    for (const [date, d] of dailyMap) {
        await db.insert(schema.dailyStats).values({
            chainId: CHAIN_ID,
            date,
            intentCount: d.count,
            totalVolume: Math.round(d.vol * 100).toString(),
            uniqueSolvers: d.solvers.size,
            totalGasUsed: d.gas,
            gasSaved: 0,
        }).onConflictDoUpdate({
            target: [schema.dailyStats.chainId, schema.dailyStats.date],
            set: {
                intentCount: sql`${schema.dailyStats.intentCount} + ${d.count}`,
                totalVolume: sql`CAST(CAST(${schema.dailyStats.totalVolume} AS INTEGER) + ${Math.round(d.vol * 100)} AS TEXT)`,
                uniqueSolvers: sql`MAX(${schema.dailyStats.uniqueSolvers}, ${d.solvers.size})`,
                totalGasUsed: sql`${schema.dailyStats.totalGasUsed} + ${d.gas}`,
            },
        });
    }
}
