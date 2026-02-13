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
        last_seen: schema.solvers.lastSeen
    }).from(schema.solvers)
        .where(eq(schema.solvers.chainId, chainId))
        .orderBy(desc(schema.solvers.txCount))
        .limit(20);

    return new Response(JSON.stringify(results), { headers });
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
        timestamp: schema.events.timestamp
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

    // Total Volume Query (Complex Join)
    // Legacy: SELECT COALESCE(SUM(t.amount_usd), 0) ... FROM token_transfers t JOIN events e ...
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

    return new Response(JSON.stringify({
        ...solver,
        totalVolumeUsd: volQuery?.totalVolume || 0,
        recentTransactions: recentTxs || [],
        dailyActivity: dailyActivity.reverse()
    }), { headers });
}
