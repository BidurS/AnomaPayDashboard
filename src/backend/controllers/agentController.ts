/**
 * Agent Controller — Autonomous Solver Agent Infrastructure
 *
 * Endpoints for registering, executing, and managing autonomous agents.
 * Uses Privy server wallets for real wallet provisioning when configured.
 */
// eslint-disable-next-line @typescript-eslint/no-explicit-any
type DB = import('drizzle-orm/d1').DrizzleD1Database<any>;

import { eq, desc, sql, and } from 'drizzle-orm';
import { agents, agentExecutions } from '../db/schema';
import { createPrivyWallet, getPrivyConfig } from '../services/privyWallet';

interface AgentEnv {
    PRIVY_APP_ID?: string;
    PRIVY_APP_SECRET?: string;
}

// ─── Register Agent ──────────────────────────────────────

export async function handleRegisterAgent(db: DB, request: Request, env: AgentEnv, corsHeaders: Record<string, string>) {
    try {
        const body = await request.json() as {
            name?: string;
            strategy?: string;
            description?: string;
            maxGasPerTx?: number;
            maxDailySpend?: number;
            allowedChains?: number[];
            allowedIntentTypes?: string[];
            apiKeyHash?: string;
        };

        if (!body.name || !body.strategy) {
            return Response.json({ error: 'name and strategy are required' }, { status: 400, headers: corsHeaders });
        }

        const validStrategies = ['arbitrage', 'market_maker', 'liquidator', 'mev', 'custom'];
        if (!validStrategies.includes(body.strategy)) {
            return Response.json(
                { error: `Invalid strategy. Must be one of: ${validStrategies.join(', ')}` },
                { status: 400, headers: corsHeaders }
            );
        }

        const agentId = crypto.randomUUID();
        const now = Math.floor(Date.now() / 1000);

        // Provision wallet via Privy if configured, otherwise use deterministic placeholder
        let walletAddress: string;
        let walletSource = 'placeholder';
        const privyConfig = getPrivyConfig(env);

        if (privyConfig) {
            try {
                const wallet = await createPrivyWallet(privyConfig);
                walletAddress = wallet.address;
                walletSource = 'privy';
                console.log(`[Agent] Privy wallet provisioned: ${walletAddress} (id: ${wallet.walletId})`);
            } catch (privyError: any) {
                // Fallback to placeholder if Privy fails
                console.error(`[Agent] Privy wallet creation failed, using placeholder: ${privyError.message}`);
                walletAddress = `0x${agentId.replace(/-/g, '').slice(0, 40)}`;
            }
        } else {
            walletAddress = `0x${agentId.replace(/-/g, '').slice(0, 40)}`;
        }

        await db.insert(agents).values({
            id: agentId,
            name: body.name,
            strategy: body.strategy,
            walletAddress,
            status: 'active',
            apiKeyHash: body.apiKeyHash || null,
            maxGasPerTx: body.maxGasPerTx || 500000,
            maxDailySpend: body.maxDailySpend || 100,
            allowedChains: body.allowedChains ? JSON.stringify(body.allowedChains) : null,
            allowedIntentTypes: body.allowedIntentTypes ? JSON.stringify(body.allowedIntentTypes) : null,
            totalExecutions: 0,
            successfulExecutions: 0,
            totalGasSpent: 0,
            createdAt: now,
            lastActive: now,
        });

        const agent = await db.select().from(agents).where(eq(agents.id, agentId)).limit(1);

        return Response.json({
            success: true,
            data: { ...formatAgent(agent[0]), walletSource },
        }, { headers: corsHeaders });
    } catch (e: any) {
        return Response.json({ error: e.message || 'Failed to register agent' }, { status: 500, headers: corsHeaders });
    }
}

// ─── Execute Intent ──────────────────────────────────────

export async function handleExecuteIntent(db: DB, request: Request, corsHeaders: Record<string, string>) {
    try {
        const body = await request.json() as {
            agentId?: string;
            chainId?: number;
            intentType?: string;
            params?: Record<string, any>;
            simulate?: boolean;
        };

        if (!body.agentId || !body.chainId || !body.intentType) {
            return Response.json({ error: 'agentId, chainId, and intentType are required' }, { status: 400, headers: corsHeaders });
        }

        // Verify agent exists and is active
        const agentRows = await db.select().from(agents).where(eq(agents.id, body.agentId)).limit(1);
        if (agentRows.length === 0) {
            return Response.json({ error: 'Agent not found' }, { status: 404, headers: corsHeaders });
        }

        const agent = agentRows[0];
        if (agent.status !== 'active') {
            return Response.json({ error: `Agent is ${agent.status}. Resume before executing.` }, { status: 403, headers: corsHeaders });
        }

        // Validate chain is allowed
        if (agent.allowedChains) {
            const allowed = JSON.parse(agent.allowedChains) as number[];
            if (allowed.length > 0 && !allowed.includes(body.chainId)) {
                return Response.json({ error: `Chain ${body.chainId} not allowed for this agent` }, { status: 403, headers: corsHeaders });
            }
        }

        // Validate intent type is allowed
        if (agent.allowedIntentTypes) {
            const allowed = JSON.parse(agent.allowedIntentTypes) as string[];
            if (allowed.length > 0 && !allowed.includes(body.intentType)) {
                return Response.json({ error: `Intent type '${body.intentType}' not allowed for this agent` }, { status: 403, headers: corsHeaders });
            }
        }

        const executionId = crypto.randomUUID();
        const now = Math.floor(Date.now() / 1000);

        // Determine execution status
        const status: string = body.simulate ? 'simulated' : 'submitted';

        // Create simulation result (in production, this would call the AI simulation engine)
        const simulationResult = {
            intentId: executionId,
            predictedOutput: body.params?.amount || '0',
            predictedGas: Math.floor(Math.random() * 200000) + 50000,
            riskScore: Math.random() * 10,
            routes: [{
                type: body.intentType,
                path: [body.params?.inputToken || 'unknown', body.params?.outputToken || 'unknown'],
                estimatedOutput: body.params?.amount || '0',
                confidence: 0.85 + Math.random() * 0.15,
            }],
        };

        const gasUsed = body.simulate ? 0 : simulationResult.predictedGas;

        // Record execution
        await db.insert(agentExecutions).values({
            id: executionId,
            agentId: body.agentId,
            chainId: body.chainId,
            intentType: body.intentType,
            params: JSON.stringify(body.params || {}),
            status,
            txHash: body.simulate ? null : `0x${crypto.randomUUID().replace(/-/g, '')}`,
            gasUsed,
            result: JSON.stringify(simulationResult),
            createdAt: now,
        });

        // Update agent stats
        await db.update(agents)
            .set({
                totalExecutions: sql`${agents.totalExecutions} + 1`,
                successfulExecutions: status !== 'failed' ? sql`${agents.successfulExecutions} + 1` : agents.successfulExecutions,
                totalGasSpent: sql`${agents.totalGasSpent} + ${gasUsed}`,
                lastActive: now,
            })
            .where(eq(agents.id, body.agentId));

        const exec = await db.select().from(agentExecutions).where(eq(agentExecutions.id, executionId)).limit(1);

        return Response.json({
            success: true,
            data: {
                executionId: exec[0].id,
                agentId: exec[0].agentId,
                status: exec[0].status,
                txHash: exec[0].txHash,
                gasUsed: exec[0].gasUsed,
                simulation: simulationResult,
                createdAt: exec[0].createdAt,
            },
        }, { headers: corsHeaders });
    } catch (e: any) {
        return Response.json({ error: e.message || 'Execution failed' }, { status: 500, headers: corsHeaders });
    }
}

// ─── Agent Status ────────────────────────────────────────

export async function handleGetAgentStatus(db: DB, agentId: string, corsHeaders: Record<string, string>) {
    try {
        const rows = await db.select().from(agents).where(eq(agents.id, agentId)).limit(1);
        if (rows.length === 0) {
            return Response.json({ error: 'Agent not found' }, { status: 404, headers: corsHeaders });
        }

        return Response.json({ success: true, data: formatAgent(rows[0]) }, { headers: corsHeaders });
    } catch (e: any) {
        return Response.json({ error: e.message || 'Failed to get status' }, { status: 500, headers: corsHeaders });
    }
}

// ─── Agent History ───────────────────────────────────────

export async function handleGetAgentHistory(db: DB, agentId: string, limit: number, corsHeaders: Record<string, string>) {
    try {
        // Verify agent exists
        const agentRows = await db.select().from(agents).where(eq(agents.id, agentId)).limit(1);
        if (agentRows.length === 0) {
            return Response.json({ error: 'Agent not found' }, { status: 404, headers: corsHeaders });
        }

        const executions = await db.select()
            .from(agentExecutions)
            .where(eq(agentExecutions.agentId, agentId))
            .orderBy(desc(agentExecutions.createdAt))
            .limit(Math.min(limit, 100));

        const agent = agentRows[0];
        const total = agent.totalExecutions || 0;
        const succeeded = agent.successfulExecutions || 0;

        return Response.json({
            success: true,
            data: {
                executions: executions.map(e => ({
                    executionId: e.id,
                    agentId: e.agentId,
                    status: e.status,
                    txHash: e.txHash,
                    gasUsed: e.gasUsed,
                    result: e.result ? JSON.parse(e.result) : null,
                    createdAt: e.createdAt,
                })),
                summary: {
                    total,
                    succeeded,
                    failed: total - succeeded,
                    totalGasSpent: agent.totalGasSpent || 0,
                },
            },
        }, { headers: corsHeaders });
    } catch (e: any) {
        return Response.json({ error: e.message || 'Failed to get history' }, { status: 500, headers: corsHeaders });
    }
}

// ─── Pause / Resume ──────────────────────────────────────

export async function handlePauseAgent(db: DB, agentId: string, corsHeaders: Record<string, string>) {
    return updateAgentStatus(db, agentId, 'paused', corsHeaders);
}

export async function handleResumeAgent(db: DB, agentId: string, corsHeaders: Record<string, string>) {
    return updateAgentStatus(db, agentId, 'active', corsHeaders);
}

async function updateAgentStatus(db: DB, agentId: string, newStatus: string, corsHeaders: Record<string, string>) {
    try {
        const rows = await db.select().from(agents).where(eq(agents.id, agentId)).limit(1);
        if (rows.length === 0) {
            return Response.json({ error: 'Agent not found' }, { status: 404, headers: corsHeaders });
        }

        await db.update(agents)
            .set({ status: newStatus, lastActive: Math.floor(Date.now() / 1000) })
            .where(eq(agents.id, agentId));

        const updated = await db.select().from(agents).where(eq(agents.id, agentId)).limit(1);
        return Response.json({ success: true, data: formatAgent(updated[0]) }, { headers: corsHeaders });
    } catch (e: any) {
        return Response.json({ error: e.message || 'Failed to update agent' }, { status: 500, headers: corsHeaders });
    }
}

// ─── Helpers ─────────────────────────────────────────────

function formatAgent(row: any) {
    return {
        id: row.id,
        name: row.name,
        strategy: row.strategy,
        walletAddress: row.walletAddress,
        status: row.status,
        totalExecutions: row.totalExecutions || 0,
        successRate: row.totalExecutions > 0
            ? ((row.successfulExecutions || 0) / row.totalExecutions * 100).toFixed(1)
            : '0.0',
        totalGasSpent: row.totalGasSpent || 0,
        maxGasPerTx: row.maxGasPerTx,
        maxDailySpend: row.maxDailySpend,
        allowedChains: row.allowedChains ? JSON.parse(row.allowedChains) : [],
        allowedIntentTypes: row.allowedIntentTypes ? JSON.parse(row.allowedIntentTypes) : [],
        createdAt: row.createdAt,
        lastActive: row.lastActive,
    };
}
