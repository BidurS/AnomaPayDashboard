import fetch from 'node-fetch';

const WORKER_URL = 'https://anomapay-explorer.bidurandblog.workers.dev';
const ADMIN_KEY = '12e259c33033199b7b5136364976862cdbb6cd2fc8d03ded1bc0816de01f8ab1';
const CONTRACT_ADDRESS = '0x9ed43c229480659bf6b6607c46d7b96c6d760cbb';
const CHAIN_ID = 8453;

// ── All 8 Event Topic Signatures (keccak256 of ABI) ──
const TOPICS = {
    TRANSACTION_EXECUTED: '0x10dd528db2c49add6545679b976df90d24c035d6a75b17f41b700e8c18ca5364',
    COMMITMENT_ROOT_ADDED: '0x0a2dc548ed950accb40d5d78541f3954c5e182a8ecf19e581a4f2263f61f59d2',
    ACTION_EXECUTED: '0x1cc9a0755dd734c1ebfe98b68ece200037e363eb366d0dee04e420e2f23cc010',
    DISCOVERY_PAYLOAD: '0x48243873b4752ddcb45e0d7b11c4c266583e5e099a0b798fdd9c1af7d49324f3',
    RESOURCE_PAYLOAD: '0x3a134d01c07803003c63301717ddc4612e6c47ae408eeea3222cded532d02ae6',
    EXTERNAL_PAYLOAD: '0x9c61b290f631097f3de0d62c085b4a82c2d3c45b6bebe100a25cbbb577966a34',
    APPLICATION_PAYLOAD: '0xa494dac4b71848437d4a5b21432e8a9de4e31d7d76dbb96e38e3a20c87c34e9e',
    FORWARDER_CALL_EXECUTED: '0xcddb327adb31fe5437df2a8c68301bb13a6baae432a804838caaf682506aadf1',
};

const TOPIC_TO_TYPE = {};
TOPIC_TO_TYPE[TOPICS.TRANSACTION_EXECUTED] = 'TransactionExecuted';
TOPIC_TO_TYPE[TOPICS.COMMITMENT_ROOT_ADDED] = 'CommitmentTreeRootAdded';
TOPIC_TO_TYPE[TOPICS.ACTION_EXECUTED] = 'ActionExecuted';
TOPIC_TO_TYPE[TOPICS.DISCOVERY_PAYLOAD] = 'DiscoveryPayload';
TOPIC_TO_TYPE[TOPICS.RESOURCE_PAYLOAD] = 'ResourcePayload';
TOPIC_TO_TYPE[TOPICS.EXTERNAL_PAYLOAD] = 'ExternalPayload';
TOPIC_TO_TYPE[TOPICS.APPLICATION_PAYLOAD] = 'ApplicationPayload';
TOPIC_TO_TYPE[TOPICS.FORWARDER_CALL_EXECUTED] = 'ForwarderCallExecuted';

// Well-known tokens on Base
const KNOWN_TOKENS = {
    '0x833589fcd6edb6e08f4c7c32d4f71b54bda02913': { symbol: 'USDC', decimals: 6, priceUsd: 1.0 },
    '0x4200000000000000000000000000000000000006': { symbol: 'WETH', decimals: 18, priceUsd: 2600 },
    '0x50c5725949a6f0c72e6c4a641f24049a917db0cb': { symbol: 'DAI', decimals: 18, priceUsd: 1.0 },
    '0xd9aaec86b65d86f6a7b5b1b0c42ffa531710b6ca': { symbol: 'USDbC', decimals: 6, priceUsd: 1.0 },
};

// ══════════════════════════════════════════════════════════════
//  PHASE 1: Fetch ALL transactions (metadata + gas + solver)
// ══════════════════════════════════════════════════════════════
async function fetchAllTransactions() {
    console.log('📡 PHASE 1: Fetching all transactions...');
    const txMap = new Map(); // tx_hash -> tx data
    let nextPageParams = null;
    let page = 0;

    while (true) {
        let url = `https://base.blockscout.com/api/v2/addresses/${CONTRACT_ADDRESS}/transactions?filter=to`;
        if (nextPageParams) {
            url += `&${new URLSearchParams(nextPageParams).toString()}`;
        }

        try {
            const res = await fetch(url);
            if (!res.ok) throw new Error(`HTTP ${res.status}`);
            const data = await res.json();

            if (!data.items || data.items.length === 0) break;

            for (const tx of data.items) {
                txMap.set(tx.hash.toLowerCase(), {
                    chain_id: CHAIN_ID,
                    tx_hash: tx.hash,
                    block_number: tx.block_number,
                    event_type: 'TransactionExecuted',
                    solver_address: tx.from?.hash || '0x0',
                    value_wei: tx.value || '0',
                    gas_used: parseInt(tx.gas_used || '0'),
                    gas_price_wei: tx.gas_price || '0',
                    data_json: JSON.stringify(tx.decoded_input || {}),
                    decoded_input: tx.decoded_input,
                    timestamp: Math.floor(new Date(tx.timestamp).getTime() / 1000)
                });
            }

            page++;
            console.log(`   Transactions: ${txMap.size} (page ${page})`);

            nextPageParams = data.next_page_params;
            if (!nextPageParams) break;
            await new Promise(r => setTimeout(r, 200));
        } catch (e) {
            console.error('   Error:', e.message);
            await new Promise(r => setTimeout(r, 2000));
        }
    }

    console.log(`   ✅ Total transactions: ${txMap.size}`);
    return txMap;
}

// ══════════════════════════════════════════════════════════════
//  PHASE 2: Fetch ALL event logs (all 8 event types)
// ══════════════════════════════════════════════════════════════
async function fetchAllLogs() {
    console.log('📡 PHASE 2: Fetching all event logs...');
    const allLogs = [];
    let nextPageParams = null;
    let page = 0;

    while (true) {
        let url = `https://base.blockscout.com/api/v2/addresses/${CONTRACT_ADDRESS}/logs`;
        if (nextPageParams) {
            url += `?${new URLSearchParams(nextPageParams).toString()}`;
        }

        try {
            const res = await fetch(url);
            if (!res.ok) throw new Error(`HTTP ${res.status}`);
            const data = await res.json();

            if (!data.items || data.items.length === 0) break;

            allLogs.push(...data.items);
            page++;
            console.log(`   Logs: ${allLogs.length} (page ${page})`);

            nextPageParams = data.next_page_params;
            if (!nextPageParams) break;
            await new Promise(r => setTimeout(r, 200));
        } catch (e) {
            console.error('   Error:', e.message);
            await new Promise(r => setTimeout(r, 2000));
        }
    }

    console.log(`   ✅ Total logs: ${allLogs.length}`);
    return allLogs;
}

// ══════════════════════════════════════════════════════════════
//  PHASE 2.5: Fetch token transfers for each transaction
// ══════════════════════════════════════════════════════════════
async function fetchTokenTransfers(txMap) {
    console.log('💰 PHASE 2.5: Fetching token transfers per transaction...');
    const allTransfers = [];
    const txHashes = Array.from(txMap.keys());
    let processed = 0;
    let totalFound = 0;

    for (const txHash of txHashes) {
        const txData = txMap.get(txHash);
        try {
            const res = await fetch(
                `https://base.blockscout.com/api/v2/transactions/${txData.tx_hash}/token-transfers`,
                { headers: { 'User-Agent': 'Gnoma-Indexer/3.0' } }
            );
            if (!res.ok) {
                processed++;
                continue;
            }
            const data = await res.json();

            if (data.items && data.items.length > 0) {
                for (const transfer of data.items) {
                    const tokenAddr = transfer.token?.address?.toLowerCase() || '';
                    const knownToken = KNOWN_TOKENS[tokenAddr];
                    const decimals = knownToken?.decimals || parseInt(transfer.token?.decimals || '18');
                    const symbol = knownToken?.symbol || transfer.token?.symbol || 'UNKNOWN';
                    const priceUsd = knownToken?.priceUsd || 0;

                    const amountRaw = transfer.total?.value || '0';
                    const amountDisplay = parseFloat(amountRaw) / Math.pow(10, decimals);
                    const amountUsd = amountDisplay * priceUsd;

                    allTransfers.push({
                        chain_id: CHAIN_ID,
                        tx_hash: txData.tx_hash,
                        block_number: txData.block_number,
                        token_address: tokenAddr,
                        token_symbol: symbol,
                        token_decimals: decimals,
                        from_address: (transfer.from?.hash || '').toLowerCase(),
                        to_address: (transfer.to?.hash || '').toLowerCase(),
                        amount_raw: amountRaw,
                        amount_display: amountDisplay,
                        amount_usd: amountUsd,
                        timestamp: txData.timestamp
                    });
                    totalFound++;
                }
            }

            processed++;
            if (processed % 50 === 0) {
                console.log(`   Checked ${processed}/${txHashes.length} txs, found ${totalFound} token transfers`);
            }

            // Rate limit: ~5 req/sec
            await new Promise(r => setTimeout(r, 200));
        } catch (e) {
            processed++;
            // Silently continue on network errors for individual txs
        }
    }

    console.log(`   ✅ Token transfers found: ${allTransfers.length} across ${txHashes.length} transactions`);
    return allTransfers;
}

// ══════════════════════════════════════════════════════════════
//  PHASE 3: Process logs into rich data structures
// ══════════════════════════════════════════════════════════════
function processLogs(logs, txMap) {
    console.log('🔬 PHASE 3: Processing event logs...');

    const payloads = [];
    const privacyStats = [];
    const actionCounts = new Map(); // tx_hash -> actionTagCount

    // Counters for all 8 event types
    const counts = {
        TransactionExecuted: 0, CommitmentTreeRootAdded: 0, ActionExecuted: 0,
        DiscoveryPayload: 0, ResourcePayload: 0, ExternalPayload: 0,
        ApplicationPayload: 0, ForwarderCallExecuted: 0, Unknown: 0
    };

    for (const log of logs) {
        const topicHash = log.topics?.[0];
        const eventType = TOPIC_TO_TYPE[topicHash];
        const txHash = log.transaction_hash;
        const blockNumber = log.block_number;

        // Get timestamp from txMap
        const txData = txMap.get(txHash?.toLowerCase());
        const timestamp = txData?.timestamp || Math.floor(Date.now() / 1000);

        if (!eventType) {
            counts.Unknown++;
            continue;
        }

        counts[eventType]++;

        switch (eventType) {
            case 'ResourcePayload':
            case 'DiscoveryPayload':
            case 'ExternalPayload':
            case 'ApplicationPayload': {
                const tag = log.topics?.[1] || log.decoded?.parameters?.[0]?.value || '';
                const index = log.decoded?.parameters?.[1]?.value ?? 0;
                const blob = log.decoded?.parameters?.[2]?.value || log.data || '';
                const typeMap = {
                    'ResourcePayload': 'Resource',
                    'DiscoveryPayload': 'Discovery',
                    'ExternalPayload': 'External',
                    'ApplicationPayload': 'Application'
                };
                payloads.push({
                    chain_id: CHAIN_ID,
                    tx_hash: txHash,
                    block_number: blockNumber,
                    payload_type: typeMap[eventType],
                    payload_index: parseInt(index),
                    blob: blob.substring(0, 500), // Truncate large blobs
                    timestamp
                });
                break;
            }
            case 'CommitmentTreeRootAdded': {
                const root = log.decoded?.parameters?.[0]?.value || log.data?.substring(0, 66) || '';
                privacyStats.push({
                    chain_id: CHAIN_ID,
                    block_number: blockNumber,
                    root_hash: root,
                    timestamp,
                    estimated_pool_size: 0 // assigned after sorting
                });
                break;
            }
            case 'ActionExecuted': {
                const tagCount = parseInt(log.decoded?.parameters?.[1]?.value || '0');
                actionCounts.set(txHash?.toLowerCase(), tagCount);
                break;
            }
            case 'ForwarderCallExecuted': {
                // The forwarder address (1st topic, indexed) is the token contract
                const forwarderAddress = log.topics?.[1]
                    ? '0x' + log.topics[1].substring(26).toLowerCase()
                    : '';
                // Enrich tx data with forwarder info
                if (txData) {
                    const existing = JSON.parse(txData.data_json || '{}');
                    existing.forwarderCalls = existing.forwarderCalls || [];
                    existing.forwarderCalls.push(forwarderAddress);
                    txData.data_json = JSON.stringify(existing);
                }
                break;
            }
            case 'TransactionExecuted': {
                // Tags and logicRefs — enrich the events table
                const tags = log.decoded?.parameters?.[0]?.value || [];
                const logicRefs = log.decoded?.parameters?.[1]?.value || [];
                if (txData) {
                    txData.data_json = JSON.stringify({
                        ...JSON.parse(txData.data_json || '{}'),
                        tags,
                        logicRefs,
                        actionTagCount: actionCounts.get(txHash?.toLowerCase()) || 0
                    });
                }
                break;
            }
        }
    }

    // Sort privacy stats by block number (ascending = oldest first)
    // and assign pool sizes 1 → N so chart shows growth
    privacyStats.sort((a, b) => a.block_number - b.block_number);
    privacyStats.forEach((p, i) => { p.estimated_pool_size = i + 1; });

    console.log('   Event breakdown:');
    for (const [k, v] of Object.entries(counts)) {
        if (v > 0) console.log(`     ${k}: ${v}`);
    }

    return { payloads, privacyStats };
}

// ══════════════════════════════════════════════════════════════
//  PHASE 4: Compute aggregated analytics
// ══════════════════════════════════════════════════════════════
function computeAnalytics(txMap, payloads, tokenTransfers) {
    console.log('📊 PHASE 4: Computing analytics...');

    // === Solvers ===
    const solverMap = new Map();
    for (const tx of txMap.values()) {
        const addr = tx.solver_address?.toLowerCase();
        if (!addr || addr === '0x0') continue;
        if (!solverMap.has(addr)) {
            solverMap.set(addr, { chain_id: CHAIN_ID, address: addr, count: 0, gas: '0', val: '0', timestamp: tx.timestamp });
        }
        const s = solverMap.get(addr);
        s.count++;
        s.gas = (BigInt(s.gas) + BigInt(tx.gas_used || 0)).toString();
        s.val = (BigInt(s.val) + BigInt(tx.value_wei || '0')).toString();
        s.timestamp = Math.max(s.timestamp, tx.timestamp);
    }
    const solvers = Array.from(solverMap.values());
    console.log(`   Unique solvers: ${solvers.length}`);

    // === Daily Stats (with token transfer volume) ===
    const dailyMap = new Map();

    // First, aggregate from transactions
    for (const tx of txMap.values()) {
        const date = new Date(tx.timestamp * 1000).toISOString().split('T')[0];
        if (!dailyMap.has(date)) {
            dailyMap.set(date, {
                chain_id: CHAIN_ID, date, count: 0, volume: 0, gas: 0,
                solvers: new Set()
            });
        }
        const d = dailyMap.get(date);
        d.count++;
        d.gas += tx.gas_used || 0;
        d.solvers.add(tx.solver_address?.toLowerCase());
    }

    // Then, add token transfer USD volume per day
    for (const t of tokenTransfers) {
        const date = new Date(t.timestamp * 1000).toISOString().split('T')[0];
        if (dailyMap.has(date)) {
            dailyMap.get(date).volume += t.amount_usd || 0;
        }
    }

    const daily_stats = Array.from(dailyMap.values()).map(d => ({
        chain_id: d.chain_id,
        date: d.date,
        count: d.count,
        volume: Math.round(d.volume * 100) / 100, // Round to cents
        unique_solvers: d.solvers.size,
        gas: d.gas
    }));
    console.log(`   Daily stats entries: ${daily_stats.length}`);

    // === Asset summary ===
    const assetMap = new Map();
    for (const t of tokenTransfers) {
        if (!assetMap.has(t.token_address)) {
            assetMap.set(t.token_address, {
                chain_id: CHAIN_ID,
                token_address: t.token_address,
                token_symbol: t.token_symbol,
                flow_in: 0n,
                flow_out: 0n,
                tx_count: 0
            });
        }
        const a = assetMap.get(t.token_address);
        a.tx_count++;
        // Inflow = to the contract, outflow = from the contract
        if (t.to_address === CONTRACT_ADDRESS.toLowerCase()) {
            a.flow_in += BigInt(t.amount_raw);
        } else if (t.from_address === CONTRACT_ADDRESS.toLowerCase()) {
            a.flow_out += BigInt(t.amount_raw);
        }
    }
    const assets = Array.from(assetMap.values()).map(a => ({
        ...a,
        flow_in: a.flow_in.toString(),
        flow_out: a.flow_out.toString()
    }));
    console.log(`   Unique assets: ${assets.length}`);

    return { solvers, daily_stats, assets };
}

// ══════════════════════════════════════════════════════════════
//  PHASE 5: Upload all data in batches
// ══════════════════════════════════════════════════════════════
async function uploadAll(txMap, payloads, privacyStats, solvers, daily_stats, tokenTransfers, assets) {
    console.log('🚀 PHASE 5: Uploading all data...');

    const events = Array.from(txMap.values());
    const BATCH = 30;

    // 1) Events
    console.log(`   Uploading ${events.length} events...`);
    for (let i = 0; i < events.length; i += BATCH) {
        await uploadBatch({ events: events.slice(i, i + BATCH) });
    }

    // 2) Payloads
    console.log(`   Uploading ${payloads.length} payloads...`);
    for (let i = 0; i < payloads.length; i += BATCH) {
        await uploadBatch({ payloads: payloads.slice(i, i + BATCH) });
    }

    // 3) Privacy Stats
    console.log(`   Uploading ${privacyStats.length} privacy pool entries...`);
    for (let i = 0; i < privacyStats.length; i += BATCH) {
        await uploadBatch({ privacy_stats: privacyStats.slice(i, i + BATCH) });
    }

    // 4) Token Transfers
    console.log(`   Uploading ${tokenTransfers.length} token transfers...`);
    for (let i = 0; i < tokenTransfers.length; i += BATCH) {
        await uploadBatch({ token_transfers: tokenTransfers.slice(i, i + BATCH) });
    }

    // 5) Solvers
    console.log(`   Uploading ${solvers.length} solver entries...`);
    await uploadBatch({ solvers });

    // 6) Daily Stats
    console.log(`   Uploading ${daily_stats.length} daily stats...`);
    await uploadBatch({ daily_stats });

    // 7) Assets
    if (assets.length > 0) {
        console.log(`   Uploading ${assets.length} asset flow entries...`);
        await uploadBatch({ assets });
    }

    console.log('   ✅ All uploads complete!');
}

async function uploadBatch(payload) {
    try {
        const res = await fetch(`${WORKER_URL}/api/admin/import`, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                'X-Admin-Key': ADMIN_KEY
            },
            body: JSON.stringify(payload)
        });

        if (!res.ok) throw new Error(await res.text());
        const json = await res.json();
        process.stdout.write('.');
    } catch (e) {
        console.error(`\n   ❌ Upload Failed:`, e.message);
    }
}

// ══════════════════════════════════════════════════════════════
//  MAIN
// ══════════════════════════════════════════════════════════════
async function run() {
    console.log(`
╔══════════════════════════════════════════╗
║  Gnoma Explorer - Full Data Backfill v3 ║
║  Contract: ${CONTRACT_ADDRESS.substring(0, 10)}...  ║
║  Chain: Base (${CHAIN_ID})                     ║
║  Multi-asset + All 8 events             ║
╚══════════════════════════════════════════╝
`);

    // PHASE 1: Get all transactions
    const txMap = await fetchAllTransactions();

    // PHASE 2: Get all event logs
    const logs = await fetchAllLogs();

    // PHASE 2.5: Get token transfers per tx
    const tokenTransfers = await fetchTokenTransfers(txMap);

    // PHASE 3: Process logs
    const { payloads, privacyStats } = processLogs(logs, txMap);

    // PHASE 4: Compute analytics
    const { solvers, daily_stats, assets } = computeAnalytics(txMap, payloads, tokenTransfers);

    // Summary
    console.log(`
╔══════════════════════════════════════════╗
║              DATA SUMMARY               ║
╠══════════════════════════════════════════╣
║  Transactions:    ${String(txMap.size).padStart(6)}               ║
║  Payloads:        ${String(payloads.length).padStart(6)}               ║
║  Commitment Roots:${String(privacyStats.length).padStart(6)}               ║
║  Token Transfers: ${String(tokenTransfers.length).padStart(6)}               ║
║  Unique Assets:   ${String(assets.length).padStart(6)}               ║
║  Unique Solvers:  ${String(solvers.length).padStart(6)}               ║
║  Daily Stats:     ${String(daily_stats.length).padStart(6)}               ║
╚══════════════════════════════════════════╝
`);

    // PHASE 5: Upload everything
    await uploadAll(txMap, payloads, privacyStats, solvers, daily_stats, tokenTransfers, assets);

    console.log('\n🎉 Full backfill v3 complete!');
}

run();
