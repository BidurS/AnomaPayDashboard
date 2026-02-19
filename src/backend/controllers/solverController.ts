import { DB } from '../db';
import * as schema from '../db/schema';
import { eq, desc, sql, and } from 'drizzle-orm';

export async function handleGetSolvers(db: DB, chainId: number, headers: any) {
    const results = await db.select({
        address: schema.solvers.address,
        tx_count: schema.solvers.txCount,
        total_gas_spent: schema.solvers.totalGasSpent,
        total_value_processed: schema.solvers.totalValueProcessed,
        first_seen: schema.solvers.firstSeen,
        last_seen: schema.solvers.lastSeen,
        total_volume_usd: sql<number>`COALESCE((
            SELECT SUM(t.amount_usd)
            FROM ${schema.tokenTransfers} t
            INNER JOIN ${schema.events} e ON t.tx_hash = e.tx_hash AND t.chain_id = e.chain_id
            WHERE e.solver_address = ${schema.solvers.address} AND e.chain_id = ${chainId}
        ), 0)`,
        forwarder_calls: sql<number>`COALESCE((
            SELECT COUNT(*)
            FROM ${schema.forwarderCalls} fc
            INNER JOIN ${schema.events} e ON fc.tx_hash = e.tx_hash AND fc.chain_id = e.chain_id
            WHERE e.solver_address = ${schema.solvers.address} AND e.chain_id = ${chainId}
        ), 0)`
    }).from(schema.solvers)
        .where(eq(schema.solvers.chainId, chainId))
        .orderBy(desc(schema.solvers.txCount))
        .limit(20);

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
    const solver = await db.select({
        address: schema.solvers.address,
        tx_count: schema.solvers.txCount,
        total_gas_spent: schema.solvers.totalGasSpent,
        total_value_processed: schema.solvers.totalValueProcessed,
        first_seen: schema.solvers.firstSeen,
        last_seen: schema.solvers.lastSeen
    }).from(schema.solvers)
        .where(and(eq(schema.solvers.chainId, chainId), eq(schema.solvers.address, address.toLowerCase())))
        .get();

    if (!solver) return new Response(JSON.stringify({ error: 'Solver not found' }), { status: 404, headers });

    const recentTxs = await db.select({
        tx_hash: schema.events.txHash,
        block_number: schema.events.blockNumber,
        value_wei: schema.events.valueWei,
        gas_used: schema.events.gasUsed,
        timestamp: schema.events.timestamp,
        primary_type: schema.events.primaryPayloadType
    }).from(schema.events)
        .where(and(eq(schema.events.chainId, chainId), eq(schema.events.solverAddress, address.toLowerCase())))
        .orderBy(desc(schema.events.blockNumber))
        .limit(50);

    const dailyActivity = await db.select({
        date: sql<string>`DATE(${schema.events.timestamp}, "unixepoch")`,
        count: sql<number>`COUNT(*)`
    }).from(schema.events)
        .where(and(eq(schema.events.chainId, chainId), eq(schema.events.solverAddress, address.toLowerCase())))
        .groupBy(sql`DATE(${schema.events.timestamp}, "unixepoch")`)
        .orderBy(desc(sql`DATE(${schema.events.timestamp}, "unixepoch")`))
        .limit(30);

    const [volQuery] = await db.select({
        totalVolume: sql<number>`COALESCE(SUM(${schema.tokenTransfers.amountUsd}), 0)`
    }).from(schema.tokenTransfers)
        .innerJoin(schema.events, and(
            eq(schema.tokenTransfers.chainId, schema.events.chainId),
            eq(schema.tokenTransfers.txHash, schema.events.txHash)
        ))
        .where(and(
            eq(schema.events.chainId, chainId),
            eq(schema.events.solverAddress, address.toLowerCase())
        ));

    const [forwarderCount] = await db.select({
        count: sql<number>`COUNT(*)`
    }).from(schema.forwarderCalls)
        .innerJoin(schema.events, and(
            eq(schema.forwarderCalls.chainId, schema.events.chainId),
            eq(schema.forwarderCalls.txHash, schema.events.txHash)
        ))
        .where(and(
            eq(schema.events.chainId, chainId),
            eq(schema.events.solverAddress, address.toLowerCase())
        ));

    const badges = [];
    const totalVol = volQuery?.totalVolume || 0;
    const fCount = forwarderCount?.count || 0;
    if (totalVol > 10000) badges.push('Whale');
    if (fCount > (solver.tx_count || 0) * 0.5) badges.push('DeFi Router');
    if (fCount === 0 && (solver.tx_count || 0) > 5) badges.push('CoW Master');

    return new Response(JSON.stringify({
        ...solver,
        totalVolumeUsd: totalVol,
        forwarderCallsCount: fCount,
        badges,
        recentTransactions: recentTxs || [],
        dailyActivity: dailyActivity.reverse()
    }), { headers });
}
