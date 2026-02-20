import { DB } from '../db';
import * as schema from '../db/schema';
import { eq, sql, desc, and, gte } from 'drizzle-orm';

export async function handleGetStats(db: DB, chainId: number, headers: any) {
    const now = Math.floor(Date.now() / 1000);
    const dayAgo = now - 86400;
    const weekAgo = now - (86400 * 7);

    // Helper for robust volume calculation
    const volumeSql = sql<number>`SUM(
        CASE 
            WHEN ${schema.tokenTransfers.amountUsd} > 0 THEN ${schema.tokenTransfers.amountUsd}
            WHEN ${schema.tokenTransfers.tokenSymbol} IN ('USDC', 'USDT', 'DAI', 'USDbC') THEN ${schema.tokenTransfers.amountDisplay}
            ELSE 0 
        END
    )`;

    // 1. All-Time Stats
    const [tokenVolAllTime] = await db.select({
        total: sql<number>`COALESCE(${volumeSql}, 0)`
    }).from(schema.tokenTransfers).where(eq(schema.tokenTransfers.chainId, chainId));

    const [ethAllTime] = await db.select({
        ethValueProcessed: sql<string>`COALESCE(SUM(CAST(${schema.events.valueWei} AS NUMERIC)), '0')`,
        intentCount: sql<number>`COUNT(*)`,
        uniqueSolvers: sql<number>`COUNT(DISTINCT ${schema.events.solverAddress})`,
        totalGasUsed: sql<number>`COALESCE(SUM(${schema.events.gasUsed}), 0)`
    }).from(schema.events).where(eq(schema.events.chainId, chainId));

    // 2. 24h Stats
    const [dayQuery] = await db.select({
        intentCount: sql<number>`COUNT(*)`,
        totalGasUsed: sql<number>`COALESCE(SUM(${schema.events.gasUsed}), 0)`,
        ethValueProcessed: sql<string>`COALESCE(SUM(CAST(${schema.events.valueWei} AS NUMERIC)), '0')`
    }).from(schema.events).where(and(
        eq(schema.events.chainId, chainId),
        gte(schema.events.timestamp, dayAgo)
    ));

    const [tokenVolDay] = await db.select({
        total: sql<number>`COALESCE(${volumeSql}, 0)`
    }).from(schema.tokenTransfers).where(and(
        eq(schema.tokenTransfers.chainId, chainId),
        gte(schema.tokenTransfers.timestamp, dayAgo)
    ));

    // 3. 7d Stats
    const [tokenVolWeek] = await db.select({
        total: sql<number>`COALESCE(${volumeSql}, 0)`
    }).from(schema.tokenTransfers).where(and(
        eq(schema.tokenTransfers.chainId, chainId),
        gte(schema.tokenTransfers.timestamp, weekAgo)
    ));

    const [ethWeek] = await db.select({
        ethValueProcessed: sql<string>`COALESCE(SUM(CAST(${schema.events.valueWei} AS NUMERIC)), '0')`
    }).from(schema.events).where(and(
        eq(schema.events.chainId, chainId),
        gte(schema.events.timestamp, weekAgo)
    ));

    // Price of ETH fallback
    const ethPrice = 2600;
    const avgGasPriceGwei = 0.1;

    const allTimeEthUsd = (BigInt(ethAllTime?.ethValueProcessed || '0') * BigInt(ethPrice)) / (10n ** 18n);
    const dayEthUsd = (BigInt(dayQuery?.ethValueProcessed || '0') * BigInt(ethPrice)) / (10n ** 18n);
    const weekEthUsd = (BigInt(ethWeek?.ethValueProcessed || '0') * BigInt(ethPrice)) / (10n ** 18n);

    // Final Volume Calculation
    const totalVolume = (tokenVolAllTime?.total || 0) + Number(allTimeEthUsd);
    const volume24h = (tokenVolDay?.total || 0) + Number(dayEthUsd);
    const volume7d = (tokenVolWeek?.total || 0) + Number(weekEthUsd);

    // GAS SAVINGS CALCULATION
    const theoreticalCostGas = (ethAllTime?.intentCount || 0) * 150000;
    const actualCostGas = ethAllTime?.totalGasUsed || 0;
    const gasSavedUnits = Math.max(0, theoreticalCostGas - actualCostGas);
    const gasSavedEth = (BigInt(gasSavedUnits) * BigInt(Math.round(avgGasPriceGwei * 1e9))) / (10n ** 18n);
    const gasSavedUsd = Number(gasSavedEth) * ethPrice;

    return new Response(JSON.stringify({
        totalVolume,
        volume24h,
        volume7d,
        intentCount: ethAllTime?.intentCount || 0,
        intentCount24h: dayQuery?.intentCount || 0,
        uniqueSolvers: ethAllTime?.uniqueSolvers || 0,
        totalGasUsed: ethAllTime?.totalGasUsed || 0,
        gasSavedUsd: gasSavedUsd || (ethAllTime?.intentCount || 0) * 0.42,
    }), { headers });
}

export async function handleGetDailyStats(db: DB, chainId: number, days: number, headers: any) {
    const results = await db.select({
        date: schema.dailyStats.date,
        count: schema.dailyStats.intentCount,
        // Convert cents back to dollars for the chart
        volume: sql<number>`CAST(${schema.dailyStats.totalVolume} AS NUMERIC) / 100`,
        unique_solvers: schema.dailyStats.uniqueSolvers,
        total_gas_used: schema.dailyStats.totalGasUsed,
    }).from(schema.dailyStats)
        .where(eq(schema.dailyStats.chainId, chainId))
        .orderBy(desc(schema.dailyStats.date))
        .limit(days);

    return new Response(JSON.stringify(results.reverse()), { headers });
}

export async function handleGetResourceChurn(db: DB, chainId: number, days: number, headers: any) {
    const results = await db.select({
        date: sql<string>`DATE(${schema.privacyStates.timestamp}, "unixepoch")`,
        commitments: sql<number>`COUNT(*)`,
        pool_size: sql<number>`MAX(${schema.privacyStates.estimatedPoolSize})`
    }).from(schema.privacyStates)
        .where(eq(schema.privacyStates.chainId, chainId))
        .groupBy(sql`DATE(${schema.privacyStates.timestamp}, "unixepoch")`)
        .orderBy(desc(sql`DATE(${schema.privacyStates.timestamp}, "unixepoch")`))
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
    const [tvlQuery] = await db.select({
        tvl: sql<number>`COALESCE(SUM(${schema.tokenTransfers.amountUsd}), 0)`
    }).from(schema.tokenTransfers)
        .where(eq(schema.tokenTransfers.chainId, chainId));

    // For demo purposes, estimate TVL as 85% of total shielded volume
    const tvl = (tvlQuery?.tvl || 0) * 0.85;

    return new Response(JSON.stringify({
        tvl,
        shieldingRate: 0
    }), { headers });
}

export async function handleGetPrivacyStats(db: DB, chainId: number, headers: any) {
    const results = await db.select({
        block_number: schema.privacyStates.blockNumber,
        timestamp: schema.privacyStates.timestamp,
        estimated_pool_size: schema.privacyStates.estimatedPoolSize,
        root_hash: schema.privacyStates.rootHash
    }).from(schema.privacyStates)
        .where(eq(schema.privacyStates.chainId, chainId))
        .orderBy(desc(schema.privacyStates.blockNumber))
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
