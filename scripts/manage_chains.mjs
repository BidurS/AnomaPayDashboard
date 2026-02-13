
// Usage: node scripts/manage_chains.mjs [action] [options]
// Actions: list, add, remove
//
// Examples:
//   node scripts/manage_chains.mjs list
//   node scripts/manage_chains.mjs add --id 1 --name "Ethereum" --rpc "https://eth.llamarpc.com" --contract "0x..." --start 18000000
//

const API_URL = 'https://anomapay-explorer.bidurandblog.workers.dev/api/admin/chains';
const ADMIN_KEY = process.env.ADMIN_API_KEY || ''; // If you set a key via wrangler secret, put it here or use env var

// Helper to parse args
const args = process.argv.slice(2);
const action = args[0];

if (!action) {
    console.log(`
Usage:
  node scripts/manage_chains.mjs list
  node scripts/manage_chains.mjs add --id <CHAIN_ID> --name "<NAME>" --rpc "<URL>" --contract "<ADDRESS>" [--start <BLOCK>] [--explorer <URL>]
  node scripts/manage_chains.mjs remove --id <CHAIN_ID>
    `);
    process.exit(0);
}

// Native fetch (Node 18+)
async function request(method, body = null, suffix = '') {
    const options = {
        method,
        headers: {
            'Content-Type': 'application/json',
            'X-Admin-Key': ADMIN_KEY
        }
    };
    if (body) options.body = JSON.stringify(body);

    try {
        const res = await fetch(API_URL + suffix, options);
        if (method === 'GET') return await res.json();
        const text = await res.text();
        try { return JSON.parse(text); } catch { return { text }; }
    } catch (e) {
        console.error("API Error:", e.message);
        process.exit(1);
    }
}

async function main() {
    if (action === 'list') {
        console.log("Fetching chains...");
        const chains = await request('GET');
        console.table(chains);
    }
    else if (action === 'add') {
        const id = getArg('--id');
        const name = getArg('--name');
        const rpc_url = getArg('--rpc');
        const contract_address = getArg('--contract');
        const start_block = getArg('--start') || 0;
        const explorer_url = getArg('--explorer') || '';

        if (!id || !name || !rpc_url || !contract_address) {
            console.error("❌ Missing required fields: --id, --name, --rpc, --contract");
            process.exit(1);
        }

        console.log(`Adding Chain: ${name} (${id})...`);
        const res = await request('POST', {
            id: parseInt(id),
            name,
            rpc_url,
            contract_address,
            start_block: parseInt(start_block),
            explorer_url,
            is_enabled: 1
        });
        console.log("Response:", res);
    }
    else if (action === 'remove') {
        const id = getArg('--id');
        if (!id) {
            console.error("❌ Missing --id");
            process.exit(1);
        }
        console.log(`Removing Chain ID: ${id}...`);
        const res = await request('DELETE', null, `/${id}`);
        console.log("Response:", res);
    }
}

function getArg(flag) {
    const idx = args.indexOf(flag);
    return idx !== -1 ? args[idx + 1] : null;
}

main();
