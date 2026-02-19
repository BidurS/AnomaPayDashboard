
import { fetch } from 'undici';

const ADDRESS = '0x9ed43c229480659bf6b6607c46d7b96c6d760cbb';
const BS_API_URL = 'https://base.blockscout.com/api/v2';
const RPC_URL = 'https://mainnet.base.org';

async function main() {
    console.log(`Investigating ${ADDRESS}...`);

    // 1. Check RPC Block Height
    try {
        const res = await fetch(RPC_URL, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ jsonrpc: '2.0', id: 1, method: 'eth_blockNumber', params: [] })
        });
        const data = await res.json();
        const rpcBlock = parseInt(data.result, 16);
        console.log(`[RPC] Current Block Height: ${rpcBlock}`);
    } catch (e) {
        console.error('[RPC] Failed:', e.message);
    }

    // 2. Check Blockscout Txs
    await checkEndpoint('Transactions', `${BS_API_URL}/addresses/${ADDRESS}/transactions?filter=to`);

    // 3. Check Blockscout Internal Txs
    await checkEndpoint('Internal Txs', `${BS_API_URL}/addresses/${ADDRESS}/internal-transactions`);

    // 4. Check Token Transfers
    await checkEndpoint('Token Transfers', `${BS_API_URL}/addresses/${ADDRESS}/token-transfers`);
}

async function checkEndpoint(label, url) {
    try {
        const res = await fetch(url);
        if (!res.ok) throw new Error(`${res.status} ${res.statusText}`);
        const data = await res.json();
        const items = data.items || [];
        console.log(`\n[Blockscout] ${label} (Latest 1):`);
        if (items.length === 0) {
            console.log('  None found.');
        } else {
            const tx = items[0];
            const hash = tx.hash || tx.transaction_hash;
            const block = tx.block_number || tx.blockNumber;
            const time = tx.timestamp;
            console.log(`  Hash: ${hash}`);
            console.log(`  Block: ${block}`);
            console.log(`  Time: ${time}`);
        }
    } catch (e) {
        console.error(`  Failed to fetch ${label}: ${e.message}`);
    }
}

main();
