/**
 * API Key Middleware — Phase 3 Developer Portal
 *
 * Handles API key authentication, rate limiting, and usage tracking.
 * All /api/v3/ routes go through this middleware. Requests without a key
 * are treated as "anonymous" with strict limits.
 */
import type { DrizzleD1Database } from 'drizzle-orm/d1';
import { eq, and, gte, sql } from 'drizzle-orm';
import { apiKeys, apiUsage } from '../db/schema';

// eslint-disable-next-line @typescript-eslint/no-explicit-any
type DB = DrizzleD1Database<any>;

// ─── Tier Limits ─────────────────────────────────────────

const TIER_LIMITS = {
    anonymous: { rpm: 30, daily: 1000 },
    free: { rpm: 100, daily: 10000 },
    pro: { rpm: 500, daily: 100000 },
    enterprise: { rpm: 2000, daily: 1000000 },
} as const;

type Tier = keyof typeof TIER_LIMITS;

// ─── Key Hashing ─────────────────────────────────────────

async function hashKey(key: string): Promise<string> {
    const encoder = new TextEncoder();
    const data = encoder.encode(key);
    const hashBuffer = await crypto.subtle.digest('SHA-256', data);
    const hashArray = Array.from(new Uint8Array(hashBuffer));
    return hashArray.map(b => b.toString(16).padStart(2, '0')).join('');
}

// ─── Key Generation ──────────────────────────────────────

export function generateApiKey(): string {
    const bytes = new Uint8Array(24);
    crypto.getRandomValues(bytes);
    const key = Array.from(bytes).map(b => b.toString(16).padStart(2, '0')).join('');
    return `ask_${key}`;
}

// ─── Validation Result ───────────────────────────────────

export interface AuthResult {
    authenticated: boolean;
    keyHash: string | null;
    tier: Tier;
    userId: string | null;
    limits: { rpm: number; daily: number };
}

// ─── Authenticate ────────────────────────────────────────

export async function authenticateRequest(
    db: DB,
    request: Request,
): Promise<AuthResult> {
    const apiKey = request.headers.get('X-API-Key') || new URL(request.url).searchParams.get('api_key');

    if (!apiKey) {
        return {
            authenticated: false,
            keyHash: null,
            tier: 'anonymous',
            userId: null,
            limits: TIER_LIMITS.anonymous,
        };
    }

    const keyHash = await hashKey(apiKey);

    const keyRecord = await db
        .select()
        .from(apiKeys)
        .where(and(eq(apiKeys.keyHash, keyHash), eq(apiKeys.isActive, 1)))
        .limit(1);

    if (keyRecord.length === 0) {
        return {
            authenticated: false,
            keyHash: null,
            tier: 'anonymous',
            userId: null,
            limits: TIER_LIMITS.anonymous,
        };
    }

    const key = keyRecord[0];
    const tier = (key.tier as Tier) || 'free';

    // Update last_used
    await db.update(apiKeys).set({ lastUsed: Math.floor(Date.now() / 1000) }).where(eq(apiKeys.keyHash, keyHash));

    return {
        authenticated: true,
        keyHash,
        tier,
        userId: key.userId,
        limits: TIER_LIMITS[tier] || TIER_LIMITS.free,
    };
}

// ─── Rate Limit Check ────────────────────────────────────

export async function checkRateLimit(
    db: DB,
    auth: AuthResult,
): Promise<{ allowed: boolean; remaining: number; resetAt: number }> {
    const now = Math.floor(Date.now() / 1000);
    const minuteAgo = now - 60;
    const dayStart = now - (now % 86400);

    const identifier = auth.keyHash || 'anonymous';

    // Count requests in last minute
    const [minuteCount] = await db
        .select({ count: sql<number>`COUNT(*)` })
        .from(apiUsage)
        .where(and(eq(apiUsage.keyHash, identifier), gte(apiUsage.timestamp, minuteAgo)));

    const currentMinuteCount = minuteCount?.count || 0;

    // Count requests today
    const [dailyCount] = await db
        .select({ count: sql<number>`COUNT(*)` })
        .from(apiUsage)
        .where(and(eq(apiUsage.keyHash, identifier), gte(apiUsage.timestamp, dayStart)));

    const currentDailyCount = dailyCount?.count || 0;

    if (currentMinuteCount >= auth.limits.rpm) {
        return { allowed: false, remaining: 0, resetAt: minuteAgo + 60 };
    }

    if (currentDailyCount >= auth.limits.daily) {
        return { allowed: false, remaining: 0, resetAt: dayStart + 86400 };
    }

    return {
        allowed: true,
        remaining: Math.min(auth.limits.rpm - currentMinuteCount, auth.limits.daily - currentDailyCount),
        resetAt: minuteAgo + 60,
    };
}

// ─── Track Usage ─────────────────────────────────────────

export async function trackUsage(
    db: DB,
    auth: AuthResult,
    endpoint: string,
    responseTimeMs: number,
): Promise<void> {
    try {
        await db.insert(apiUsage).values({
            keyHash: auth.keyHash || 'anonymous',
            endpoint,
            responseTimeMs,
            timestamp: Math.floor(Date.now() / 1000),
        });
    } catch (_e) {
        // Non-blocking — dont fail requests over usage tracking
    }
}

// ─── API Key Management ──────────────────────────────────

export async function createApiKey(
    db: DB,
    userId: string,
    name: string,
    tier: Tier = 'free',
): Promise<{ key: string; keyHash: string }> {
    const key = generateApiKey();
    const keyHash = await hashKey(key);
    const limits = TIER_LIMITS[tier];

    await db.insert(apiKeys).values({
        keyHash,
        userId,
        name,
        tier,
        rateLimit: limits.rpm,
        dailyLimit: limits.daily,
        createdAt: Math.floor(Date.now() / 1000),
        isActive: 1,
    });

    return { key, keyHash };
}

export async function listApiKeys(db: DB, userId: string) {
    return db
        .select({
            keyHash: apiKeys.keyHash,
            name: apiKeys.name,
            tier: apiKeys.tier,
            rateLimit: apiKeys.rateLimit,
            dailyLimit: apiKeys.dailyLimit,
            createdAt: apiKeys.createdAt,
            lastUsed: apiKeys.lastUsed,
            isActive: apiKeys.isActive,
        })
        .from(apiKeys)
        .where(eq(apiKeys.userId, userId));
}

export async function revokeApiKey(db: DB, keyHash: string, userId: string): Promise<boolean> {
    const result = await db
        .update(apiKeys)
        .set({ isActive: 0 })
        .where(and(eq(apiKeys.keyHash, keyHash), eq(apiKeys.userId, userId)));
    return (result as any).rowsAffected > 0;
}

export async function getApiKeyUsageStats(db: DB, keyHash: string, days: number = 7) {
    const since = Math.floor(Date.now() / 1000) - days * 86400;

    const stats = await db
        .select({
            endpoint: apiUsage.endpoint,
            count: sql<number>`COUNT(*)`,
            avgResponseMs: sql<number>`AVG(response_time_ms)`,
        })
        .from(apiUsage)
        .where(and(eq(apiUsage.keyHash, keyHash), gte(apiUsage.timestamp, since)))
        .groupBy(apiUsage.endpoint);

    const [total] = await db
        .select({ count: sql<number>`COUNT(*)` })
        .from(apiUsage)
        .where(and(eq(apiUsage.keyHash, keyHash), gte(apiUsage.timestamp, since)));

    return {
        totalRequests: total?.count || 0,
        byEndpoint: stats,
        periodDays: days,
    };
}
