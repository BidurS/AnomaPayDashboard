/**
 * Lifecycle Engine — transforms raw indexed events into structured intent lifecycle records
 * 
 * This service runs after the Blockscout indexer and creates/updates intent_lifecycle
 * records by correlating events, payloads, token transfers, privacy states, and
 * forwarder calls into a unified lifecycle view.
 */
import { DB } from '../db';
import * as schema from '../db/schema';
import { eq, sql, and, isNull, desc, inArray, gte } from 'drizzle-orm';

// ETH price fallback (same as statsController)
const ETH_PRICE = 2600;
const AVG_GAS_PRICE_GWEI = 0.1;

/**
 * Classify intent type from payload types and event data
 */
function classifyIntentType(payloadTypes: string[], hasForwarderCalls: boolean, decodedInput: any): string {
    if (payloadTypes.includes('External')) return 'bridge';
    if (payloadTypes.includes('Discovery')) return 'discovery';
    if (payloadTypes.includes('Application')) return 'application';
    if (payloadTypes.includes('Resource')) {
        if (hasForwarderCalls) return 'swap'; // Resource + forwarder = DEX interaction
        return 'resource';
    }
    // Fallback: if it has forwarder calls, likely a swap
    if (hasForwarderCalls) return 'swap';
    return 'unknown';
}

/**
 * Calculate USD gas cost from gas used and gas price
 */
function calculateGasCostUsd(gasUsed: number, gasPriceWei: string): number {
    try {
        const gasPriceGwei = Number(BigInt(gasPriceWei || '0')) / 1e9;
        const gasCostEth = (gasUsed * gasPriceGwei) / 1e9;
        return gasCostEth * ETH_PRICE;
    } catch {
        return gasUsed * AVG_GAS_PRICE_GWEI * ETH_PRICE / 1e9;
    }
}

/**
 * Process newly indexed events and create intent lifecycle records.
 * Called after the Blockscout indexer completes a sync cycle.
 */
export async function processLifecycleForNewEvents(db: DB, chainId: number): Promise<{
    processed: number;
    errors: string[];
}> {
    const result = { processed: 0, errors: [] as string[] };

    try {
        // Find events that don't have corresponding lifecycle records yet
        const unprocessedEvents = await db.select({
            txHash: schema.events.txHash,
            blockNumber: schema.events.blockNumber,
            solverAddress: schema.events.solverAddress,
            valueWei: schema.events.valueWei,
            gasUsed: schema.events.gasUsed,
            gasPriceWei: schema.events.gasPriceWei,
            dataJson: schema.events.dataJson,
            decodedInput: schema.events.decodedInput,
            primaryPayloadType: schema.events.primaryPayloadType,
            timestamp: schema.events.timestamp,
        })
            .from(schema.events)
            .leftJoin(
                schema.intentLifecycle,
                and(
                    eq(schema.events.chainId, schema.intentLifecycle.chainId),
                    eq(schema.events.txHash, schema.intentLifecycle.txHash)
                )
            )
            .where(and(
                eq(schema.events.chainId, chainId),
                isNull(schema.intentLifecycle.id)
            ))
            .orderBy(desc(schema.events.blockNumber))
            .limit(100); // Process in batches to stay within CPU limits

        if (unprocessedEvents.length === 0) return result;

        // Fetch associated data for these transactions
        const txHashes = unprocessedEvents.map(e => e.txHash);

        // Get payloads for these transactions
        const relatedPayloads = await db.select({
            txHash: schema.payloads.txHash,
            payloadType: schema.payloads.payloadType,
            payloadIndex: schema.payloads.payloadIndex,
            tag: schema.payloads.tag,
        })
            .from(schema.payloads)
            .where(and(
                eq(schema.payloads.chainId, chainId),
                inArray(schema.payloads.txHash, txHashes)
            ));

        // Get token transfers for volume calculation
        const relatedTransfers = await db.select({
            txHash: schema.tokenTransfers.txHash,
            amountUsd: schema.tokenTransfers.amountUsd,
            amountDisplay: schema.tokenTransfers.amountDisplay,
            tokenSymbol: schema.tokenTransfers.tokenSymbol,
        })
            .from(schema.tokenTransfers)
            .where(and(
                eq(schema.tokenTransfers.chainId, chainId),
                inArray(schema.tokenTransfers.txHash, txHashes)
            ));

        // Get privacy states (commitment roots) for these blocks
        const blockNumbers = [...new Set(unprocessedEvents.map(e => e.blockNumber))];
        const relatedPrivacy = await db.select({
            blockNumber: schema.privacyStates.blockNumber,
            rootHash: schema.privacyStates.rootHash,
        })
            .from(schema.privacyStates)
            .where(and(
                eq(schema.privacyStates.chainId, chainId),
                inArray(schema.privacyStates.blockNumber, blockNumbers)
            ));

        // Get action events for tree roots
        const relatedActions = await db.select({
            txHash: schema.actionEvents.txHash,
            actionTreeRoot: schema.actionEvents.actionTreeRoot,
            actionTagCount: schema.actionEvents.actionTagCount,
        })
            .from(schema.actionEvents)
            .where(and(
                eq(schema.actionEvents.chainId, chainId),
                inArray(schema.actionEvents.txHash, txHashes)
            ));

        // Get forwarder calls
        const relatedForwarders = await db.select({
            txHash: schema.forwarderCalls.txHash,
        })
            .from(schema.forwarderCalls)
            .where(and(
                eq(schema.forwarderCalls.chainId, chainId),
                inArray(schema.forwarderCalls.txHash, txHashes)
            ));

        // Build lookup maps
        const payloadMap = new Map<string, typeof relatedPayloads>();
        for (const p of relatedPayloads) {
            const key = p.txHash.toLowerCase();
            if (!payloadMap.has(key)) payloadMap.set(key, []);
            payloadMap.get(key)!.push(p);
        }

        const transferMap = new Map<string, typeof relatedTransfers>();
        for (const t of relatedTransfers) {
            const key = t.txHash.toLowerCase();
            if (!transferMap.has(key)) transferMap.set(key, []);
            transferMap.get(key)!.push(t);
        }

        const privacyMap = new Map<number, string>();
        for (const p of relatedPrivacy) {
            privacyMap.set(p.blockNumber, p.rootHash);
        }

        const actionMap = new Map<string, { root: string; tagCount: number }>();
        for (const a of relatedActions) {
            actionMap.set(a.txHash.toLowerCase(), {
                root: a.actionTreeRoot,
                tagCount: a.actionTagCount || 0,
            });
        }

        const forwarderSet = new Set(relatedForwarders.map(f => f.txHash.toLowerCase()));

        // Build lifecycle records
        const lifecycleRecords: (typeof schema.intentLifecycle.$inferInsert)[] = [];
        const lifecycleEventRecords: (typeof schema.lifecycleEvents.$inferInsert)[] = [];

        for (const event of unprocessedEvents) {
            const txHashLower = event.txHash.toLowerCase();
            const payloads = payloadMap.get(txHashLower) || [];
            const transfers = transferMap.get(txHashLower) || [];
            const action = actionMap.get(txHashLower);
            const hasForwarder = forwarderSet.has(txHashLower);
            const commitmentRoot = privacyMap.get(event.blockNumber);

            // Determine payload types
            const payloadTypes = [...new Set(payloads.map(p => p.payloadType))];

            // Classify intent type
            const intentType = classifyIntentType(
                payloadTypes,
                hasForwarder,
                event.decodedInput ? JSON.parse(event.decodedInput) : null
            );

            // Calculate financial data from token transfers
            const totalVolumeUsd = transfers.reduce((sum, t) => {
                if (t.amountUsd && t.amountUsd > 0) return sum + t.amountUsd;
                const sym = (t.tokenSymbol || '').toUpperCase();
                if (['USDC', 'USDT', 'DAI', 'USDB C'].some(s => sym.includes(s))) {
                    return sum + (t.amountDisplay || 0);
                }
                return sum;
            }, 0);

            const gasCostUsd = calculateGasCostUsd(event.gasUsed || 0, event.gasPriceWei || '0');

            // Is this intent shielded? (has commitment root in same block)
            const isShielded = commitmentRoot ? 1 : 0;

            const intentId = `${chainId}:${event.txHash}:0`;
            const now = Math.floor(Date.now() / 1000);

            lifecycleRecords.push({
                id: intentId,
                chainId,
                status: 'settled', // All indexed events are already settled on-chain
                intentType,
                creator: event.solverAddress, // In PA-EVM, the tx sender is the solver
                solver: event.solverAddress,
                actionTreeRoot: action?.root || null,
                tagCount: action?.tagCount || 0,
                inputValueUsd: totalVolumeUsd,
                outputValueUsd: totalVolumeUsd, // Approximate; ideally computed from output transfers
                solverProfitUsd: 0, // TODO: compute when we can distinguish input/output transfers
                gasCostUsd,
                gasUsed: event.gasUsed || 0,
                gasPriceWei: event.gasPriceWei || '0',
                isShielded,
                commitmentRoot: commitmentRoot || null,
                nullifierCount: 0,
                isMultiChain: 0,
                correlationId: null,
                payloadTypes: JSON.stringify(payloadTypes),
                payloadCount: payloads.length,
                hasForwarderCalls: hasForwarder ? 1 : 0,
                createdAt: event.timestamp || now,
                settledAt: event.timestamp || now,
                txHash: event.txHash,
                blockNumber: event.blockNumber,
                valueWei: event.valueWei || '0',
                rawDataJson: event.dataJson,
            });

            // Create lifecycle event for the settlement
            lifecycleEventRecords.push({
                intentId,
                fromStatus: 'pending',
                toStatus: 'settled',
                triggeredBy: event.solverAddress || 'system',
                metadata: JSON.stringify({
                    blockNumber: event.blockNumber,
                    gasUsed: event.gasUsed,
                    payloadTypes,
                    intentType,
                }),
                timestamp: event.timestamp || now,
            });
        }

        // Insert in batches
        if (lifecycleRecords.length > 0) {
            const batch: any[] = [];

            // Insert lifecycle records (with conflict handling)
            batch.push(
                db.insert(schema.intentLifecycle)
                    .values(lifecycleRecords)
                    .onConflictDoNothing()
            );

            // Insert lifecycle events
            if (lifecycleEventRecords.length > 0) {
                batch.push(
                    db.insert(schema.lifecycleEvents)
                        .values(lifecycleEventRecords)
                        .onConflictDoNothing()
                );
            }

            await db.batch(batch as [any, ...any[]]);
            result.processed = lifecycleRecords.length;
        }

    } catch (e: any) {
        result.errors.push(`Lifecycle processing: ${e.message}`);
    }

    return result;
}

/**
 * Compute and upsert daily solver economics from lifecycle data.
 * Should be called periodically (e.g., every hour or at end of day).
 */
export async function computeSolverEconomics(db: DB, chainId: number): Promise<{
    solversProcessed: number;
    errors: string[];
}> {
    const result = { solversProcessed: 0, errors: [] as string[] };

    try {
        const today = new Date().toISOString().split('T')[0];

        // Aggregate solver stats for today from lifecycle data
        const solverStats = await db.select({
            solver: schema.intentLifecycle.solver,
            intentsSolved: sql<number>`COUNT(*)`,
            totalGasCostUsd: sql<number>`COALESCE(SUM(${schema.intentLifecycle.gasCostUsd}), 0)`,
            totalVolumeUsd: sql<number>`COALESCE(SUM(${schema.intentLifecycle.inputValueUsd}), 0)`,
            intentTypes: sql<string>`GROUP_CONCAT(DISTINCT ${schema.intentLifecycle.intentType})`,
        })
            .from(schema.intentLifecycle)
            .where(and(
                eq(schema.intentLifecycle.chainId, chainId),
                eq(schema.intentLifecycle.status, 'settled'),
                gte(schema.intentLifecycle.createdAt, Math.floor(new Date(today).getTime() / 1000))
            ))
            .groupBy(schema.intentLifecycle.solver);

        if (solverStats.length === 0) return result;

        const batch: any[] = [];

        for (const stat of solverStats) {
            if (!stat.solver) continue;

            // Build intent type breakdown
            const typeBreakdown: Record<string, number> = {};
            if (stat.intentTypes) {
                for (const t of stat.intentTypes.split(',')) {
                    typeBreakdown[t.trim()] = (typeBreakdown[t.trim()] || 0) + 1;
                }
            }

            batch.push(
                db.insert(schema.solverEconomics).values({
                    solverAddress: stat.solver.toLowerCase(),
                    chainId,
                    period: today,
                    intentsSolved: stat.intentsSolved,
                    intentsFailed: 0,
                    totalRevenueUsd: stat.totalVolumeUsd * 0.003, // Estimate: 0.3% solver fee
                    totalGasCostUsd: stat.totalGasCostUsd,
                    netProfitUsd: (stat.totalVolumeUsd * 0.003) - stat.totalGasCostUsd,
                    avgSettlementTimeMs: 0,
                    avgBatchSize: 1,
                    successRate: 1.0,
                    intentTypesJson: JSON.stringify(typeBreakdown),
                }).onConflictDoUpdate({
                    target: [schema.solverEconomics.solverAddress, schema.solverEconomics.chainId, schema.solverEconomics.period],
                    set: {
                        intentsSolved: stat.intentsSolved,
                        totalRevenueUsd: stat.totalVolumeUsd * 0.003,
                        totalGasCostUsd: stat.totalGasCostUsd,
                        netProfitUsd: (stat.totalVolumeUsd * 0.003) - stat.totalGasCostUsd,
                        intentTypesJson: JSON.stringify(typeBreakdown),
                    },
                })
            );

            result.solversProcessed++;
        }

        if (batch.length > 0) {
            await db.batch(batch as [any, ...any[]]);
        }
    } catch (e: any) {
        result.errors.push(`Solver economics: ${e.message}`);
    }

    return result;
}
