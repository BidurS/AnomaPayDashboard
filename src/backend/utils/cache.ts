/**
 * Caching Utility using Cloudflare Cache API
 */
export async function withCache(
    request: Request,
    ttlSeconds: number,
    handler: () => Promise<Response>
): Promise<Response> {
    const cacheUrl = new URL(request.url);
    // Cache key must be a Request object. We explicitly set the method to GET to be safe.
    const cacheKey = new Request(cacheUrl.toString(), {
        method: 'GET',
        headers: request.headers
    });

    // @ts-ignore - caches.default is a Cloudflare Worker global
    const cache = caches.default;

    // 1. Check Cache
    let response = await cache.match(cacheKey);
    if (response) {
        // Optional: Add a header to indicate cache hit for debugging
        const newResponse = new Response(response.body, response);
        newResponse.headers.set('X-Worker-Cache', 'HIT');
        return newResponse;
    }

    // 2. Cache Miss - Run Handler
    response = await handler();

    // 3. Cache the response if successful
    if (response.status === 200) {
        // Clone to put in cache (body can only be read once)
        const responseToCache = response.clone();

        // Cloudflare Cache API respects the Cache-Control header for TTL
        // We overwrite/set it to match our desired TTL
        responseToCache.headers.set('Cache-Control', `public, max-age=${ttlSeconds}`);

        // Put in cache (awaiting to ensure it saves before function exits)
        await cache.put(cacheKey, responseToCache);

        // Return original response with the same Cache-Control header for the client
        response.headers.set('Cache-Control', `public, max-age=${ttlSeconds}`);
        response.headers.set('X-Worker-Cache', 'MISS');
    }

    return response;
}
