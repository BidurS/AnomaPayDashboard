import { DB } from '../db';
import * as schema from '../db/schema';
import { eq, and, desc, sql, or, like } from 'drizzle-orm';

export async function handleGetLatestTransactions(db: DB, chainId: number, headers: any) {
    const results = await db.select({
        tx_hash: schema.events.txHash,
        block_number: schema.events.blockNumber,
        solver_address: schema.events.solverAddress,
        value_wei: schema.events.valueWei,
        gas_used: schema.events.gasUsed,
        timestamp: schema.events.timestamp,
        primary_type: sql<string>`(SELECT payload_type FROM payloads WHERE payloads.tx_hash = events.tx_hash LIMIT 1)`
    }).from(schema.events)
        .where(eq(schema.events.chainId, chainId))
        .orderBy(desc(schema.events.blockNumber))
        .limit(20);

    return new Response(JSON.stringify(results), { headers });
}

export async function handleGetTransactions(db: DB, params: URLSearchParams, headers: any) {
    const chainId = parseInt(params.get('chainId') || '8453');
    const address = params.get('address');
    const hash = params.get('hash');
    const page = parseInt(params.get('page') || '1');
    const limit = Math.min(parseInt(params.get('limit') || '50'), 100);
    const offset = (page - 1) * limit;

    const conditions = [eq(schema.events.chainId, chainId)];

    if (address) {
        conditions.push(or(
            eq(schema.events.solverAddress, address.toLowerCase()),
            sql`json_extract(${schema.events.decodedInput}, "$.args.transaction.actions[0].appData") LIKE ${address.toLowerCase()}`
        )!);
    } else if (hash) {
        conditions.push(eq(schema.events.txHash, hash));
    }

    const [countResult] = await db.select({ total: sql<number>`COUNT(*)` })
        .from(schema.events)
        .where(and(...conditions));

    const total = countResult?.total || 0;

    const results = await db.select({
        tx_hash: schema.events.txHash,
        block_number: schema.events.blockNumber,
        solver_address: schema.events.solverAddress,
        value_wei: schema.events.valueWei,
        gas_used: schema.events.gasUsed,
        timestamp: schema.events.timestamp,
        decoded_input: schema.events.decodedInput
    }).from(schema.events)
        .where(and(...conditions))
        .orderBy(desc(schema.events.blockNumber))
        .limit(limit)
        .offset(offset);

    return new Response(JSON.stringify({
        data: results,
        pagination: {
            page,
            limit,
            total,
            totalPages: Math.ceil(total / limit)
        }
    }), { headers });
}

export async function handleGetTxDetail(db: DB, chainId: number, txHash: string, headers: any) {
    const event = await db.select({
        tx_hash: schema.events.txHash,
        block_number: schema.events.blockNumber,
        event_type: schema.events.eventType,
        solver_address: schema.events.solverAddress,
        value_wei: schema.events.valueWei,
        gas_used: schema.events.gasUsed,
        gas_price_wei: schema.events.gasPriceWei,
        data_json: schema.events.dataJson,
        decoded_input: schema.events.decodedInput,
        timestamp: schema.events.timestamp
    }).from(schema.events)
        .where(and(eq(schema.events.chainId, chainId), eq(schema.events.txHash, txHash)))
        .get();

    if (!event) return new Response(JSON.stringify({ error: 'Transaction not found' }), { status: 404, headers });

    const payloads = await db.select({
        payload_type: schema.payloads.payloadType,
        payload_index: schema.payloads.payloadIndex,
        blob: schema.payloads.blob,
        timestamp: schema.payloads.timestamp
    }).from(schema.payloads)
        .where(and(eq(schema.payloads.chainId, chainId), eq(schema.payloads.txHash, txHash)))
        .orderBy(schema.payloads.payloadIndex);

    const tokenTransfers = await db.select({
        token_address: schema.tokenTransfers.tokenAddress,
        token_symbol: schema.tokenTransfers.tokenSymbol,
        token_decimals: schema.tokenTransfers.tokenDecimals,
        from_address: schema.tokenTransfers.fromAddress,
        to_address: schema.tokenTransfers.toAddress,
        amount_raw: schema.tokenTransfers.amountRaw,
        amount_display: schema.tokenTransfers.amountDisplay,
        amount_usd: schema.tokenTransfers.amountUsd,
        timestamp: schema.tokenTransfers.timestamp
    }).from(schema.tokenTransfers)
        .where(and(eq(schema.tokenTransfers.chainId, chainId), eq(schema.tokenTransfers.txHash, txHash)));

    const privacyRoot = await db.select({
        root_hash: schema.privacyPoolStats.rootHash,
        estimated_pool_size: schema.privacyPoolStats.estimatedPoolSize
    }).from(schema.privacyPoolStats)
        .where(and(
            eq(schema.privacyPoolStats.chainId, chainId),
            eq(schema.privacyPoolStats.blockNumber, event.block_number)
        )).get();

    return new Response(JSON.stringify({
        ...event,
        payloads: payloads || [],
        tokenTransfers: tokenTransfers || [],
        privacyRoot: privacyRoot || null
    }), { headers });
}

export async function handleGetTokenTransfers(db: DB, params: URLSearchParams, headers: any) {
    const chainId = parseInt(params.get('chainId') || '8453');
    const txHash = params.get('txHash');
    const tokenAddress = params.get('token');
    const page = parseInt(params.get('page') || '1');
    const limit = Math.min(parseInt(params.get('limit') || '50'), 100);
    const offset = (page - 1) * limit;

    const conditions = [eq(schema.tokenTransfers.chainId, chainId)];
    if (txHash) conditions.push(eq(schema.tokenTransfers.txHash, txHash));
    if (tokenAddress) conditions.push(eq(schema.tokenTransfers.tokenAddress, tokenAddress.toLowerCase()));

    const [countResult] = await db.select({ total: sql<number>`COUNT(*)` })
        .from(schema.tokenTransfers)
        .where(and(...conditions));
    const total = countResult?.total || 0;

    const results = await db.select({
        tx_hash: schema.tokenTransfers.txHash,
        block_number: schema.tokenTransfers.blockNumber,
        token_address: schema.tokenTransfers.tokenAddress,
        token_symbol: schema.tokenTransfers.tokenSymbol,
        token_decimals: schema.tokenTransfers.tokenDecimals,
        from_address: schema.tokenTransfers.fromAddress,
        to_address: schema.tokenTransfers.toAddress,
        amount_raw: schema.tokenTransfers.amountRaw,
        amount_display: schema.tokenTransfers.amountDisplay,
        amount_usd: schema.tokenTransfers.amountUsd,
        timestamp: schema.tokenTransfers.timestamp
    }).from(schema.tokenTransfers)
        .where(and(...conditions))
        .orderBy(desc(schema.tokenTransfers.timestamp))
        .limit(limit)
        .offset(offset);

    const assetSummary = await db.select({
        token_address: schema.tokenTransfers.tokenAddress,
        token_symbol: schema.tokenTransfers.tokenSymbol,
        token_decimals: schema.tokenTransfers.tokenDecimals,
        transfer_count: sql<number>`COUNT(*)`,
        total_amount: sql<number>`SUM(${schema.tokenTransfers.amountDisplay})`,
        total_usd: sql<number>`SUM(${schema.tokenTransfers.amountUsd})`
    }).from(schema.tokenTransfers)
        .where(eq(schema.tokenTransfers.chainId, chainId))
        .groupBy(schema.tokenTransfers.tokenAddress)
        .orderBy(desc(sql`SUM(${schema.tokenTransfers.amountUsd})`));

    return new Response(JSON.stringify({
        data: results,
        assetSummary: assetSummary || [],
        pagination: { page, limit, total, totalPages: Math.ceil(total / limit) }
    }), { headers });
}
