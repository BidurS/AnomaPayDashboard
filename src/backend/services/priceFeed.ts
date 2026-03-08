/**
 * Price Feed Service — fetches live prices from CoinGecko
 * Caches in D1 with 5-minute TTL to avoid rate limits
 */
import { DB } from '../db';
import * as schema from '../db/schema';
import { eq, sql } from 'drizzle-orm';

const COINGECKO_BASE = 'https://api.coingecko.com/api/v3';

// Map of CoinGecko IDs → symbol
const TRACKED_TOKENS = [
    { id: 'ethereum', symbol: 'ETH' },
    { id: 'bitcoin', symbol: 'BTC' },
    { id: 'usd-coin', symbol: 'USDC' },
    { id: 'tether', symbol: 'USDT' },
    { id: 'dai', symbol: 'DAI' },
    { id: 'wrapped-bitcoin', symbol: 'WBTC' },
];

// Cache TTL: 5 minutes
const CACHE_TTL_SECONDS = 300;

interface TokenPrice {
    symbol: string;
    priceUsd: number;
    change24h: number;
    marketCap: number;
}

/**
 * Fetch live prices from CoinGecko and cache in D1
 */
export async function refreshPrices(db: DB): Promise<{ updated: number; errors: string[] }> {
    const errors: string[] = [];
    let updated = 0;

    try {
        const ids = TRACKED_TOKENS.map(t => t.id).join(',');
        const url = `${COINGECKO_BASE}/simple/price?ids=${ids}&vs_currencies=usd&include_24hr_change=true&include_market_cap=true`;

        const res = await fetch(url, {
            headers: { 'Accept': 'application/json' }
        });

        if (!res.ok) {
            errors.push(`CoinGecko HTTP ${res.status}`);
            return { updated, errors };
        }

        const data: any = await res.json();
        const now = Math.floor(Date.now() / 1000);

        for (const token of TRACKED_TOKENS) {
            const priceData = data[token.id];
            if (!priceData || !priceData.usd) continue;

            try {
                await db.insert(schema.priceCache).values({
                    id: token.id,
                    symbol: token.symbol,
                    priceUsd: priceData.usd,
                    change24h: priceData.usd_24h_change || 0,
                    marketCap: priceData.usd_market_cap || 0,
                    updatedAt: now,
                }).onConflictDoUpdate({
                    target: schema.priceCache.id,
                    set: {
                        priceUsd: priceData.usd,
                        change24h: priceData.usd_24h_change || 0,
                        marketCap: priceData.usd_market_cap || 0,
                        updatedAt: now,
                    },
                });
                updated++;
            } catch (e: any) {
                errors.push(`Insert ${token.symbol}: ${e.message}`);
            }
        }
    } catch (e: any) {
        errors.push(`CoinGecko fetch: ${e.message}`);
    }

    return { updated, errors };
}

/**
 * Get cached price for a symbol. Falls back to hardcoded if not cached.
 */
export async function getCachedPrice(db: DB, symbol: string): Promise<number> {
    const FALLBACK: Record<string, number> = {
        'ETH': 2600, 'WETH': 2600, 'BTC': 95000, 'WBTC': 95000,
        'USDC': 1, 'USDT': 1, 'DAI': 1,
    };

    try {
        const rows = await db.select()
            .from(schema.priceCache)
            .where(eq(schema.priceCache.symbol, symbol.toUpperCase()))
            .all();

        if (rows.length > 0) {
            const row = rows[0];
            const age = Math.floor(Date.now() / 1000) - (row.updatedAt || 0);
            // If cache is fresh (< 10 min), use it
            if (age < 600) {
                return row.priceUsd;
            }
        }
    } catch {
        // Table might not exist yet, fall through
    }

    return FALLBACK[symbol.toUpperCase()] || 0;
}

/**
 * Get all cached prices as a map
 */
export async function getAllCachedPrices(db: DB): Promise<Record<string, TokenPrice>> {
    const prices: Record<string, TokenPrice> = {};

    try {
        const rows = await db.select().from(schema.priceCache).all();
        for (const row of rows) {
            prices[row.symbol] = {
                symbol: row.symbol,
                priceUsd: row.priceUsd,
                change24h: row.change24h || 0,
                marketCap: row.marketCap || 0,
            };
        }
    } catch {
        // Table might not exist yet
    }

    return prices;
}
