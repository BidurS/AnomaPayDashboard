import { DB } from '../db';
import * as schema from '../db/schema';
import { eq, sql } from 'drizzle-orm';
import { decodeAbiParameters, parseAbiParameters, getAddress } from 'viem'; // viem is lightweight
import { rpcRequest } from '../utils/rpc';
import { fetchTokenMetadata, fetchPythPrices, KNOWN_TOKEN_META } from './pricing';
import { ChainConfig } from '../types';

const SHIELDED_POOL_ADDRESS = '0x990c1773c28b985c2cf32c0a920192bd8717c871'.toLowerCase();
const ERC20_TRANSFER_TOPIC = '0xddf252ad1be2c89b69c2b068fc378daa952ba7f163c4a11628f55a4df523b3ef';

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

export async function runIndexer(db: DB) {
    const chains = await db.select().from(schema.chains).where(eq(schema.chains.isEnabled, 1));
    const results: any[] = [];

    for (const chain of chains) {
        const chainResult: any = { chainId: chain.id, name: chain.name, batches: 0, errors: [] };
        try {
            // Map Drizzle camelCase to ChainConfig snake_case
            const chainConfig: ChainConfig = {
                id: chain.id,
                name: chain.name,
                rpc_url: chain.rpcUrl,
                contract_address: chain.contractAddress,
                start_block: chain.startBlock,
                explorer_url: chain.explorerUrl,
                icon: chain.icon || '🔗',
                is_enabled: chain.isEnabled,
            };

            const currentBlockHex = await rpcRequest(chainConfig.rpc_url, 'eth_blockNumber', []);
            const currentBlock = parseInt(currentBlockHex, 16);
            chainResult.currentBlock = currentBlock;

            // Process multiple batches per invocation for faster catchup
            // Alchemy free tier: 10 blocks/call (inclusive), CF Worker: 50 subrequest limit
            const MAX_BATCHES = 40;
            const BATCH_SIZE = 9;

            for (let batch = 0; batch < MAX_BATCHES; batch++) {
                const syncState = await db.select().from(schema.syncState).where(eq(schema.syncState.chainId, chain.id)).get();
                const fromBlock = syncState?.lastBlock || chainConfig.start_block;
                chainResult.fromBlock = fromBlock;

                if (fromBlock >= currentBlock) {
                    chainResult.reason = 'caught_up';
                    break;
                }

                const toBlock = Math.min(fromBlock + BATCH_SIZE, currentBlock);
                try {
                    const result = await syncBlockRange(chainConfig, db, fromBlock, toBlock);
                    chainResult.batches++;
                    chainResult.lastProcessed = toBlock;
                    chainResult.eventsFound = (chainResult.eventsFound || 0) + (result?.eventsFound || 0);
                } catch (batchErr: any) {
                    chainResult.errors.push({ batch, fromBlock, toBlock, error: batchErr.message });
                    break; // Stop processing on error
                }
            }
        } catch (e: any) {
            chainResult.error = e.message;
        }
        results.push(chainResult);
    }
    return results;
}

export async function syncBlockRange(chain: ChainConfig, db: DB, fromBlock: number, toBlock: number) {
    const logs = await rpcRequest(chain.rpc_url, 'eth_getLogs', [{
        fromBlock: '0x' + fromBlock.toString(16),
        toBlock: '0x' + toBlock.toString(16),
        address: chain.contract_address,
        topics: [Object.values(TOPICS)]
    }]);

    if (logs.length === 0) {
        await db.insert(schema.syncState).values({
            chainId: chain.id,
            lastBlock: toBlock,
            updatedAt: Math.floor(Date.now() / 1000)
        }).onConflictDoUpdate({
            target: schema.syncState.chainId,
            set: { lastBlock: toBlock, updatedAt: Math.floor(Date.now() / 1000) }
        });
        return { eventsFound: 0, blocksProcessed: toBlock - fromBlock };
    }

    // Fetch receipts and blocks
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

    // Pre-fetch pool size
    const [poolQuery] = await db.select({ poolSize: sql<number>`MAX(${schema.privacyPoolStats.estimatedPoolSize})` })
        .from(schema.privacyPoolStats)
        .where(eq(schema.privacyPoolStats.chainId, chain.id));
    let cumulativePoolSize = poolQuery?.poolSize || 0;

    const solverUpdates = new Map<string, { count: number, gas: bigint, val: bigint }>();
    const dailyAggregates = new Map<string, { intents: number, vol: bigint, gas: number, solvers: Set<string> }>();
    // const assetUpdates = new Map<string, { in: bigint, out: bigint }>(); // Asset flow tracking - keeping simple for now
    const tokenTransferRows: any[] = [];

    // Arrays for batch insertion
    const eventsToInsert: typeof schema.events.$inferInsert[] = [];
    const payloadsToInsert: typeof schema.payloads.$inferInsert[] = [];
    const poolStatsToInsert: typeof schema.privacyPoolStats.$inferInsert[] = [];
    // Asset flows need special handling due to read-modify-write on conflict, 
    // but we can aggregate in memory first.

    for (const txHash in logsByTx) {
        const txReceipt = receiptMap.get(txHash);
        if (!txReceipt) continue;

        const txLogs = logsByTx[txHash];
        const solverAddress = txReceipt.from?.toLowerCase();
        const blockNumber = parseInt(txLogs[0].blockNumber, 16);
        // Optimization: Skip eth_getBlockByNumber for every tx if possible, but we need timestamp.
        // For now, fetch block.
        const block = await rpcRequest(chain.rpc_url, 'eth_getBlockByNumber', [txLogs[0].blockNumber, false]);
        const timestamp = parseInt(block?.timestamp || '0x0', 16);
        const date = new Date(timestamp * 1000).toISOString().split('T')[0];

        // We normally need eth_getTransactionByHash for value. skipping for brevity in this refactor unless critical.
        // The original code fetched it. Let's fetch it.
        const txData = await rpcRequest(chain.rpc_url, 'eth_getTransactionByHash', [txHash]);
        const valWei = BigInt(txData?.value || '0x0');
        const gasUsed = parseInt(txReceipt.gasUsed || '0x0', 16);
        const gasPrice = BigInt(txReceipt.effectiveGasPrice || '0x0');

        // Process Token Transfers
        for (const rLog of txReceipt.logs) {
            if (rLog.topics[0] === ERC20_TRANSFER_TOPIC) {
                const from = ('0x' + (rLog.topics[1]?.slice(26) || '')).toLowerCase();
                const to = ('0x' + (rLog.topics[2]?.slice(26) || '')).toLowerCase();
                const amount = BigInt(rLog.data || '0x0');
                const tokenAddr = rLog.address.toLowerCase();

                tokenTransferRows.push({
                    chainId: chain.id,
                    txHash,
                    blockNumber,
                    tokenAddress: tokenAddr,
                    fromAddress: from,
                    toAddress: to,
                    amountRaw: amount.toString(),
                    timestamp
                });
            }
        }

        // Process App Logs
        for (const log of txLogs) {
            if (log.topics[0] === TOPICS.TRANSACTION_EXECUTED) {
                eventsToInsert.push({
                    chainId: chain.id,
                    txHash,
                    blockNumber,
                    eventType: 'TransactionExecuted',
                    solverAddress,
                    valueWei: valWei.toString(),
                    gasUsed,
                    gasPriceWei: gasPrice.toString(),
                    dataJson: JSON.stringify(log.topics),
                    timestamp
                });
            } else if (log.topics[0] === TOPICS.COMMITMENT_ROOT_ADDED) {
                try {
                    const root = decodeAbiParameters(parseAbiParameters('bytes32 root'), log.data)[0];
                    cumulativePoolSize++;
                    poolStatsToInsert.push({
                        chainId: chain.id,
                        blockNumber,
                        rootHash: root as string,
                        timestamp,
                        estimatedPoolSize: cumulativePoolSize
                    })
                } catch { }
            } else if ([TOPICS.RESOURCE_PAYLOAD, TOPICS.DISCOVERY_PAYLOAD, TOPICS.EXTERNAL_PAYLOAD, TOPICS.APPLICATION_PAYLOAD].includes(log.topics[0])) {
                const type = log.topics[0] === TOPICS.RESOURCE_PAYLOAD ? 'Resource' : log.topics[0] === TOPICS.DISCOVERY_PAYLOAD ? 'Discovery' : log.topics[0] === TOPICS.EXTERNAL_PAYLOAD ? 'External' : 'Application';
                payloadsToInsert.push({
                    chainId: chain.id,
                    txHash,
                    blockNumber,
                    payloadType: type,
                    payloadIndex: 0, // Simplified for this loop
                    blob: log.data,
                    timestamp
                });
            }
        }

        // Aggregates
        const s = solverUpdates.get(solverAddress) || { count: 0, gas: BigInt(0), val: BigInt(0) };
        s.count++; s.gas += BigInt(gasUsed) * gasPrice; s.val += valWei;
        solverUpdates.set(solverAddress, s);

        const d = dailyAggregates.get(date) || { intents: 0, vol: BigInt(0), gas: 0, solvers: new Set() };
        d.intents++; d.vol += valWei; d.gas += gasUsed; d.solvers.add(solverAddress);
        dailyAggregates.set(date, d);
    }

    // --- BATCH INSERTS ---

    if (eventsToInsert.length) {
        await db.insert(schema.events).values(eventsToInsert).onConflictDoUpdate({
            target: [schema.events.chainId, schema.events.txHash],
            set: { valueWei: sql`excluded.value_wei`, gasUsed: sql`excluded.gas_used` }
        });
    }

    if (payloadsToInsert.length) {
        await db.insert(schema.payloads).values(payloadsToInsert).onConflictDoNothing();
    }

    if (poolStatsToInsert.length) {
        await db.insert(schema.privacyPoolStats).values(poolStatsToInsert).onConflictDoNothing();
    }

    // Solvers
    for (const [addr, s] of solverUpdates) {
        await db.insert(schema.solvers).values({
            chainId: chain.id,
            address: addr,
            txCount: s.count,
            totalGasSpent: s.gas.toString(),
            totalValueProcessed: s.val.toString(),
            firstSeen: Math.floor(Date.now() / 1000), // Approximate if new
            lastSeen: Math.floor(Date.now() / 1000)
        }).onConflictDoUpdate({
            target: [schema.solvers.chainId, schema.solvers.address],
            set: {
                txCount: sql`${schema.solvers.txCount} + ${s.count}`,
                totalGasSpent: sql`CAST(CAST(${schema.solvers.totalGasSpent} AS INTEGER) + ${s.gas.toString()} AS TEXT)`,
                totalValueProcessed: sql`CAST(CAST(${schema.solvers.totalValueProcessed} AS INTEGER) + ${s.val.toString()} AS TEXT)`,
                lastSeen: sql`excluded.last_seen`
            }
        });
    }

    // Daily Stats
    for (const [date, d] of dailyAggregates) {
        await db.insert(schema.dailyStats).values({
            chainId: chain.id,
            date,
            intentCount: d.intents,
            totalVolume: d.vol.toString(),
            uniqueSolvers: d.solvers.size,
            totalGasUsed: d.gas,
            gasSaved: 0
        }).onConflictDoUpdate({
            target: [schema.dailyStats.chainId, schema.dailyStats.date],
            set: {
                intentCount: sql`${schema.dailyStats.intentCount} + ${d.intents}`,
                totalVolume: sql`CAST(CAST(${schema.dailyStats.totalVolume} AS INTEGER) + ${d.vol.toString()} AS TEXT)`,
                uniqueSolvers: sql`MAX(${schema.dailyStats.uniqueSolvers}, ${d.solvers.size})`, // Approximation
                totalGasUsed: sql`${schema.dailyStats.totalGasUsed} + ${d.gas}`
            }
        });
    }

    // Token Transfers & Pricing
    if (tokenTransferRows.length > 0) {
        const uniqueTokens = [...new Set(tokenTransferRows.map(t => t.tokenAddress))];
        const metadataMap = new Map<string, { symbol: string; decimals: number }>();
        for (const addr of uniqueTokens) {
            metadataMap.set(addr, await fetchTokenMetadata(addr, chain.rpc_url));
        }
        const pricesMap = await fetchPythPrices(uniqueTokens);

        const transfersToInsert: typeof schema.tokenTransfers.$inferInsert[] = [];

        for (const t of tokenTransferRows) {
            const meta = metadataMap.get(t.tokenAddress) || { symbol: 'UNKNOWN', decimals: 18 };
            const priceUsd = pricesMap.get(t.tokenAddress) || 0;
            const amountDisplay = Number(BigInt(t.amountRaw)) / Math.pow(10, meta.decimals);
            const amountUsd = amountDisplay * priceUsd;

            transfersToInsert.push({
                chainId: chain.id,
                txHash: t.txHash,
                blockNumber: t.blockNumber,
                tokenAddress: t.tokenAddress,
                tokenSymbol: meta.symbol,
                tokenDecimals: meta.decimals,
                fromAddress: t.fromAddress,
                toAddress: t.toAddress,
                amountRaw: t.amountRaw,
                amountDisplay,
                amountUsd,
                timestamp: t.timestamp
            });
        }

        // Insert transfers
        await db.insert(schema.tokenTransfers).values(transfersToInsert).onConflictDoUpdate({
            target: [schema.tokenTransfers.chainId, schema.tokenTransfers.txHash, schema.tokenTransfers.tokenAddress, schema.tokenTransfers.fromAddress, schema.tokenTransfers.toAddress],
            set: { amountUsd: sql`excluded.amount_usd` }
        });
    }

    // Update Sync State
    await db.insert(schema.syncState).values({
        chainId: chain.id,
        lastBlock: toBlock,
        updatedAt: Math.floor(Date.now() / 1000)
    }).onConflictDoUpdate({
        target: schema.syncState.chainId,
        set: { lastBlock: toBlock, updatedAt: Math.floor(Date.now() / 1000) }
    });

    return { eventsFound: logs.length, blocksProcessed: toBlock - fromBlock };
}
