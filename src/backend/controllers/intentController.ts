/**
 * Intent Controller — API endpoints for the intent lifecycle engine
 * 
 * Provides paginated, filterable intent listing, lifecycle history,
 * and enhanced solver analytics with P&L data.
 */
import { DB } from '../db';
import * as schema from '../db/schema';
import { eq, desc, sql, and, gte, lte, like, inArray } from 'drizzle-orm';

// ─────────────────────────────────────────────────────────
//  Intent Endpoints
// ─────────────────────────────────────────────────────────

/**
 * GET /api/v3/intents — Paginated list of intents with filters
 */
export async function handleGetIntents(db: DB, chainId: number, params: URLSearchParams, headers: any) {
    const page = parseInt(params.get('page') || '1');
    const limit = Math.min(parseInt(params.get('limit') || '25'), 100);
    const offset = (page - 1) * limit;

    const status = params.get('status');
    const intentType = params.get('type');
    const solver = params.get('solver');
    const fromTs = params.get('from') ? parseInt(params.get('from')!) : null;
    const toTs = params.get('to') ? parseInt(params.get('to')!) : null;
    const shielded = params.get('shielded');

    // Build conditions
    const conditions = [eq(schema.intentLifecycle.chainId, chainId)];
    if (status) conditions.push(eq(schema.intentLifecycle.status, status));
    if (intentType) conditions.push(eq(schema.intentLifecycle.intentType, intentType));
    if (solver) conditions.push(eq(schema.intentLifecycle.solver, solver.toLowerCase()));
    if (fromTs) conditions.push(gte(schema.intentLifecycle.createdAt, fromTs));
    if (toTs) conditions.push(lte(schema.intentLifecycle.createdAt, toTs));
    if (shielded === '1') conditions.push(eq(schema.intentLifecycle.isShielded, 1));

    const whereClause = conditions.length === 1 ? conditions[0] : and(...conditions);

    const [countResult] = await db.select({
        total: sql<number>`COUNT(*)`,
    }).from(schema.intentLifecycle).where(whereClause);

    const intents = await db.select({
        id: schema.intentLifecycle.id,
        chainId: schema.intentLifecycle.chainId,
        status: schema.intentLifecycle.status,
        intentType: schema.intentLifecycle.intentType,
        solver: schema.intentLifecycle.solver,
        inputValueUsd: schema.intentLifecycle.inputValueUsd,
        outputValueUsd: schema.intentLifecycle.outputValueUsd,
        gasCostUsd: schema.intentLifecycle.gasCostUsd,
        gasUsed: schema.intentLifecycle.gasUsed,
        isShielded: schema.intentLifecycle.isShielded,
        isMultiChain: schema.intentLifecycle.isMultiChain,
        payloadTypes: schema.intentLifecycle.payloadTypes,
        payloadCount: schema.intentLifecycle.payloadCount,
        hasForwarderCalls: schema.intentLifecycle.hasForwarderCalls,
        tagCount: schema.intentLifecycle.tagCount,
        createdAt: schema.intentLifecycle.createdAt,
        settledAt: schema.intentLifecycle.settledAt,
        txHash: schema.intentLifecycle.txHash,
        blockNumber: schema.intentLifecycle.blockNumber,
    })
        .from(schema.intentLifecycle)
        .where(whereClause)
        .orderBy(desc(schema.intentLifecycle.createdAt))
        .limit(limit)
        .offset(offset);

    return new Response(JSON.stringify({
        data: intents,
        pagination: {
            page,
            limit,
            total: countResult?.total || 0,
            totalPages: Math.ceil((countResult?.total || 0) / limit),
        },
    }), { headers });
}

/**
 * GET /api/v3/intents/:id — Full intent detail with lifecycle history
 */
export async function handleGetIntentDetail(db: DB, chainId: number, intentId: string, headers: any) {
    const intent = await db.select()
        .from(schema.intentLifecycle)
        .where(eq(schema.intentLifecycle.id, intentId))
        .get();

    if (!intent) {
        return new Response(JSON.stringify({ error: 'Intent not found' }), { status: 404, headers });
    }

    // Get lifecycle events
    const lifecycleHistory = await db.select()
        .from(schema.lifecycleEvents)
        .where(eq(schema.lifecycleEvents.intentId, intentId))
        .orderBy(schema.lifecycleEvents.timestamp);

    // Get associated payloads
    const payloads = await db.select({
        payloadType: schema.payloads.payloadType,
        payloadIndex: schema.payloads.payloadIndex,
        tag: schema.payloads.tag,
        blob: schema.payloads.blob,
    })
        .from(schema.payloads)
        .where(and(
            eq(schema.payloads.chainId, chainId),
            eq(schema.payloads.txHash, intent.txHash)
        ))
        .orderBy(schema.payloads.payloadIndex);

    // Get token transfers
    const transfers = await db.select({
        tokenAddress: schema.tokenTransfers.tokenAddress,
        tokenSymbol: schema.tokenTransfers.tokenSymbol,
        fromAddress: schema.tokenTransfers.fromAddress,
        toAddress: schema.tokenTransfers.toAddress,
        amountDisplay: schema.tokenTransfers.amountDisplay,
        amountUsd: schema.tokenTransfers.amountUsd,
    })
        .from(schema.tokenTransfers)
        .where(and(
            eq(schema.tokenTransfers.chainId, chainId),
            eq(schema.tokenTransfers.txHash, intent.txHash)
        ));

    // Get forwarder calls
    const forwarderCalls = await db.select({
        untrustedForwarder: schema.forwarderCalls.untrustedForwarder,
        input: schema.forwarderCalls.input,
        output: schema.forwarderCalls.output,
    })
        .from(schema.forwarderCalls)
        .where(and(
            eq(schema.forwarderCalls.chainId, chainId),
            eq(schema.forwarderCalls.txHash, intent.txHash)
        ));

    return new Response(JSON.stringify({
        ...intent,
        payloadTypes: intent.payloadTypes ? JSON.parse(intent.payloadTypes) : [],
        lifecycle: lifecycleHistory,
        payloads,
        tokenTransfers: transfers,
        forwarderCalls,
    }), { headers });
}

/**
 * GET /api/v3/intents/:id/lifecycle — Lifecycle event history only
 */
export async function handleGetIntentLifecycle(db: DB, intentId: string, headers: any) {
    const events = await db.select()
        .from(schema.lifecycleEvents)
        .where(eq(schema.lifecycleEvents.intentId, intentId))
        .orderBy(schema.lifecycleEvents.timestamp);

    return new Response(JSON.stringify(events), { headers });
}

// ─────────────────────────────────────────────────────────
//  Analytics Endpoints
// ─────────────────────────────────────────────────────────

/**
 * GET /api/v3/analytics/intent-types — Intent type distribution
 */
export async function handleGetIntentTypeDistribution(db: DB, chainId: number, headers: any) {
    const results = await db.select({
        intentType: schema.intentLifecycle.intentType,
        count: sql<number>`COUNT(*)`,
        totalVolumeUsd: sql<number>`COALESCE(SUM(${schema.intentLifecycle.inputValueUsd}), 0)`,
        avgGasCostUsd: sql<number>`COALESCE(AVG(${schema.intentLifecycle.gasCostUsd}), 0)`,
        shieldedCount: sql<number>`SUM(CASE WHEN ${schema.intentLifecycle.isShielded} = 1 THEN 1 ELSE 0 END)`,
    })
        .from(schema.intentLifecycle)
        .where(eq(schema.intentLifecycle.chainId, chainId))
        .groupBy(schema.intentLifecycle.intentType)
        .orderBy(desc(sql`COUNT(*)`));

    return new Response(JSON.stringify(results), { headers });
}

/**
 * GET /api/v3/analytics/demand-heatmap — Intent demand by hour-of-day
 */
export async function handleGetDemandHeatmap(db: DB, chainId: number, headers: any) {
    const results = await db.select({
        dayOfWeek: sql<number>`CAST(strftime('%w', ${schema.intentLifecycle.createdAt}, 'unixepoch') AS INTEGER)`,
        hourOfDay: sql<number>`CAST(strftime('%H', ${schema.intentLifecycle.createdAt}, 'unixepoch') AS INTEGER)`,
        count: sql<number>`COUNT(*)`,
        totalVolumeUsd: sql<number>`COALESCE(SUM(${schema.intentLifecycle.inputValueUsd}), 0)`,
    })
        .from(schema.intentLifecycle)
        .where(eq(schema.intentLifecycle.chainId, chainId))
        .groupBy(
            sql`strftime('%w', ${schema.intentLifecycle.createdAt}, 'unixepoch')`,
            sql`strftime('%H', ${schema.intentLifecycle.createdAt}, 'unixepoch')`
        );

    return new Response(JSON.stringify(results), { headers });
}

/**
 * GET /api/v3/analytics/lifecycle-funnel — Intent lifecycle conversion funnel
 */
export async function handleGetLifecycleFunnel(db: DB, chainId: number, headers: any) {
    const results = await db.select({
        status: schema.intentLifecycle.status,
        count: sql<number>`COUNT(*)`,
        totalVolumeUsd: sql<number>`COALESCE(SUM(${schema.intentLifecycle.inputValueUsd}), 0)`,
    })
        .from(schema.intentLifecycle)
        .where(eq(schema.intentLifecycle.chainId, chainId))
        .groupBy(schema.intentLifecycle.status);

    return new Response(JSON.stringify(results), { headers });
}

// ─────────────────────────────────────────────────────────
//  Enhanced Solver Endpoints
// ─────────────────────────────────────────────────────────

/**
 * GET /api/v3/solvers/economics — Solver P&L leaderboard
 */
export async function handleGetSolverEconomics(db: DB, chainId: number, params: URLSearchParams, headers: any) {
    const days = parseInt(params.get('days') || '30');
    const cutoff = Math.floor(Date.now() / 1000) - (days * 86400);
    const cutoffDate = new Date(cutoff * 1000).toISOString().split('T')[0];

    const results = await db.select({
        solverAddress: schema.solverEconomics.solverAddress,
        totalIntentsSolved: sql<number>`SUM(${schema.solverEconomics.intentsSolved})`,
        totalRevenueUsd: sql<number>`SUM(${schema.solverEconomics.totalRevenueUsd})`,
        totalGasCostUsd: sql<number>`SUM(${schema.solverEconomics.totalGasCostUsd})`,
        netProfitUsd: sql<number>`SUM(${schema.solverEconomics.netProfitUsd})`,
        avgSuccessRate: sql<number>`AVG(${schema.solverEconomics.successRate})`,
        activeDays: sql<number>`COUNT(DISTINCT ${schema.solverEconomics.period})`,
    })
        .from(schema.solverEconomics)
        .where(and(
            eq(schema.solverEconomics.chainId, chainId),
            gte(schema.solverEconomics.period, cutoffDate)
        ))
        .groupBy(schema.solverEconomics.solverAddress)
        .orderBy(desc(sql`SUM(${schema.solverEconomics.netProfitUsd})`))
        .limit(50);

    // Add rankings
    const ranked = results.map((s, i) => ({
        ...s,
        rank: i + 1,
        profitPerIntent: s.totalIntentsSolved > 0 ? s.netProfitUsd / s.totalIntentsSolved : 0,
        roi: s.totalGasCostUsd > 0 ? (s.netProfitUsd / s.totalGasCostUsd) * 100 : 0,
    }));

    return new Response(JSON.stringify(ranked), { headers });
}

/**
 * GET /api/v3/solvers/:address/economics — Solver economic history
 */
export async function handleGetSolverEconHistory(db: DB, chainId: number, address: string, headers: any) {
    const history = await db.select()
        .from(schema.solverEconomics)
        .where(and(
            eq(schema.solverEconomics.chainId, chainId),
            eq(schema.solverEconomics.solverAddress, address.toLowerCase())
        ))
        .orderBy(desc(schema.solverEconomics.period))
        .limit(90);

    // Also get intent type breakdown from lifecycle
    const intentBreakdown = await db.select({
        intentType: schema.intentLifecycle.intentType,
        count: sql<number>`COUNT(*)`,
        totalVolumeUsd: sql<number>`COALESCE(SUM(${schema.intentLifecycle.inputValueUsd}), 0)`,
    })
        .from(schema.intentLifecycle)
        .where(and(
            eq(schema.intentLifecycle.chainId, chainId),
            eq(schema.intentLifecycle.solver, address.toLowerCase())
        ))
        .groupBy(schema.intentLifecycle.intentType);

    return new Response(JSON.stringify({
        history: history.reverse(),
        intentBreakdown,
        totals: {
            totalDays: history.length,
            totalIntents: history.reduce((s, h) => s + (h.intentsSolved || 0), 0),
            totalRevenue: history.reduce((s, h) => s + (h.totalRevenueUsd || 0), 0),
            totalGasCost: history.reduce((s, h) => s + (h.totalGasCostUsd || 0), 0),
            netProfit: history.reduce((s, h) => s + (h.netProfitUsd || 0), 0),
        },
    }), { headers });
}

// ─────────────────────────────────────────────────────────
//  Overview / Summary Endpoint
// ─────────────────────────────────────────────────────────

/**
 * GET /api/v3/overview — High-level platform summary
 */
export async function handleGetOverview(db: DB, chainId: number, headers: any) {
    const now = Math.floor(Date.now() / 1000);
    const dayAgo = now - 86400;
    const weekAgo = now - (86400 * 7);

    const [allTime] = await db.select({
        totalIntents: sql<number>`COUNT(*)`,
        totalVolumeUsd: sql<number>`COALESCE(SUM(${schema.intentLifecycle.inputValueUsd}), 0)`,
        uniqueSolvers: sql<number>`COUNT(DISTINCT ${schema.intentLifecycle.solver})`,
        shieldedIntents: sql<number>`SUM(CASE WHEN ${schema.intentLifecycle.isShielded} = 1 THEN 1 ELSE 0 END)`,
        avgGasCostUsd: sql<number>`COALESCE(AVG(${schema.intentLifecycle.gasCostUsd}), 0)`,
    }).from(schema.intentLifecycle).where(eq(schema.intentLifecycle.chainId, chainId));

    const [last24h] = await db.select({
        intentCount: sql<number>`COUNT(*)`,
        volumeUsd: sql<number>`COALESCE(SUM(${schema.intentLifecycle.inputValueUsd}), 0)`,
        uniqueSolvers: sql<number>`COUNT(DISTINCT ${schema.intentLifecycle.solver})`,
    }).from(schema.intentLifecycle).where(and(
        eq(schema.intentLifecycle.chainId, chainId),
        gte(schema.intentLifecycle.createdAt, dayAgo)
    ));

    const [last7d] = await db.select({
        intentCount: sql<number>`COUNT(*)`,
        volumeUsd: sql<number>`COALESCE(SUM(${schema.intentLifecycle.inputValueUsd}), 0)`,
    }).from(schema.intentLifecycle).where(and(
        eq(schema.intentLifecycle.chainId, chainId),
        gte(schema.intentLifecycle.createdAt, weekAgo)
    ));

    return new Response(JSON.stringify({
        allTime: {
            totalIntents: allTime?.totalIntents || 0,
            totalVolumeUsd: allTime?.totalVolumeUsd || 0,
            uniqueSolvers: allTime?.uniqueSolvers || 0,
            shieldedIntents: allTime?.shieldedIntents || 0,
            shieldedPercentage: allTime?.totalIntents ? ((allTime.shieldedIntents || 0) / allTime.totalIntents * 100).toFixed(1) : '0',
            avgGasCostUsd: allTime?.avgGasCostUsd || 0,
        },
        last24h: last24h || { intentCount: 0, volumeUsd: 0, uniqueSolvers: 0 },
        last7d: last7d || { intentCount: 0, volumeUsd: 0 },
    }), { headers });
}

// ─────────────────────────────────────────────────────────
//  Phase 2: Intelligence Endpoints
// ─────────────────────────────────────────────────────────

/**
 * GET /api/v3/intents/:id/simulation — Get AI simulation results
 */
export async function handleGetIntentSimulation(db: DB, intentId: string, headers: any) {
    const results = await db.select()
        .from(schema.simulationResults)
        .where(eq(schema.simulationResults.intentId, intentId))
        .orderBy(desc(schema.simulationResults.createdAt))
        .limit(5);

    const annotations = await db.select()
        .from(schema.intentAnnotations)
        .where(eq(schema.intentAnnotations.intentId, intentId))
        .orderBy(desc(schema.intentAnnotations.createdAt))
        .limit(20);

    return new Response(JSON.stringify({
        simulations: results.map(r => ({
            ...r,
            routeSteps: r.routeJson ? JSON.parse(r.routeJson) : [],
            riskFactors: r.riskFactors ? JSON.parse(r.riskFactors) : [],
        })),
        annotations,
    }), { headers });
}

/**
 * POST /api/v3/intents/simulate — Submit raw params for simulation
 */
export async function handleSimulateIntent(db: DB, body: any, env: any, headers: any) {
    try {
        const { simulateRaw } = await import('../services/simulationEngine');

        const input = {
            chainId: body.chainId || 8453,
            intentType: body.intentType || 'swap',
            inputToken: body.inputToken,
            outputToken: body.outputToken,
            inputAmountUsd: body.inputAmountUsd || 0,
            isShielded: body.isShielded || false,
        };

        const result = await simulateRaw(db, input, env);
        return new Response(JSON.stringify(result), { headers });
    } catch (err: any) {
        return new Response(JSON.stringify({ error: err.message }), { status: 500, headers });
    }
}

/**
 * GET /api/v3/analytics/cross-chain-flows — Cross-chain flow data for Sankey diagram
 */
export async function handleGetCrossChainFlows(db: DB, params: URLSearchParams, headers: any) {
    const { getCrossChainFlows } = await import('../services/correlationEngine');
    const days = parseInt(params.get('days') || '30');
    const flows = await getCrossChainFlows(db, days);

    return new Response(JSON.stringify({
        flows,
        chains: {
            1: 'Ethereum',
            10: 'Optimism',
            8453: 'Base',
            42161: 'Arbitrum',
        },
    }), { headers });
}

/**
 * GET /api/v3/analytics/ai-insights — Aggregated AI insights
 */
export async function handleGetAIInsights(db: DB, chainId: number, headers: any) {
    // Prediction accuracy stats
    const [accuracyStats] = await db.select({
        totalSimulations: sql<number>`COUNT(*)`,
        avgAccuracy: sql<number>`COALESCE(AVG(${schema.simulationResults.predictionAccuracy}), 0)`,
        highConfidenceCount: sql<number>`SUM(CASE WHEN ${schema.simulationResults.confidence} > 0.7 THEN 1 ELSE 0 END)`,
        avgRiskScore: sql<number>`COALESCE(AVG(${schema.simulationResults.riskScore}), 50)`,
        avgSimDuration: sql<number>`COALESCE(AVG(${schema.simulationResults.simulationDurationMs}), 0)`,
    }).from(schema.simulationResults).where(eq(schema.simulationResults.chainId, chainId));

    // Recent annotations
    const recentAnnotations = await db.select()
        .from(schema.intentAnnotations)
        .where(eq(schema.intentAnnotations.chainId, chainId))
        .orderBy(desc(schema.intentAnnotations.createdAt))
        .limit(20);

    // Annotation type distribution
    const annotationTypes = await db.select({
        type: schema.intentAnnotations.annotationType,
        count: sql<number>`COUNT(*)`,
    })
        .from(schema.intentAnnotations)
        .where(eq(schema.intentAnnotations.chainId, chainId))
        .groupBy(schema.intentAnnotations.annotationType);

    // Route type distribution from simulations
    const routeTypes = await db.select({
        routeType: schema.simulationResults.routeType,
        count: sql<number>`COUNT(*)`,
        avgConfidence: sql<number>`AVG(${schema.simulationResults.confidence})`,
        avgRiskScore: sql<number>`AVG(${schema.simulationResults.riskScore})`,
    })
        .from(schema.simulationResults)
        .where(eq(schema.simulationResults.chainId, chainId))
        .groupBy(schema.simulationResults.routeType);

    return new Response(JSON.stringify({
        accuracy: {
            totalSimulations: accuracyStats?.totalSimulations || 0,
            avgAccuracy: accuracyStats?.avgAccuracy || 0,
            highConfidenceCount: accuracyStats?.highConfidenceCount || 0,
            avgRiskScore: accuracyStats?.avgRiskScore || 50,
            avgSimDurationMs: accuracyStats?.avgSimDuration || 0,
        },
        recentAnnotations,
        annotationTypes,
        routeTypes,
    }), { headers });
}

