import { DB } from '../db';
import * as schema from '../db/schema';
import { eq, like, or, sql } from 'drizzle-orm';

interface SearchResult {
    type: 'transaction' | 'solver' | 'chain' | 'intent' | 'token_transfer' | 'label';
    id: string;
    title: string;
    subtitle: string;
    chainId?: number;
    metadata?: any;
}

// GET /api/admin/search?q=...
export async function handleSearch(db: DB, query: string, headers: any) {
    if (!query || query.length < 2) {
        return new Response(JSON.stringify({ results: [], query }), { headers });
    }

    const q = query.trim().toLowerCase();
    const results: SearchResult[] = [];

    // Detect query type
    const isTxHash = q.startsWith('0x') && q.length === 66;
    const isAddress = q.startsWith('0x') && q.length === 42;
    const isBlockNumber = /^\d+$/.test(q) && parseInt(q) > 1000;
    const isIntentId = q.includes(':') && q.startsWith('0x') === false;
    const isTextSearch = !isTxHash && !isAddress && !isBlockNumber;

    try {
        // 1. Transaction hash search
        if (isTxHash) {
            const txs = await db.select({
                txHash: schema.events.txHash,
                chainId: schema.events.chainId,
                blockNumber: schema.events.blockNumber,
                eventType: schema.events.eventType,
                solverAddress: schema.events.solverAddress,
                timestamp: schema.events.timestamp,
            }).from(schema.events)
                .where(eq(schema.events.txHash, q))
                .limit(10);

            for (const tx of txs) {
                results.push({
                    type: 'transaction',
                    id: `${tx.chainId}:${tx.txHash}`,
                    title: tx.txHash,
                    subtitle: `Chain ${tx.chainId} • Block ${tx.blockNumber} • ${tx.eventType}`,
                    chainId: tx.chainId,
                    metadata: tx,
                });
            }
        }

        // 2. Address search (solver, from/to in transfers)
        if (isAddress) {
            // Solver match
            const solverRows = await db.select({
                address: schema.solvers.address,
                chainId: schema.solvers.chainId,
                txCount: schema.solvers.txCount,
                lastSeen: schema.solvers.lastSeen,
            }).from(schema.solvers)
                .where(eq(schema.solvers.address, q))
                .limit(10);

            for (const s of solverRows) {
                results.push({
                    type: 'solver',
                    id: s.address,
                    title: s.address,
                    subtitle: `Chain ${s.chainId} • ${s.txCount} txs`,
                    chainId: s.chainId,
                    metadata: s,
                });
            }

            // Label match
            const labelRows = await db.select().from(schema.solverLabels)
                .where(eq(schema.solverLabels.address, q))
                .limit(5);

            for (const l of labelRows) {
                results.push({
                    type: 'label',
                    id: l.address,
                    title: `${l.label} (${l.category})`,
                    subtitle: l.address,
                    metadata: l,
                });
            }

            // Token transfers involving this address
            const transfers = await db.select({
                txHash: schema.tokenTransfers.txHash,
                chainId: schema.tokenTransfers.chainId,
                tokenSymbol: schema.tokenTransfers.tokenSymbol,
                amountDisplay: schema.tokenTransfers.amountDisplay,
                fromAddress: schema.tokenTransfers.fromAddress,
                toAddress: schema.tokenTransfers.toAddress,
            }).from(schema.tokenTransfers)
                .where(or(
                    eq(schema.tokenTransfers.fromAddress, q),
                    eq(schema.tokenTransfers.toAddress, q),
                ))
                .limit(10);

            for (const t of transfers) {
                results.push({
                    type: 'token_transfer',
                    id: `${t.chainId}:${t.txHash}:${t.tokenSymbol}`,
                    title: `${t.amountDisplay} ${t.tokenSymbol}`,
                    subtitle: `${t.fromAddress.slice(0, 10)}... → ${t.toAddress.slice(0, 10)}...`,
                    chainId: t.chainId,
                    metadata: t,
                });
            }
        }

        // 3. Block number search
        if (isBlockNumber) {
            const blockNum = parseInt(q);
            const blockTxs = await db.select({
                txHash: schema.events.txHash,
                chainId: schema.events.chainId,
                blockNumber: schema.events.blockNumber,
                eventType: schema.events.eventType,
            }).from(schema.events)
                .where(eq(schema.events.blockNumber, blockNum))
                .limit(20);

            for (const tx of blockTxs) {
                results.push({
                    type: 'transaction',
                    id: `${tx.chainId}:${tx.txHash}`,
                    title: tx.txHash,
                    subtitle: `Block ${tx.blockNumber} • ${tx.eventType}`,
                    chainId: tx.chainId,
                    metadata: tx,
                });
            }
        }

        // 4. Intent ID search
        if (isIntentId) {
            const intents = await db.select({
                id: schema.intentLifecycle.id,
                chainId: schema.intentLifecycle.chainId,
                status: schema.intentLifecycle.status,
                intentType: schema.intentLifecycle.intentType,
                solver: schema.intentLifecycle.solver,
                txHash: schema.intentLifecycle.txHash,
            }).from(schema.intentLifecycle)
                .where(eq(schema.intentLifecycle.id, q))
                .limit(5);

            for (const i of intents) {
                results.push({
                    type: 'intent',
                    id: i.id,
                    title: `Intent: ${i.intentType} (${i.status})`,
                    subtitle: `Chain ${i.chainId} • ${i.txHash.slice(0, 20)}...`,
                    chainId: i.chainId,
                    metadata: i,
                });
            }
        }

        // 5. Text search (labels, chain names)
        if (isTextSearch) {
            const labelMatches = await db.select().from(schema.solverLabels)
                .where(like(schema.solverLabels.label, `%${q}%`))
                .limit(10);

            for (const l of labelMatches) {
                results.push({
                    type: 'label',
                    id: l.address,
                    title: `${l.label} (${l.category})`,
                    subtitle: l.address,
                    metadata: l,
                });
            }

            const chainMatches = await db.select().from(schema.chains)
                .where(like(schema.chains.name, `%${q}%`))
                .limit(5);

            for (const c of chainMatches) {
                results.push({
                    type: 'chain',
                    id: String(c.id),
                    title: `${c.icon} ${c.name}`,
                    subtitle: `Chain ID ${c.id} • ${c.isEnabled ? 'Active' : 'Disabled'}`,
                    chainId: c.id,
                    metadata: c,
                });
            }
        }

    } catch (e: any) {
        return new Response(JSON.stringify({ error: e.message, results: [] }), { status: 500, headers });
    }

    return new Response(JSON.stringify({ results, query, count: results.length }), { headers });
}

// GET /api/admin/tx/:chainId/:txHash — transaction inspector
export async function handleTxInspect(db: DB, chainId: number, txHash: string, headers: any) {
    const [event] = await db.select().from(schema.events)
        .where(eq(schema.events.txHash, txHash))
        .limit(1);

    const txPayloads = await db.select().from(schema.payloads)
        .where(eq(schema.payloads.txHash, txHash));

    const transfers = await db.select().from(schema.tokenTransfers)
        .where(eq(schema.tokenTransfers.txHash, txHash));

    const forwarderCallRows = await db.select().from(schema.forwarderCalls)
        .where(eq(schema.forwarderCalls.txHash, txHash));

    const intent = await db.select().from(schema.intentLifecycle)
        .where(eq(schema.intentLifecycle.txHash, txHash))
        .limit(1);

    // Get solver label if applicable
    let solverLabel = null;
    const solverAddr = event?.solverAddress || intent?.[0]?.solver;
    if (solverAddr) {
        const [label] = await db.select().from(schema.solverLabels)
            .where(eq(schema.solverLabels.address, solverAddr.toLowerCase()))
            .limit(1);
        solverLabel = label || null;
    }

    // Get chain info
    const [chain] = await db.select({ name: schema.chains.name, icon: schema.chains.icon, explorerUrl: schema.chains.explorerUrl })
        .from(schema.chains).where(eq(schema.chains.id, chainId)).limit(1);

    return new Response(JSON.stringify({
        event: event || null,
        payloads: txPayloads,
        tokenTransfers: transfers,
        forwarderCalls: forwarderCallRows,
        intentLifecycle: intent?.[0] || null,
        solverLabel,
        chain: chain || null,
    }), { headers });
}
