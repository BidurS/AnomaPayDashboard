/**
 * Developer API Controller — Phase 3
 *
 * Endpoints for API key management and developer-facing docs data.
 */
// eslint-disable-next-line @typescript-eslint/no-explicit-any
type DB = import('drizzle-orm/d1').DrizzleD1Database<any>;
import {
    createApiKey,
    listApiKeys,
    revokeApiKey,
    getApiKeyUsageStats,
    authenticateRequest,
    checkRateLimit,
    trackUsage,
    type AuthResult,
} from '../middleware/apiKeyAuth';

// ─── Create API Key ──────────────────────────────────────

export async function handleCreateApiKey(db: DB, request: Request) {
    try {
        const body = await request.json() as { userId?: string; name?: string };
        const userId = body.userId?.trim();
        const name = body.name?.trim();

        if (!userId || !name) {
            return Response.json({ error: 'userId and name are required' }, { status: 400 });
        }

        // Check existing keys for this user (max 5 for free tier)
        const existing = await listApiKeys(db, userId);
        if (existing.length >= 5) {
            return Response.json({ error: 'Maximum 5 API keys per user' }, { status: 429 });
        }

        const { key, keyHash } = await createApiKey(db, userId, name);

        return Response.json({
            success: true,
            data: {
                key,                // Only shown once — user must save it
                keyHashPrefix: keyHash.slice(0, 8) + '...',
                name,
                tier: 'free',
                rateLimit: 100,
                dailyLimit: 10000,
            },
        });
    } catch (e: any) {
        return Response.json({ error: e.message || 'Failed to create key' }, { status: 500 });
    }
}

// ─── List API Keys ───────────────────────────────────────

export async function handleListApiKeys(db: DB, request: Request) {
    const url = new URL(request.url);
    const userId = url.searchParams.get('userId');

    if (!userId) {
        return Response.json({ error: 'userId query parameter required' }, { status: 400 });
    }

    const keys = await listApiKeys(db, userId);

    return Response.json({
        success: true,
        data: keys.map(k => ({
            keyHashPrefix: k.keyHash.slice(0, 8) + '...',
            keyHash: k.keyHash,
            name: k.name,
            tier: k.tier,
            rateLimit: k.rateLimit,
            dailyLimit: k.dailyLimit,
            createdAt: k.createdAt,
            lastUsed: k.lastUsed,
            isActive: k.isActive,
        })),
    });
}

// ─── Revoke API Key ──────────────────────────────────────

export async function handleRevokeApiKey(db: DB, request: Request) {
    try {
        const body = await request.json() as { keyHash?: string; userId?: string };
        const { keyHash, userId } = body;

        if (!keyHash || !userId) {
            return Response.json({ error: 'keyHash and userId are required' }, { status: 400 });
        }

        const revoked = await revokeApiKey(db, keyHash, userId);

        return Response.json({ success: revoked, message: revoked ? 'Key revoked' : 'Key not found or already revoked' });
    } catch (e: any) {
        return Response.json({ error: e.message || 'Failed to revoke key' }, { status: 500 });
    }
}

// ─── API Key Usage Stats ─────────────────────────────────

export async function handleApiKeyUsage(db: DB, request: Request) {
    const url = new URL(request.url);
    const keyHash = url.searchParams.get('keyHash');
    const days = parseInt(url.searchParams.get('days') || '7');

    if (!keyHash) {
        return Response.json({ error: 'keyHash query parameter required' }, { status: 400 });
    }

    const stats = await getApiKeyUsageStats(db, keyHash, days);

    return Response.json({ success: true, data: stats });
}

// ─── API Catalog (for docs page) ─────────────────────────

export function handleApiCatalog() {
    const catalog = {
        baseUrl: 'https://anomapay-explorer.bidurandblog.workers.dev/api/v3',
        authentication: {
            method: 'API Key',
            header: 'X-API-Key',
            queryParam: 'api_key',
            description: 'Include your API key in the X-API-Key header or as an api_key query parameter.',
        },
        tiers: [
            { name: 'Anonymous', rpm: 30, daily: 1000, price: 'Free' },
            { name: 'Free', rpm: 100, daily: 10000, price: 'Free (with key)' },
            { name: 'Pro', rpm: 500, daily: 100000, price: '$29/mo' },
            { name: 'Enterprise', rpm: 2000, daily: 1000000, price: 'Contact us' },
        ],
        categories: [
            {
                name: 'Intents',
                description: 'Query and explore intent data across all supported chains',
                endpoints: [
                    {
                        method: 'GET',
                        path: '/intents',
                        description: 'List intents with pagination and filtering',
                        params: [
                            { name: 'chainId', type: 'number', required: true, description: 'Target chain ID (1, 10, 8453, 42161)' },
                            { name: 'page', type: 'number', required: false, description: 'Page number (default: 1)' },
                            { name: 'limit', type: 'number', required: false, description: 'Results per page (default: 25, max: 100)' },
                            { name: 'status', type: 'string', required: false, description: 'Filter: pending, matched, settling, settled, failed' },
                            { name: 'type', type: 'string', required: false, description: 'Filter: swap, bridge, transfer, resource, discovery' },
                            { name: 'solver', type: 'string', required: false, description: 'Filter by solver address' },
                        ],
                        response: '{ data: Intent[], pagination: { page, limit, total, totalPages } }',
                    },
                    {
                        method: 'GET',
                        path: '/intents/:id',
                        description: 'Get full intent detail including lifecycle, payloads, and token transfers',
                        params: [
                            { name: 'id', type: 'string', required: true, description: 'Intent ID' },
                            { name: 'chainId', type: 'number', required: true, description: 'Chain ID' },
                        ],
                        response: '{ id, txHash, status, intentType, lifecycle[], tokenTransfers[], payloads[], ... }',
                    },
                    {
                        method: 'GET',
                        path: '/intents/:id/simulation',
                        description: 'Get AI simulation results and annotations for an intent',
                        params: [{ name: 'id', type: 'string', required: true, description: 'Intent ID' }],
                        response: '{ simulations: SimulationResult[], annotations: IntentAnnotation[] }',
                    },
                    {
                        method: 'POST',
                        path: '/intents/simulate',
                        description: 'Simulate a hypothetical intent with AI-powered route analysis',
                        body: '{ inputToken, outputToken, amount, chainId, maxSlippage? }',
                        response: '{ routeType, predictedOutput, slippage, riskScore, routeSteps[], ... }',
                    },
                ],
            },
            {
                name: 'Solvers',
                description: 'Solver analytics, rankings, and performance data',
                endpoints: [
                    {
                        method: 'GET',
                        path: '/solvers',
                        description: 'Solver leaderboard with rankings',
                        params: [{ name: 'chainId', type: 'number', required: true, description: 'Chain ID' }],
                        response: '{ data: Solver[] }',
                    },
                    {
                        method: 'GET',
                        path: '/solvers/:address',
                        description: 'Detailed solver profile with economics',
                        params: [
                            { name: 'address', type: 'string', required: true, description: 'Solver address' },
                            { name: 'chainId', type: 'number', required: true, description: 'Chain ID' },
                        ],
                        response: '{ solver, economics, recentActivity[] }',
                    },
                ],
            },
            {
                name: 'Analytics',
                description: 'Network-wide analytics and metrics',
                endpoints: [
                    {
                        method: 'GET',
                        path: '/analytics/volume',
                        description: 'Volume metrics over time',
                        params: [
                            { name: 'chainId', type: 'number', required: true, description: 'Chain ID' },
                            { name: 'period', type: 'string', required: false, description: '1h, 24h, 7d, 30d' },
                        ],
                        response: '{ totalVolume, intentCount, avgValue, timeSeries[] }',
                    },
                    {
                        method: 'GET',
                        path: '/analytics/cross-chain-flows',
                        description: 'Cross-chain value flow data for Sankey visualization',
                        params: [{ name: 'days', type: 'number', required: false, description: 'Lookback period (default: 30)' }],
                        response: '{ flows: { source, target, value, count }[], chains: {} }',
                    },
                    {
                        method: 'GET',
                        path: '/analytics/ai-insights',
                        description: 'Aggregated AI prediction accuracy and insights',
                        params: [{ name: 'chainId', type: 'number', required: true, description: 'Chain ID' }],
                        response: '{ accuracy: {}, routeTypes: [], recentAnnotations: [] }',
                    },
                    {
                        method: 'GET',
                        path: '/analytics/intent-types',
                        description: 'Distribution of intent types',
                        params: [{ name: 'chainId', type: 'number', required: true, description: 'Chain ID' }],
                        response: '{ type, count, volume }[]',
                    },
                ],
            },
            {
                name: 'Developer',
                description: 'API key management and usage analytics',
                endpoints: [
                    {
                        method: 'POST',
                        path: '/developer/keys',
                        description: 'Create a new API key',
                        body: '{ userId: string, name: string }',
                        response: '{ key: string, tier: string, rateLimit: number }',
                    },
                    {
                        method: 'GET',
                        path: '/developer/keys',
                        description: 'List your API keys',
                        params: [{ name: 'userId', type: 'string', required: true, description: 'User ID' }],
                        response: '{ data: ApiKey[] }',
                    },
                    {
                        method: 'POST',
                        path: '/developer/keys/revoke',
                        description: 'Revoke an API key',
                        body: '{ keyHash: string, userId: string }',
                        response: '{ success: boolean }',
                    },
                    {
                        method: 'GET',
                        path: '/developer/keys/usage',
                        description: 'Get usage statistics for a key',
                        params: [
                            { name: 'keyHash', type: 'string', required: true, description: 'Key hash' },
                            { name: 'days', type: 'number', required: false, description: 'Lookback period (default: 7)' },
                        ],
                        response: '{ totalRequests, byEndpoint: [] }',
                    },
                ],
            },
        ],
    };

    return Response.json({ success: true, data: catalog });
}

// ─── Middleware wrapper ──────────────────────────────────

export async function withApiAuth(
    db: DB,
    request: Request,
    handler: (auth: AuthResult) => Promise<Response>,
): Promise<Response> {
    const start = Date.now();
    const auth = await authenticateRequest(db, request);
    const rateCheck = await checkRateLimit(db, auth);

    if (!rateCheck.allowed) {
        return Response.json(
            { error: 'Rate limit exceeded', retryAfter: rateCheck.resetAt },
            {
                status: 429,
                headers: {
                    'X-RateLimit-Remaining': '0',
                    'X-RateLimit-Reset': String(rateCheck.resetAt),
                    'Retry-After': String(rateCheck.resetAt - Math.floor(Date.now() / 1000)),
                },
            },
        );
    }

    const response = await handler(auth);
    const elapsed = Date.now() - start;

    // Track usage (non-blocking)
    const endpoint = new URL(request.url).pathname;
    trackUsage(db, auth, endpoint, elapsed);

    // Add rate limit headers
    const headers = new Headers(response.headers);
    headers.set('X-RateLimit-Remaining', String(rateCheck.remaining));
    headers.set('X-RateLimit-Reset', String(rateCheck.resetAt));
    headers.set('X-API-Tier', auth.tier);

    return new Response(response.body, {
        status: response.status,
        headers,
    });
}
