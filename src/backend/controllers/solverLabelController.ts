import { DB } from '../db';
import * as schema from '../db/schema';
import { eq, like, sql } from 'drizzle-orm';

// GET /api/admin/solvers — list all solvers with labels + stats
export async function handleGetSolvers(db: DB, headers: any) {
    // Get all solver labels
    const labels = await db.select().from(schema.solverLabels);
    const labelMap = new Map(labels.map(l => [l.address.toLowerCase(), l]));

    // Get solver stats from solvers table (aggregated across chains)
    const solverStats = await db
        .select({
            address: schema.solvers.address,
            totalTxCount: sql<number>`SUM(${schema.solvers.txCount})`,
            totalGasSpent: sql<string>`SUM(CAST(${schema.solvers.totalGasSpent} AS REAL))`,
            totalValueProcessed: sql<string>`SUM(CAST(${schema.solvers.totalValueProcessed} AS REAL))`,
            chainCount: sql<number>`COUNT(DISTINCT ${schema.solvers.chainId})`,
            firstSeen: sql<number>`MIN(${schema.solvers.firstSeen})`,
            lastSeen: sql<number>`MAX(${schema.solvers.lastSeen})`,
        })
        .from(schema.solvers)
        .groupBy(schema.solvers.address);

    // Merge labels + stats
    const result = solverStats.map(s => ({
        address: s.address,
        txCount: s.totalTxCount || 0,
        totalGasSpent: s.totalGasSpent || '0',
        totalValueProcessed: s.totalValueProcessed || '0',
        chainCount: s.chainCount || 0,
        firstSeen: s.firstSeen,
        lastSeen: s.lastSeen,
        label: labelMap.get(s.address.toLowerCase())?.label || null,
        category: labelMap.get(s.address.toLowerCase())?.category || null,
        logoUrl: labelMap.get(s.address.toLowerCase())?.logoUrl || null,
        website: labelMap.get(s.address.toLowerCase())?.website || null,
        notes: labelMap.get(s.address.toLowerCase())?.notes || null,
    }));

    // Also include labels for addresses not yet in solvers table
    for (const label of labels) {
        if (!result.find(r => r.address.toLowerCase() === label.address.toLowerCase())) {
            result.push({
                address: label.address,
                txCount: 0, totalGasSpent: '0', totalValueProcessed: '0',
                chainCount: 0, firstSeen: null as any, lastSeen: null as any,
                label: label.label, category: label.category,
                logoUrl: label.logoUrl, website: label.website, notes: label.notes,
            });
        }
    }

    return new Response(JSON.stringify(result), { headers });
}

// POST /api/admin/solvers/label — create or update a solver label
export async function handleSetSolverLabel(db: DB, body: any, headers: any) {
    const { address, label, category, logoUrl, website, notes } = body;
    if (!address || !label) {
        return new Response(JSON.stringify({ error: 'address and label are required' }), { status: 400, headers });
    }

    const now = Math.floor(Date.now() / 1000);
    await db.insert(schema.solverLabels).values({
        address: address.toLowerCase(),
        label,
        category: category || 'solver',
        logoUrl: logoUrl || null,
        website: website || null,
        notes: notes || null,
        createdAt: now,
        updatedAt: now,
    }).onConflictDoUpdate({
        target: schema.solverLabels.address,
        set: {
            label,
            category: category || 'solver',
            logoUrl: logoUrl || null,
            website: website || null,
            notes: notes || null,
            updatedAt: now,
        },
    });

    return new Response(JSON.stringify({ success: true }), { headers });
}

// DELETE /api/admin/solvers/label/:address — remove a solver label
export async function handleDeleteSolverLabel(db: DB, address: string, headers: any) {
    await db.delete(schema.solverLabels).where(eq(schema.solverLabels.address, address.toLowerCase()));
    return new Response(JSON.stringify({ success: true }), { headers });
}

// GET /api/solvers/labels — public endpoint for label map (used by frontend)
export async function handleGetPublicLabels(db: DB, headers: any) {
    const labels = await db.select({
        address: schema.solverLabels.address,
        label: schema.solverLabels.label,
        category: schema.solverLabels.category,
        logoUrl: schema.solverLabels.logoUrl,
    }).from(schema.solverLabels);
    return new Response(JSON.stringify(labels), { headers });
}
