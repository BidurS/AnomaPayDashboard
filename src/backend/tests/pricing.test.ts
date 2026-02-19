import { describe, it, expect, vi, beforeEach } from 'vitest';
import { fetchTokenMetadata } from '../services/pricing';

// Mock global fetch
// @ts-ignore
global.fetch = vi.fn();

describe('Pricing Service', () => {
    beforeEach(() => {
        vi.resetAllMocks();
    });

    it('should return known metadata for USDC', async () => {
        const USDC = '0x833589fcd6edb6e08f4c7c32d4f71b54bda02913';
        // No RPC call needed for known tokens
        const meta = await fetchTokenMetadata(USDC, 'https://dummy.rpc');
        expect(meta).toEqual({ symbol: 'USDC', decimals: 6 });
    });

    it('should return UNKNOWN for failed RPC calls', async () => {
        // Mock fetch failure
        // @ts-ignore
        (global.fetch as any).mockRejectedValue(new Error('RPC Error'));

        const meta = await fetchTokenMetadata('0x1234567890123456789012345678901234567890', 'https://dummy.rpc');
        expect(meta).toEqual({ symbol: 'UNKNOWN', decimals: 18 });
    });
});
