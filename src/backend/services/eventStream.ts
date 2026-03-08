/**
 * Event Stream Service
 * Manages real-time event buffer in D1 and SSE streaming to clients.
 */
import { DrizzleD1Database } from 'drizzle-orm/d1';

type DB = DrizzleD1Database<any>;

/* ─── Event Types ─── */
export type EventType = 'intent_created' | 'intent_settled' | 'solver_matched' | 'simulation_complete' | 'cross_chain_detected';

export interface RealtimeEvent {
    id?: number;
    eventType: EventType;
    chainId: number;
    payload: Record<string, any>;
    createdAt: number;
}

/* ─── Push Event ─── */
export async function pushEvent(
    db: DB,
    eventType: EventType,
    chainId: number,
    payload: Record<string, any>
): Promise<void> {
    try {
        await db.run(
            (db as any).dialect?.sqlQuery?.(
                `INSERT INTO realtime_events (event_type, chain_id, payload, created_at) VALUES (?, ?, ?, ?)`,
                [eventType, chainId, JSON.stringify(payload), Math.floor(Date.now() / 1000)]
            ) ??
            // Fallback: use raw SQL via the underlying D1
            undefined as any
        );
    } catch {
        // Use raw prepare if drizzle run fails
        const rawDb = (db as any).session?.client;
        if (rawDb) {
            await rawDb.prepare(
                `INSERT INTO realtime_events (event_type, chain_id, payload, created_at) VALUES (?, ?, ?, ?)`
            ).bind(eventType, chainId, JSON.stringify(payload), Math.floor(Date.now() / 1000)).run();
        }
    }
}

/* ─── Push via raw D1 (preferred in Workers) ─── */
export async function pushEventRaw(
    d1: D1Database,
    eventType: EventType,
    chainId: number,
    payload: Record<string, any>
): Promise<void> {
    await d1.prepare(
        `INSERT INTO realtime_events (event_type, chain_id, payload, created_at) VALUES (?, ?, ?, ?)`
    ).bind(eventType, chainId, JSON.stringify(payload), Math.floor(Date.now() / 1000)).run();
}

/* ─── Get Recent Events ─── */
export async function getRecentEvents(
    d1: D1Database,
    since: number = 0,
    limit: number = 50,
    eventType?: string
): Promise<RealtimeEvent[]> {
    let query = `SELECT id, event_type, chain_id, payload, created_at FROM realtime_events WHERE created_at > ?`;
    const params: any[] = [since];

    if (eventType) {
        query += ` AND event_type = ?`;
        params.push(eventType);
    }

    query += ` ORDER BY created_at DESC LIMIT ?`;
    params.push(limit);

    const stmt = d1.prepare(query);
    const result = await stmt.bind(...params).all();

    return (result.results || []).map((r: any) => ({
        id: r.id,
        eventType: r.event_type,
        chainId: r.chain_id,
        payload: typeof r.payload === 'string' ? JSON.parse(r.payload) : r.payload,
        createdAt: r.created_at,
    }));
}

/* ─── SSE Stream Handler ─── */
export async function handleSSEStream(
    d1: D1Database,
    request: Request
): Promise<Response> {
    const url = new URL(request.url);
    const since = parseInt(url.searchParams.get('since') || '0', 10);
    const eventType = url.searchParams.get('type') || undefined;

    // For Workers, we can't do true long-polling SSE (CPU limits).
    // Instead, return a batch of recent events in SSE format.  
    // The client reconnects every few seconds using EventSource retry.
    const events = await getRecentEvents(d1, since, 50, eventType);

    // Build SSE response
    const lines: string[] = [];
    lines.push(`retry: 3000\n`); // Client reconnects after 3s

    if (events.length === 0) {
        // Send a keep-alive comment
        lines.push(`: heartbeat ${Date.now()}\n\n`);
    } else {
        for (const evt of events.reverse()) { // chronological order
            lines.push(`id: ${evt.id}`);
            lines.push(`event: ${evt.eventType}`);
            lines.push(`data: ${JSON.stringify({ ...evt.payload, chainId: evt.chainId, timestamp: evt.createdAt })}\n`);
        }
    }

    // Include the latest event timestamp for next poll
    const latestTs = events.length > 0 ? Math.max(...events.map(e => e.createdAt)) : since;
    lines.push(`event: sync`);
    lines.push(`data: ${JSON.stringify({ latestTimestamp: latestTs, count: events.length })}\n`);

    return new Response(lines.join('\n'), {
        headers: {
            'Content-Type': 'text/event-stream',
            'Cache-Control': 'no-cache',
            'Connection': 'keep-alive',
            'Access-Control-Allow-Origin': '*',
            'X-Latest-Timestamp': String(latestTs),
        },
    });
}

/* ─── Cleanup old events (called from cron) ─── */
export async function cleanupOldEvents(d1: D1Database): Promise<number> {
    const cutoff = Math.floor(Date.now() / 1000) - 86400; // 24 hours
    const result = await d1.prepare(
        `DELETE FROM realtime_events WHERE created_at < ?`
    ).bind(cutoff).run();
    return result.meta?.changes || 0;
}

/* ─── Generate events from indexer results ─── */
export async function pushIndexerEvents(
    d1: D1Database,
    chainId: number,
    newTxCount: number,
    lifecycleProcessed: number
): Promise<void> {
    // Only push if there's actual activity
    if (newTxCount > 0) {
        await pushEventRaw(d1, 'intent_created', chainId, {
            count: newTxCount,
            message: `${newTxCount} new intent${newTxCount > 1 ? 's' : ''} indexed on chain ${chainId}`,
        });
    }

    if (lifecycleProcessed > 0) {
        await pushEventRaw(d1, 'intent_settled', chainId, {
            count: lifecycleProcessed,
            message: `${lifecycleProcessed} intent${lifecycleProcessed > 1 ? 's' : ''} settled on chain ${chainId}`,
        });
    }
}
