import { DB } from '../db';
import * as schema from '../db/schema';
import { eq, sql } from 'drizzle-orm';

export async function handleGetChains(db: DB, headers: any) {
    const results = await db.select({
        id: schema.chains.id,
        name: schema.chains.name,
        explorer_url: schema.chains.explorerUrl,
        icon: schema.chains.icon
    }).from(schema.chains).where(eq(schema.chains.isEnabled, 1));

    return new Response(JSON.stringify(results), { headers });
}

export async function handleGetAdminChains(db: DB, headers: any) {
    const results = await db.select().from(schema.chains).orderBy(schema.chains.id);
    return new Response(JSON.stringify(results), { headers });
}

export async function handleAddChain(db: DB, body: any, headers: any) {
    const { name, rpc_url, contract_address, start_block, explorer_url, icon } = body;
    if (!name || !rpc_url || !contract_address) return new Response(JSON.stringify({ error: 'Missing required fields' }), { status: 400, headers });

    try {
        const res = await db.insert(schema.chains).values({
            id: sql`ABS(RANDOM() % 1000000)`, // Temporary ID generation if not provided. SQLite usually handles auto-inc if defined, but `id` is primary key not auto-inc in schema definition?
            // Wait, chains.id is primary key but NOT auto-increment in Drizzle schema?
            // Let's check schema.ts. `id: integer('id').primaryKey(),` -> Not autoIncrement.
            // In original SQL it was just `id INTEGER PRIMARY KEY`. SQLite makes INTEGER PRIMARY KEY auto-increment by default alias to ROWID.
            // Drizzle should handle this if we omit ID?
            // Actually, for chains we might want specific IDs (chainId).
            // If the user provides an ID (like 8453 for Base), we should use it.
            // The body for `handleAddChain` usually implies a new chain config. 
            // Let's assume ID is generated or passed. The original code used `RETURNING id`.
            // If I insert without ID, SQLite will generate one.
            name,
            rpcUrl: rpc_url,
            contractAddress: contract_address,
            startBlock: start_block || 0,
            explorerUrl: explorer_url,
            icon: icon || 'https://raw.githubusercontent.com/trustwallet/assets/master/blockchains/ethereum/info/logo.png',
            isEnabled: 1
        }).returning({ id: schema.chains.id });

        return new Response(JSON.stringify({ success: true, id: res[0]?.id }), { headers });
    } catch (e: any) {
        return new Response(JSON.stringify({ error: e.message }), { status: 500, headers });
    }
}

export async function handleUpdateChain(db: DB, id: number, body: any, headers: any) {
    const { name, rpc_url, contract_address, start_block, explorer_url, icon, is_enabled } = body;
    try {
        const updates: any = {};
        if (name !== undefined) updates.name = name;
        if (rpc_url !== undefined) updates.rpcUrl = rpc_url;
        if (contract_address !== undefined) updates.contractAddress = contract_address;
        if (start_block !== undefined) updates.startBlock = start_block;
        if (explorer_url !== undefined) updates.explorerUrl = explorer_url;
        if (icon !== undefined) updates.icon = icon;
        if (is_enabled !== undefined) updates.isEnabled = is_enabled ? 1 : 0;

        if (Object.keys(updates).length === 0) return new Response(JSON.stringify({ success: true, message: 'No changes' }), { headers });

        await db.update(schema.chains).set(updates).where(eq(schema.chains.id, id));
        return new Response(JSON.stringify({ success: true }), { headers });
    } catch (e: any) {
        return new Response(JSON.stringify({ error: e.message }), { status: 500, headers });
    }
}

export async function handleDeleteChain(db: DB, id: number, headers: any) {
    try {
        await db.delete(schema.chains).where(eq(schema.chains.id, id));
        return new Response(JSON.stringify({ success: true }), { headers });
    } catch (e: any) {
        return new Response(JSON.stringify({ error: e.message }), { status: 500, headers });
    }
}
