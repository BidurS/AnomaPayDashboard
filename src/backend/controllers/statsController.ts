import { DB } from '../db';
import * as schema from '../db/schema';
import { eq, sql, desc, and } from 'drizzle-orm';

export async function handleGetStats(db: DB, chainId: number, headers: any) {
    const [countQuery] = await db.select({
        intentCount: sql<number>`COUNT(*)`,
        uniqueSolvers: sql<number>`COUNT(DISTINCT ${schema.events.solverAddress})`,
        totalGasUsed: sql<number>`COALESCE(SUM(${schema.events.gasUsed}), 0)`
    }).from(schema.events).where(eq(schema.events.chainId, chainId));

    const [payloadQuery] = await db.select({
        payloadCount: sql<number>`COUNT(*)`
    }).from(schema.payloads).where(eq(schema.payloads.chainId, chainId));

    const [volQuery] = await db.select({
        totalVolumeUsd: sql<number>`COALESCE(SUM(${schema.tokenTransfers.amountUsd}), 0)`
    }).from(schema.tokenTransfers).where(eq(schema.tokenTransfers.chainId, chainId));

    const [assetQuery] = await db.select({
        assetCount: sql<number>`COUNT(DISTINCT ${schema.tokenTransfers.tokenAddress})`
    }).from(schema.tokenTransfers).where(eq(schema.tokenTransfers.chainId, chainId));

    const totalIntents = (countQuery?.intentCount || 0) + (payloadQuery?.payloadCount || 0);

    return new Response(JSON.stringify({
        totalVolume: volQuery?.totalVolumeUsd || 0,
        intentCount: totalIntents,
        uniqueSolvers: countQuery?.uniqueSolvers || 0,
        totalGasUsed: countQuery?.totalGasUsed || 0,
        assetCount: assetQuery?.assetCount || 0,
    }), { headers });
}

export async function handleGetDailyStats(db: DB, chainId: number, days: number, headers: any) {
    const results = await db.select({
        date: schema.dailyStats.date,
        count: schema.dailyStats.intentCount,
        volume: schema.dailyStats.totalVolume,
        unique_solvers: schema.dailyStats.uniqueSolvers,
        total_gas_used: schema.dailyStats.totalGasUsed,
        gas_saved: schema.dailyStats.gasSaved
    }).from(schema.dailyStats)
        .where(eq(schema.dailyStats.chainId, chainId))
        .orderBy(desc(schema.dailyStats.date))
        .limit(days);

    return new Response(JSON.stringify(results.reverse()), { headers });
}

export async function handleGetAssets(db: DB, chainId: number, headers: any) {
    const results = await db.select({
        token_address: schema.assetFlows.tokenAddress,
        asset_symbol: schema.assetFlows.tokenSymbol,
        flow_in: schema.assetFlows.flowIn,
        flow_out: schema.assetFlows.flowOut,
        tx_count: schema.assetFlows.txCount
    }).from(schema.assetFlows)
        .where(eq(schema.assetFlows.chainId, chainId))
        .orderBy(desc(schema.assetFlows.txCount));

    return new Response(JSON.stringify(results), { headers });
}

export async function handleGetNetworkHealth(db: DB, chainId: number, headers: any) {
    const CONTRACT = '0x9ed43c229480659bf6b6607c46d7b96c6d760cbb'; // Hardcoded for now per legacy

    const [tvlQuery] = await db.select({
        tvl: sql<number>`COALESCE(SUM(${schema.tokenTransfers.amountUsd}), 0)`
    }).from(schema.tokenTransfers)
        .where(and(
            eq(schema.tokenTransfers.chainId, chainId),
            eq(schema.tokenTransfers.toAddress, CONTRACT)
        ));

    const [outQuery] = await db.select({
        outflow: sql<number>`COALESCE(SUM(${schema.tokenTransfers.amountUsd}), 0)`
    }).from(schema.tokenTransfers)
        .where(and(
            eq(schema.tokenTransfers.chainId, chainId),
            eq(schema.tokenTransfers.fromAddress, CONTRACT)
        ));

    const tvl = Math.max(0, (tvlQuery?.tvl || 0) - (outQuery?.outflow || 0));

    return new Response(JSON.stringify({
        tvl,
        shieldingRate: 0
    }), { headers });
}

export async function handleGetPrivacyStats(db: DB, chainId: number, headers: any) {
    const results = await db.select({
        block_number: schema.privacyPoolStats.blockNumber,
        timestamp: schema.privacyPoolStats.timestamp,
        estimated_pool_size: schema.privacyPoolStats.estimatedPoolSize,
        root_hash: schema.privacyPoolStats.rootHash
    }).from(schema.privacyPoolStats)
        .where(eq(schema.privacyPoolStats.chainId, chainId))
        .orderBy(desc(schema.privacyPoolStats.blockNumber))
        .limit(50);

    return new Response(JSON.stringify(results.reverse()), { headers });
}

export async function handleGetPayloadStats(db: DB, chainId: number, headers: any) {
    const results = await db.select({
        type: schema.payloads.payloadType,
        count: sql<number>`COUNT(*)`
    }).from(schema.payloads)
        .where(eq(schema.payloads.chainId, chainId))
        .groupBy(schema.payloads.payloadType);

    return new Response(JSON.stringify(results), { headers });
}

export async function handleGetHealth(db: DB, chainId: number, headers: any) {
    // 1. Get last synced block from DB
    const syncState = await db.select().from(schema.syncState).where(eq(schema.syncState.chainId, chainId)).get();
    const lastSyncedBlock = syncState?.lastBlock || 0;

    // 2. Get current block from RPC (we need RpcURL from chains table)
    const chain = await db.select().from(schema.chains).where(eq(schema.chains.id, chainId)).get();
    if (!chain) return new Response(JSON.stringify({ status: 'error', message: 'Chain not found' }), { status: 404, headers });

    try {
        // We reuse the rpcRequest helper but need to import it or duplicate simple fetch
        // Let's import it from utils/rpc
        // Wait, imports are at top. I need to add import.
        // For now, I'll use a dynamic import or just fetch directly to keep it simple self-contained if possible, 
        // but importing is better.
        // Let's rely on adding the import statement in a separate edit or assume I can do it here.
        // I will add the import in a separate replace_file_content or let the next step handle it?
        // Actually, `rpcRequest` is in `../utils/rpc`. 
        // I will add the import at the top in a separate call to be safe, or just use fetch here.
        // Let's use fetch directly for zero-dependency in controller if possible? No, `rpcRequest` handles error parsing.

        // I'll add the function here but I need to `import { rpcRequest } from '../utils/rpc';` at top.
        // I will do that in a separate `replace_file_content` call to the top of the file.

        // For now, let's write the function assuming rpcRequest is available or I'll implement a simple one.
        // To avoid multiple edits, I'll just use fetch here.

        const rpcRes = await fetch(chain.rpcUrl, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ jsonrpc: '2.0', id: 1, method: 'eth_blockNumber', params: [] })
        });
        const rpcJson: any = await rpcRes.json();
        const currentBlock = parseInt(rpcJson.result, 16);

        const diff = currentBlock - lastSyncedBlock;
        const status = diff > 100 ? 'lagging' : 'synced'; // 100 blocks tolerance (~3 mins on Base)

        return new Response(JSON.stringify({
            status,
            diff,
            lastSyncedBlock,
            currentBlock,
            timestamp: new Date().toISOString()
        }), {
            status: status === 'synced' ? 200 : 503,
            headers
        });

    } catch (e: any) {
        return new Response(JSON.stringify({ status: 'error', message: e.message }), { status: 500, headers });
    }
}
