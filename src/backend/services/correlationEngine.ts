/**
 * Cross-Chain Correlation Engine — Phase 2 Intelligence Layer
 *
 * Finds related intents across chains by matching:
 * 1. Solver address + time proximity
 * 2. Value proximity + timestamp proximity
 * 3. Forwarder call patterns (bridge message hashes)
 */
import { DrizzleD1Database } from 'drizzle-orm/d1';
import { eq, and, gte, lte, sql, desc } from 'drizzle-orm';
import { intentLifecycle, crossChainCorrelations } from '../db/schema';

interface CorrelationCandidate {
    intentA: string;
    intentB: string;
    chainA: number;
    chainB: number;
    solverMatch: boolean;
    valueProximity: number;
    timeProximity: number;
    confidence: number;
    correlationType: string;
}

/**
 * Main correlation function — runs after lifecycle processing
 */
export async function findCrossChainCorrelations(
    db: DrizzleD1Database<any>,
    lookbackSeconds = 3600
): Promise<number> {
    const now = Math.floor(Date.now() / 1000);
    const cutoff = now - lookbackSeconds;

    // Fetch recent intents across all chains
    const recentIntents = await db
        .select({
            id: intentLifecycle.id,
            chainId: intentLifecycle.chainId,
            solver: intentLifecycle.solver,
            inputValueUsd: intentLifecycle.inputValueUsd,
            outputValueUsd: intentLifecycle.outputValueUsd,
            createdAt: intentLifecycle.createdAt,
            intentType: intentLifecycle.intentType,
            isMultiChain: intentLifecycle.isMultiChain,
            correlationId: intentLifecycle.correlationId,
            hasForwarderCalls: intentLifecycle.hasForwarderCalls,
        })
        .from(intentLifecycle)
        .where(gte(intentLifecycle.createdAt, cutoff))
        .orderBy(desc(intentLifecycle.createdAt))
        .limit(200);

    if (recentIntents.length < 2) return 0;

    // Group by chain
    const byChain = new Map<number, typeof recentIntents>();
    for (const intent of recentIntents) {
        const chain = byChain.get(intent.chainId) || [];
        chain.push(intent);
        byChain.set(intent.chainId, chain);
    }

    const chains = Array.from(byChain.keys());
    if (chains.length < 2) return 0;

    const candidates: CorrelationCandidate[] = [];

    // Compare intents across different chains
    for (let i = 0; i < chains.length; i++) {
        for (let j = i + 1; j < chains.length; j++) {
            const chainAIntents = byChain.get(chains[i])!;
            const chainBIntents = byChain.get(chains[j])!;

            for (const a of chainAIntents) {
                // Skip already correlated
                if (a.correlationId) continue;

                for (const b of chainBIntents) {
                    if (b.correlationId) continue;

                    const candidate = evaluateCorrelation(a, b, chains[i], chains[j]);
                    if (candidate && candidate.confidence > 0.3) {
                        candidates.push(candidate);
                    }
                }
            }
        }
    }

    // Sort by confidence and deduplicate
    candidates.sort((a, b) => b.confidence - a.confidence);
    const usedIntents = new Set<string>();
    let created = 0;

    for (const candidate of candidates) {
        if (usedIntents.has(candidate.intentA) || usedIntents.has(candidate.intentB)) continue;

        const correlationId = `corr_${candidate.intentA.slice(0, 16)}_${candidate.intentB.slice(0, 16)}`;

        try {
            await db.insert(crossChainCorrelations).values({
                correlationId,
                intentIds: JSON.stringify([candidate.intentA, candidate.intentB]),
                correlationType: candidate.correlationType,
                confidence: candidate.confidence,
                totalValueUsd: 0,
                chains: JSON.stringify([candidate.chainA, candidate.chainB]),
                status: 'completed',
                startedAt: now,
                completedAt: now,
            });

            // Update the intents with correlation ID
            await db
                .update(intentLifecycle)
                .set({ correlationId, isMultiChain: 1 })
                .where(eq(intentLifecycle.id, candidate.intentA));

            await db
                .update(intentLifecycle)
                .set({ correlationId, isMultiChain: 1 })
                .where(eq(intentLifecycle.id, candidate.intentB));

            usedIntents.add(candidate.intentA);
            usedIntents.add(candidate.intentB);
            created++;
        } catch (err) {
            // Unique constraint violation — already correlated
            console.debug(`[CorrEngine] Duplicate correlation skipped: ${correlationId}`);
        }
    }

    console.log(`[CorrEngine] Found ${candidates.length} candidates, created ${created} correlations`);
    return created;
}

/**
 * Evaluate correlation between two intents on different chains
 */
function evaluateCorrelation(
    a: any,
    b: any,
    chainA: number,
    chainB: number
): CorrelationCandidate | null {
    let confidence = 0;
    let correlationType = 'bridge';
    const signals: string[] = [];

    // Signal 1: Same solver (strong indicator)
    const solverMatch = a.solver && b.solver && a.solver.toLowerCase() === b.solver.toLowerCase();
    if (solverMatch) {
        confidence += 0.4;
        signals.push('solver_match');
    }

    // Signal 2: Time proximity (within 5 minutes = strong, 30 min = weak)
    const timeDiff = Math.abs((a.createdAt || 0) - (b.createdAt || 0));
    if (timeDiff < 300) {
        confidence += 0.3;
        signals.push('time_close');
    } else if (timeDiff < 1800) {
        confidence += 0.1;
        signals.push('time_moderate');
    } else {
        return null; // Too far apart
    }

    // Signal 3: Value proximity (within 5% = strong match)
    const valA = a.inputValueUsd || 0;
    const valB = a.inputValueUsd || 0;
    if (valA > 0 && valB > 0) {
        const valueDiff = Math.abs(valA - valB) / Math.max(valA, valB);
        if (valueDiff < 0.05) {
            confidence += 0.2;
            signals.push('value_match');
        } else if (valueDiff < 0.2) {
            confidence += 0.1;
            signals.push('value_close');
        }
    }

    // Signal 4: Forwarder calls (bridge indicator)
    if (a.hasForwarderCalls || b.hasForwarderCalls) {
        confidence += 0.1;
        correlationType = 'bridge';
        signals.push('forwarder_call');
    }

    // Signal 5: Intent type correlation
    if (a.intentType === 'bridge' || b.intentType === 'bridge') {
        confidence += 0.15;
        correlationType = 'bridge';
        signals.push('bridge_type');
    }

    // Need at least 2 signals
    if (signals.length < 2) return null;

    return {
        intentA: a.id,
        intentB: b.id,
        chainA,
        chainB,
        solverMatch: !!solverMatch,
        valueProximity: valA > 0 && valB > 0 ? 1 - Math.abs(valA - valB) / Math.max(valA, valB) : 0,
        timeProximity: 1 - timeDiff / 1800,
        confidence: Math.min(1, confidence),
        correlationType,
    };
}

/**
 * Get cross-chain flow data for Sankey diagram
 */
export async function getCrossChainFlows(
    db: DrizzleD1Database<any>,
    days = 30
): Promise<{ source: number; target: number; value: number; count: number }[]> {
    const cutoff = Math.floor(Date.now() / 1000) - days * 86400;

    const correlations = await db
        .select({
            chains: crossChainCorrelations.chains,
            totalValueUsd: crossChainCorrelations.totalValueUsd,
        })
        .from(crossChainCorrelations)
        .where(gte(crossChainCorrelations.startedAt, cutoff))
        .limit(500);

    const flowMap = new Map<string, { source: number; target: number; value: number; count: number }>();

    for (const corr of correlations) {
        try {
            const chains = JSON.parse(corr.chains || '[]');
            if (chains.length < 2) continue;

            const key = `${Math.min(chains[0], chains[1])}-${Math.max(chains[0], chains[1])}`;
            const existing = flowMap.get(key) || {
                source: Math.min(chains[0], chains[1]),
                target: Math.max(chains[0], chains[1]),
                value: 0,
                count: 0,
            };
            existing.value += corr.totalValueUsd || 0;
            existing.count++;
            flowMap.set(key, existing);
        } catch {
            continue;
        }
    }

    return Array.from(flowMap.values()).sort((a, b) => b.value - a.value);
}
