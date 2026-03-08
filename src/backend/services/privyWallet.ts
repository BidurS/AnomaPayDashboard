/**
 * Privy Wallet Service — Server-side wallet provisioning
 *
 * Creates and manages Ethereum wallets via Privy's server API.
 * Used by the Agent Controller to provision wallets during agent registration.
 *
 * Authentication: Basic Auth with PRIVY_APP_ID:PRIVY_APP_SECRET
 * API Docs: https://docs.privy.io/reference/server-wallets
 */

const PRIVY_API_URL = 'https://api.privy.io/v1';

export interface PrivyWalletResponse {
    id: string;
    address: string;
    chain_type: string;
    created_at: number;
}

export interface PrivyConfig {
    appId: string;
    appSecret: string;
}

/**
 * Create a new Ethereum wallet via Privy Server API.
 * Returns the wallet address and Privy wallet ID.
 */
export async function createPrivyWallet(config: PrivyConfig): Promise<{
    walletId: string;
    address: string;
}> {
    const authHeader = btoa(`${config.appId}:${config.appSecret}`);
    const idempotencyKey = crypto.randomUUID();

    const response = await fetch(`${PRIVY_API_URL}/wallets`, {
        method: 'POST',
        headers: {
            'Content-Type': 'application/json',
            'Authorization': `Basic ${authHeader}`,
            'privy-app-id': config.appId,
            'privy-idempotency-key': idempotencyKey,
        },
        body: JSON.stringify({
            chain_type: 'ethereum',
        }),
    });

    if (!response.ok) {
        const errorBody = await response.text();
        throw new Error(`Privy wallet creation failed (${response.status}): ${errorBody}`);
    }

    const data = await response.json() as PrivyWalletResponse;

    return {
        walletId: data.id,
        address: data.address,
    };
}

/**
 * Check if Privy credentials are configured.
 * Falls back to deterministic placeholder if not available.
 */
export function isPrivyConfigured(env: { PRIVY_APP_ID?: string; PRIVY_APP_SECRET?: string }): boolean {
    return !!(env.PRIVY_APP_ID && env.PRIVY_APP_SECRET);
}

/**
 * Get Privy config from environment, or null if not configured.
 */
export function getPrivyConfig(env: { PRIVY_APP_ID?: string; PRIVY_APP_SECRET?: string }): PrivyConfig | null {
    if (!env.PRIVY_APP_ID || !env.PRIVY_APP_SECRET) return null;
    return {
        appId: env.PRIVY_APP_ID,
        appSecret: env.PRIVY_APP_SECRET,
    };
}
