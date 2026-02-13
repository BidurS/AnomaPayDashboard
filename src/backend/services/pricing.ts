import { decodeAbiParameters, parseAbiParameters } from 'viem';

// Map token contract address (lowercase) → Pyth feed ID
export const TOKEN_TO_PYTH_FEED: Record<string, string> = {
    '0x833589fcd6edb6e08f4c7c32d4f71b54bda02913': '0xeaa020c61cc479712813461ce153894a96a6c00b21ed0cfc2798d1f9a9e9c94a', // USDC
    '0x4200000000000000000000000000000000000006': '0xff61491a931112ddf1bd8147cd1b641375f79f5825126d665480874634fd0ace', // WETH
    '0x50c5725949a6f0c72e6c4a641f24049a917db0cb': '0xb0948a5e5313200c632b51bb5ca32f6de0d36e9950a942d19751e6f20f28b06', // DAI
    '0xd9aaec86b65d86f6a7b5b1b0c42ffa531710b6ca': '0xeaa020c61cc479712813461ce153894a96a6c00b21ed0cfc2798d1f9a9e9c94a', // USDbC
    '0x2ae3f1ec7f1f5012cfeab0185bfc7aa3cf0dec22': '0x15ecddd26d49e1eb8d7987b9fce317f030fa22fd19abbb1a1b4706fd67483e86', // cbETH
    '0x0555e30da8f98308edb960aa94c0db47230d2b9c': '0xe62df6c8b4a85fe1a67db44dc12de5db330f7ac66b72dc658afedf0f4a415b43', // WBTC
};

export const KNOWN_TOKEN_META: Record<string, { symbol: string; decimals: number }> = {
    '0x833589fcd6edb6e08f4c7c32d4f71b54bda02913': { symbol: 'USDC', decimals: 6 },
    '0x4200000000000000000000000000000000000006': { symbol: 'WETH', decimals: 18 },
    '0x50c5725949a6f0c72e6c4a641f24049a917db0cb': { symbol: 'DAI', decimals: 18 },
    '0xd9aaec86b65d86f6a7b5b1b0c42ffa531710b6ca': { symbol: 'USDbC', decimals: 6 },
    '0x2ae3f1ec7f1f5012cfeab0185bfc7aa3cf0dec22': { symbol: 'cbETH', decimals: 18 },
};

// In-memory price cache
const priceCache: Map<string, number> = new Map();
const metadataCache: Map<string, { symbol: string; decimals: number }> = new Map();

/**
 * Fetch real-time USD prices from Pyth Hermes API
 */
export async function fetchPythPrices(tokenAddresses: string[]): Promise<Map<string, number>> {
    const prices = new Map<string, number>();
    const feedsToFetch: { token: string; feedId: string }[] = [];

    for (const addr of tokenAddresses) {
        const cached = priceCache.get(addr);
        if (cached !== undefined) {
            prices.set(addr, cached);
            continue;
        }
        const feedId = TOKEN_TO_PYTH_FEED[addr];
        if (feedId) feedsToFetch.push({ token: addr, feedId });
        else prices.set(addr, 0);
    }

    if (feedsToFetch.length === 0) return prices;

    try {
        const idsParam = feedsToFetch.map(f => `ids[]=${f.feedId}`).join('&');
        const res = await fetch(`https://hermes.pyth.network/v2/updates/price/latest?${idsParam}`);
        if (!res.ok) throw new Error(`Pyth HTTP ${res.status}`);
        const data: any = await res.json();

        if (data.parsed) {
            for (const parsed of data.parsed) {
                const feedId = '0x' + parsed.id;
                const match = feedsToFetch.find(f => f.feedId === feedId);
                if (match) {
                    const price = Number(parsed.price.price) * Math.pow(10, parsed.price.expo);
                    prices.set(match.token, price);
                    priceCache.set(match.token, price);
                }
            }
        }
    } catch (e) {
        console.error('Pyth price fetch failed:', e);
        for (const f of feedsToFetch) {
            if (!prices.has(f.token)) prices.set(f.token, 0);
        }
    }
    return prices;
}

import { rpcRequest } from '../utils/rpc';

/**
 * Auto-detect token metadata from contract
 */
export async function fetchTokenMetadata(tokenAddress: string, rpcUrl: string): Promise<{ symbol: string; decimals: number }> {
    const cached = metadataCache.get(tokenAddress);
    if (cached) return cached;

    const known = KNOWN_TOKEN_META[tokenAddress];
    if (known) {
        metadataCache.set(tokenAddress, known);
        return known;
    }

    try {
        const symResult = await rpcRequest(rpcUrl, 'eth_call', [{ to: tokenAddress, data: '0x95d89b41' }, 'latest']);
        const decResult = await rpcRequest(rpcUrl, 'eth_call', [{ to: tokenAddress, data: '0x313ce567' }, 'latest']);

        let symbol = 'UNKNOWN';
        try {
            const decoded = decodeAbiParameters(parseAbiParameters('string'), symResult);
            if (decoded && decoded[0]) symbol = decoded[0] as string;
        } catch {
            if (symResult && symResult.length > 2) {
                const hex = symResult.replace(/0+$/, '').slice(2);
                if (hex.length > 0) {
                    const bytes = new Uint8Array(hex.length / 2);
                    for (let i = 0; i < hex.length; i += 2) bytes[i / 2] = parseInt(hex.substring(i, i + 2), 16);
                    symbol = new TextDecoder().decode(bytes).replace(/\0/g, '').trim() || 'UNKNOWN';
                }
            }
        }

        let decimals = 18;
        try {
            decimals = parseInt(decResult, 16);
            if (isNaN(decimals) || decimals > 77) decimals = 18;
        } catch { decimals = 18; }

        const meta = { symbol, decimals };
        metadataCache.set(tokenAddress, meta);
        return meta;
    } catch {
        const fallback = { symbol: 'UNKNOWN', decimals: 18 };
        metadataCache.set(tokenAddress, fallback);
        return fallback;
    }
}
