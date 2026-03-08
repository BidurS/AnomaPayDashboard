import { DB } from '../db';
import * as schema from '../db/schema';
import { eq, desc, sql, and } from 'drizzle-orm';

export async function handleGetSolvers(db: DB, chainId: number, headers: any) {
    // chainId=0 means "all chains"
    const allChains = chainId === 0;
    const chainFilter = allChains ? sql`1=1` : eq(schema.solvers.chainId, chainId);
    const subqueryChainFilter = allChains ? sql`1=1` : sql`e.chain_id = ${chainId}`;

    const results = await db.select({
        address: schema.solvers.address,
        chain_id: schema.solvers.chainId,
        tx_count: schema.solvers.txCount,
        total_gas_spent: schema.solvers.totalGasSpent,
        total_value_processed: schema.solvers.totalValueProcessed,
        first_seen: schema.solvers.firstSeen,
        last_seen: schema.solvers.lastSeen,
        total_volume_usd: sql<number>`COALESCE((
            SELECT SUM(t.amount_usd)
            FROM ${schema.tokenTransfers} t
            INNER JOIN ${schema.events} e ON t.tx_hash = e.tx_hash AND t.chain_id = e.chain_id
            WHERE e.solver_address = ${schema.solvers.address} AND ${subqueryChainFilter}
        ), 0)`,
        forwarder_calls: sql<number>`COALESCE((
            SELECT COUNT(*)
            FROM ${schema.forwarderCalls} fc
            INNER JOIN ${schema.events} e ON fc.tx_hash = e.tx_hash AND fc.chain_id = e.chain_id
            WHERE e.solver_address = ${schema.solvers.address} AND ${subqueryChainFilter}
        ), 0)`
    }).from(schema.solvers)
        .where(chainFilter)
        .orderBy(desc(schema.solvers.txCount))
        .limit(50);

    // Map badges in-memory for performance
    const enrichedResults = results.map(s => {
        const badges = [];
        if (s.total_volume_usd > 10000) badges.push('Whale');
        if (s.forwarder_calls > (s.tx_count || 0) * 0.5) badges.push('DeFi Router');
        if (s.forwarder_calls === 0 && (s.tx_count || 0) > 5) badges.push('CoW Master');
        return { ...s, badges };
    });

    return new Response(JSON.stringify(enrichedResults), { headers });
}

export async function handleGetSolverDetail(db: DB, chainId: number, address: string, headers: any) {
    const addr = address.toLowerCase();
    const allChains = chainId === 0;
    const chainFilter = allChains ? eq(schema.solvers.address, addr) : and(eq(schema.solvers.chainId, chainId), eq(schema.solvers.address, addr));
    const eventChainFilter = allChains ? eq(schema.events.solverAddress, addr) : and(eq(schema.events.chainId, chainId), eq(schema.events.solverAddress, addr));

    // Get all chain entries for this solver
    const solverEntries = await db.select({
        address: schema.solvers.address,
        chain_id: schema.solvers.chainId,
        tx_count: schema.solvers.txCount,
        total_gas_spent: schema.solvers.totalGasSpent,
        total_value_processed: schema.solvers.totalValueProcessed,
        first_seen: schema.solvers.firstSeen,
        last_seen: schema.solvers.lastSeen
    }).from(schema.solvers).where(chainFilter);

    if (solverEntries.length === 0) return new Response(JSON.stringify({ error: 'Solver not found' }), { status: 404, headers });

    // Aggregate cross-chain stats
    const totalTxCount = solverEntries.reduce((s, e) => s + (e.tx_count || 0), 0);
    const totalGasSpent = solverEntries.reduce((s, e) => s + BigInt(e.total_gas_spent || '0'), BigInt(0));
    const totalValueProcessed = solverEntries.reduce((s, e) => s + BigInt(e.total_value_processed || '0'), BigInt(0));
    const firstSeen = Math.min(...solverEntries.map(e => e.first_seen || Infinity));
    const lastSeen = Math.max(...solverEntries.map(e => e.last_seen || 0));

    // Chain breakdown for donut chart
    const chainNames: Record<number, string> = { 1: 'Ethereum', 8453: 'Base', 42161: 'Arbitrum', 10: 'Optimism' };
    const chainBreakdown = solverEntries.map(e => ({
        chainId: e.chain_id,
        chainName: chainNames[e.chain_id] || `Chain ${e.chain_id}`,
        txCount: e.tx_count || 0,
        gasSpent: e.total_gas_spent || '0',
    }));

    // Recent transactions (across chains if chainId=0)
    const recentTxs = await db.select({
        tx_hash: schema.events.txHash,
        chain_id: schema.events.chainId,
        block_number: schema.events.blockNumber,
        value_wei: schema.events.valueWei,
        gas_used: schema.events.gasUsed,
        timestamp: schema.events.timestamp,
        primary_type: schema.events.primaryPayloadType
    }).from(schema.events)
        .where(eventChainFilter)
        .orderBy(desc(schema.events.blockNumber))
        .limit(50);

    // Daily activity (across chains)
    const dailyActivity = await db.select({
        date: sql<string>`DATE(${schema.events.timestamp}, "unixepoch")`,
        count: sql<number>`COUNT(*)`
    }).from(schema.events)
        .where(eventChainFilter)
        .groupBy(sql`DATE(${schema.events.timestamp}, "unixepoch")`)
        .orderBy(desc(sql`DATE(${schema.events.timestamp}, "unixepoch")`))
        .limit(90);

    // Volume (across chains)
    const volFilter = allChains
        ? eq(schema.events.solverAddress, addr)
        : and(eq(schema.events.chainId, chainId), eq(schema.events.solverAddress, addr));
    const [volQuery] = await db.select({
        totalVolume: sql<number>`COALESCE(SUM(${schema.tokenTransfers.amountUsd}), 0)`
    }).from(schema.tokenTransfers)
        .innerJoin(schema.events, and(
            eq(schema.tokenTransfers.chainId, schema.events.chainId),
            eq(schema.tokenTransfers.txHash, schema.events.txHash)
        ))
        .where(volFilter);

    // Forwarder calls (across chains)
    const fwdFilter = allChains
        ? eq(schema.events.solverAddress, addr)
        : and(eq(schema.events.chainId, chainId), eq(schema.events.solverAddress, addr));
    const [forwarderCount] = await db.select({
        count: sql<number>`COUNT(*)`
    }).from(schema.forwarderCalls)
        .innerJoin(schema.events, and(
            eq(schema.forwarderCalls.chainId, schema.events.chainId),
            eq(schema.forwarderCalls.txHash, schema.events.txHash)
        ))
        .where(fwdFilter);

    // Compute badges
    const totalVol = volQuery?.totalVolume || 0;
    const fCount = forwarderCount?.count || 0;
    const badges: string[] = [];
    if (totalVol > 10000) badges.push('Whale');
    if (fCount > totalTxCount * 0.5) badges.push('DeFi Router');
    if (fCount === 0 && totalTxCount > 5) badges.push('CoW Master');
    if (chainBreakdown.length > 1) badges.push('Multi-Chain');
    if (totalTxCount > 500) badges.push('Power Solver');
    if (totalTxCount > 100) badges.push('Veteran');

    // Compute Reputation Score (0-100)
    const ageDays = Math.max(1, (lastSeen - firstSeen) / 86400);
    const volumeScore = Math.min(30, (totalVol / 50000) * 30);              // max 30 pts
    const activityScore = Math.min(25, (totalTxCount / 500) * 25);          // max 25 pts
    const consistencyScore = Math.min(20, (dailyActivity.length / 30) * 20); // max 20 pts
    const chainDiversityScore = Math.min(15, chainBreakdown.length * 5);     // max 15 pts
    const longevityScore = Math.min(10, (ageDays / 30) * 10);               // max 10 pts
    const reputationScore = Math.round(volumeScore + activityScore + consistencyScore + chainDiversityScore + longevityScore);

    let reputationTier = 'Bronze';
    if (reputationScore >= 80) reputationTier = 'Diamond';
    else if (reputationScore >= 60) reputationTier = 'Gold';
    else if (reputationScore >= 40) reputationTier = 'Silver';

    return new Response(JSON.stringify({
        address: addr,
        tx_count: totalTxCount,
        total_gas_spent: totalGasSpent.toString(),
        total_value_processed: totalValueProcessed.toString(),
        first_seen: firstSeen,
        last_seen: lastSeen,
        totalVolumeUsd: totalVol,
        forwarderCallsCount: fCount,
        badges,
        chainBreakdown,
        reputationScore,
        reputationTier,
        reputationBreakdown: {
            volume: Math.round(volumeScore),
            activity: Math.round(activityScore),
            consistency: Math.round(consistencyScore),
            chainDiversity: Math.round(chainDiversityScore),
            longevity: Math.round(longevityScore),
        },
        recentTransactions: recentTxs || [],
        dailyActivity: dailyActivity.reverse()
    }), { headers });
}

