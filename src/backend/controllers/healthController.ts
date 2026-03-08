import { DB } from '../db';
import * as schema from '../db/schema';
import { eq, sql, desc } from 'drizzle-orm';

// GET /api/admin/health — system health dashboard
export async function handleGetHealth(db: DB, headers: any) {
    // 1. Database stats — row counts per table
    const tableStats = await Promise.allSettled([
        db.select({ count: sql<number>`COUNT(*)` }).from(schema.events).then(r => ({ table: 'events', count: r[0]?.count || 0 })),
        db.select({ count: sql<number>`COUNT(*)` }).from(schema.solvers).then(r => ({ table: 'solvers', count: r[0]?.count || 0 })),
        db.select({ count: sql<number>`COUNT(*)` }).from(schema.payloads).then(r => ({ table: 'payloads', count: r[0]?.count || 0 })),
        db.select({ count: sql<number>`COUNT(*)` }).from(schema.tokenTransfers).then(r => ({ table: 'token_transfers', count: r[0]?.count || 0 })),
        db.select({ count: sql<number>`COUNT(*)` }).from(schema.intentLifecycle).then(r => ({ table: 'intent_lifecycle', count: r[0]?.count || 0 })),
        db.select({ count: sql<number>`COUNT(*)` }).from(schema.dailyStats).then(r => ({ table: 'daily_stats', count: r[0]?.count || 0 })),
        db.select({ count: sql<number>`COUNT(*)` }).from(schema.assetFlows).then(r => ({ table: 'asset_flows', count: r[0]?.count || 0 })),
        db.select({ count: sql<number>`COUNT(*)` }).from(schema.privacyStates).then(r => ({ table: 'privacy_states', count: r[0]?.count || 0 })),
        db.select({ count: sql<number>`COUNT(*)` }).from(schema.forwarderCalls).then(r => ({ table: 'forwarder_calls', count: r[0]?.count || 0 })),
        db.select({ count: sql<number>`COUNT(*)` }).from(schema.actionEvents).then(r => ({ table: 'action_events', count: r[0]?.count || 0 })),
        db.select({ count: sql<number>`COUNT(*)` }).from(schema.simulationResults).then(r => ({ table: 'simulation_results', count: r[0]?.count || 0 })),
        db.select({ count: sql<number>`COUNT(*)` }).from(schema.solverEconomics).then(r => ({ table: 'solver_economics', count: r[0]?.count || 0 })),
        db.select({ count: sql<number>`COUNT(*)` }).from(schema.crossChainCorrelations).then(r => ({ table: 'cross_chain_correlations', count: r[0]?.count || 0 })),
        db.select({ count: sql<number>`COUNT(*)` }).from(schema.apiKeys).then(r => ({ table: 'api_keys', count: r[0]?.count || 0 })),
        db.select({ count: sql<number>`COUNT(*)` }).from(schema.apiUsage).then(r => ({ table: 'api_usage', count: r[0]?.count || 0 })),
        db.select({ count: sql<number>`COUNT(*)` }).from(schema.solverLabels).then(r => ({ table: 'solver_labels', count: r[0]?.count || 0 })),
    ]);

    const dbStats = tableStats
        .filter(r => r.status === 'fulfilled')
        .map(r => (r as PromiseFulfilledResult<any>).value);

    const totalRows = dbStats.reduce((sum, s) => sum + s.count, 0);

    // 2. Sync state per chain
    const syncStates = await db.select({
        chainId: schema.syncState.chainId,
        lastBlock: schema.syncState.lastBlock,
        updatedAt: schema.syncState.updatedAt,
    }).from(schema.syncState);

    const chainInfo = await db.select({
        id: schema.chains.id,
        name: schema.chains.name,
        icon: schema.chains.icon,
        isEnabled: schema.chains.isEnabled,
    }).from(schema.chains);

    const chainMap = new Map(chainInfo.map(c => [c.id, c]));

    const chainHealth = syncStates.map(s => {
        const chain = chainMap.get(s.chainId);
        const secondsSinceSync = Math.floor(Date.now() / 1000) - (s.updatedAt || 0);
        return {
            chainId: s.chainId,
            chainName: chain?.name || 'Unknown',
            chainIcon: chain?.icon || '🔗',
            isEnabled: chain?.isEnabled || 0,
            lastBlock: s.lastBlock,
            lastSyncAge: secondsSinceSync,
            lastSyncAgeHuman: secondsSinceSync < 60 ? `${secondsSinceSync}s ago` :
                secondsSinceSync < 3600 ? `${Math.floor(secondsSinceSync / 60)}m ago` :
                    secondsSinceSync < 86400 ? `${Math.floor(secondsSinceSync / 3600)}h ago` :
                        `${Math.floor(secondsSinceSync / 86400)}d ago`,
            status: secondsSinceSync < 300 ? 'healthy' :
                secondsSinceSync < 3600 ? 'stale' : 'critical',
        };
    });

    // 3. API usage stats (last 24h)
    const oneDayAgo = Math.floor(Date.now() / 1000) - 86400;
    const [apiStats] = await db.select({
        totalRequests: sql<number>`COUNT(*)`,
        avgResponseTime: sql<number>`AVG(${schema.apiUsage.responseTimeMs})`,
        uniqueKeys: sql<number>`COUNT(DISTINCT ${schema.apiUsage.keyHash})`,
    }).from(schema.apiUsage)
        .where(sql`${schema.apiUsage.timestamp} > ${oneDayAgo}`);

    // 4. Recent events (last 10)
    const recentEvents = await db.select({
        txHash: schema.events.txHash,
        chainId: schema.events.chainId,
        eventType: schema.events.eventType,
        timestamp: schema.events.timestamp,
    }).from(schema.events)
        .orderBy(desc(schema.events.timestamp))
        .limit(10);

    return new Response(JSON.stringify({
        database: {
            tables: dbStats,
            totalRows,
        },
        chains: chainHealth,
        api: {
            last24h: {
                totalRequests: apiStats?.totalRequests || 0,
                avgResponseTimeMs: Math.round(apiStats?.avgResponseTime || 0),
                uniqueApiKeys: apiStats?.uniqueKeys || 0,
            },
        },
        recentEvents,
        timestamp: Math.floor(Date.now() / 1000),
    }), { headers });
}

// GET /api/admin/export/:type — data export
export async function handleExport(db: DB, type: string, chainId: number | null, headers: any) {
    let data: any[] = [];

    switch (type) {
        case 'solvers': {
            data = await db.select().from(schema.solvers).limit(5000);
            break;
        }
        case 'events': {
            const q = db.select().from(schema.events);
            data = chainId
                ? await q.where(eq(schema.events.chainId, chainId)).limit(5000)
                : await q.limit(5000);
            break;
        }
        case 'transfers': {
            const q = db.select().from(schema.tokenTransfers);
            data = chainId
                ? await q.where(eq(schema.tokenTransfers.chainId, chainId)).limit(5000)
                : await q.limit(5000);
            break;
        }
        case 'intents': {
            const q = db.select().from(schema.intentLifecycle);
            data = chainId
                ? await q.where(eq(schema.intentLifecycle.chainId, chainId)).limit(5000)
                : await q.limit(5000);
            break;
        }
        case 'economics': {
            data = await db.select().from(schema.solverEconomics).limit(5000);
            break;
        }
        case 'daily_stats': {
            const q = db.select().from(schema.dailyStats);
            data = chainId
                ? await q.where(eq(schema.dailyStats.chainId, chainId)).limit(5000)
                : await q.limit(5000);
            break;
        }
        default:
            return new Response(JSON.stringify({ error: `Unknown export type: ${type}` }), { status: 400, headers });
    }

    return new Response(JSON.stringify({ type, count: data.length, data }), { headers });
}
