import { DB } from '../db';
import * as schema from '../db/schema';
import { eq, sql } from 'drizzle-orm';
import { syncBlockRange } from '../services/indexer';
import { ChainConfig } from '../types';
import { rpcRequest } from '../utils/rpc';
import { Env } from '../index'; // Will need to define/export Env in index.ts or types

export async function handleHistoricalBackfill(db: DB, chainId: number, fromBlock: number | undefined, toBlock: number | undefined, headers: any) {
    const chain = await db.select().from(schema.chains).where(eq(schema.chains.id, chainId)).get();

    if (!chain) return new Response(JSON.stringify({ error: 'Chain not found' }), { status: 404, headers });

    const currentBlockHex = await rpcRequest(chain.rpcUrl, 'eth_blockNumber', []);
    const currentBlock = parseInt(currentBlockHex, 16);
    const start = fromBlock || chain.startBlock;
    const end = toBlock || currentBlock;

    // Type assertion: chain from DB matches ChainConfig (close enough, but properties are camelCase in schema, snake_case in ChainConfig interface often? 
    // Wait, schema defines `rpcUrl` (camelCase) mapping to `rpc_url` (snake_case column).
    // `ChainConfig` in `types/index.ts` uses `rpc_url`. 
    // I should align them or map them.
    // Schema output object keys are camelCase (rpcUrl).
    // So I should map it to ChainConfig format expected by syncBlockRange.
    const chainConfig: ChainConfig = {
        id: chain.id,
        name: chain.name,
        rpc_url: chain.rpcUrl,
        contract_address: chain.contractAddress,
        start_block: chain.startBlock,
        explorer_url: chain.explorerUrl,
        icon: chain.icon || '',
        is_enabled: chain.isEnabled
    };

    const result = await syncBlockRange(chainConfig, db, start, end);
    return new Response(JSON.stringify({ success: true, firstBatchResult: result }), { headers });
}

export async function handleImportData(db: DB, data: any, headers: any) {
    // D1 batch support with Drizzle
    const batch: any[] = [];

    if (data.events && data.events.length > 0) {
        batch.push(db.insert(schema.events).values(
            data.events.map((e: any) => ({
                chainId: e.chain_id,
                txHash: e.tx_hash,
                blockNumber: e.block_number,
                eventType: e.event_type,
                solverAddress: e.solver_address,
                valueWei: e.value_wei,
                gasUsed: e.gas_used,
                gasPriceWei: e.gas_price_wei,
                dataJson: e.data_json,
                decodedInput: e.decoded_input ? JSON.stringify(e.decoded_input) : null,
                primaryPayloadType: e.primary_payload_type,
                timestamp: e.timestamp
            }))
        ).onConflictDoUpdate({
            target: [schema.events.chainId, schema.events.txHash],
            set: {
                decodedInput: sql`excluded.decoded_input`,
                primaryPayloadType: sql`excluded.primary_payload_type`
            }
        }));
    }

    if (data.payloads && data.payloads.length > 0) {
        batch.push(db.insert(schema.payloads).values(
            data.payloads.map((p: any) => ({
                chainId: p.chain_id,
                txHash: p.tx_hash,
                blockNumber: p.block_number,
                payloadType: p.payload_type,
                payloadIndex: p.payload_index,
                blob: p.blob,
                timestamp: p.timestamp
            }))
        ).onConflictDoNothing());
    }

    if (data.privacy_stats && data.privacy_stats.length > 0) {
        batch.push(db.insert(schema.privacyStates).values(
            data.privacy_stats.map((p: any) => ({
                chainId: p.chain_id,
                blockNumber: p.block_number,
                rootHash: p.root_hash,
                timestamp: p.timestamp,
                estimatedPoolSize: p.estimated_pool_size
            }))
        ).onConflictDoUpdate({
            target: [schema.privacyStates.chainId, schema.privacyStates.rootHash],
            set: { estimatedPoolSize: sql`excluded.estimated_pool_size` }
        }));
    }

    // Process Solvers, DailyStats, etc. similarly...
    // For brevity and limits, assuming import is fully implemented or just partial here.
    // Given user instructions, full implementation is preferred.

    // 4. Solvers
    if (data.solvers && data.solvers.length > 0) {
        batch.push(db.insert(schema.solvers).values(
            data.solvers.map((s: any) => ({
                chainId: s.chain_id,
                address: s.address,
                txCount: s.count,
                totalGasSpent: s.gas,
                totalValueProcessed: s.val,
                lastSeen: s.timestamp,
                firstSeen: s.timestamp
            }))
        ).onConflictDoUpdate({
            target: [schema.solvers.chainId, schema.solvers.address],
            set: {
                txCount: sql`tx_count + excluded.tx_count`,
                lastSeen: sql`MAX(last_seen, excluded.last_seen)`,
            }
        }));
    }

    // 5. Daily Stats
    if (data.daily_stats && data.daily_stats.length > 0) {
        batch.push(db.insert(schema.dailyStats).values(
            data.daily_stats.map((d: any) => ({
                chainId: d.chain_id,
                date: d.date,
                intentCount: d.count,
                totalVolume: d.volume,
                totalGasUsed: d.gas,
            }))
        ).onConflictDoUpdate({
            target: [schema.dailyStats.chainId, schema.dailyStats.date],
            set: {
                intentCount: sql`intent_count + excluded.intent_count`,
                totalGasUsed: sql`total_gas_used + excluded.total_gas_used`,
            }
        }));
    }

    // 6. Asset Flows
    if (data.assets && data.assets.length > 0) {
        batch.push(db.insert(schema.assetFlows).values(
            data.assets.map((a: any) => ({
                chainId: a.chain_id,
                tokenAddress: a.token_address,
                tokenSymbol: a.token_symbol,
                flowIn: a.flow_in,
                flowOut: a.flow_out,
                txCount: 1,
                lastUpdated: sql`(strftime('%s', 'now'))`
            }))
        ).onConflictDoUpdate({
            target: [schema.assetFlows.chainId, schema.assetFlows.tokenAddress],
            set: {
                txCount: sql`tx_count + 1`,
                lastUpdated: sql`(strftime('%s', 'now'))`
            }
        }));
    }

    // Executes the batch
    // Drizzle batch API: db.batch([...statements])
    if (batch.length > 0) {
        await db.batch(batch as [any, ...any[]]);
    }

    return new Response(JSON.stringify({ success: true, count: batch.length }), { headers });
}
