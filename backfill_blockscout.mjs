import fetch from 'node-fetch';

const WORKER_URL = 'https://anomapay-explorer.bidurandblog.workers.dev';
const ADMIN_KEY = '12e259c33033199b7b5136364976862cdbb6cd2fc8d03ded1bc0816de01f8ab1';
const CONTRACT_ADDRESS = '0x9ed43c229480659bf6b6607c46d7b96c6d760cbb';
const CHAIN_ID = 8453;

// ── Event Topic Signatures ──
const TOPICS = {
    TRANSACTION_EXECUTED: '0x10dd528db2c49add6545679b976df90d24c035d6a75b17f41b700e8c18ca5364',
    COMMITMENT_ROOT_ADDED: '0x0a2dc548ed950accb40d5d78541f3954c5e182a8ecf19e581a4f2263f61f59d2',
    ACTION_EXECUTED: '0x1cc9a0755dd734c1ebfe98b68ece200037e363eb366d0dee04e420e2f23cc010',
    DISCOVERY_PAYLOAD: '0x48243873b4752ddcb45e0d7b11c4c266583e5e099a0b798fdd9c1af7d49324f3',
    RESOURCE_PAYLOAD: '0x3a134d01c07803003c63301717ddc4612e6c47ae408eeea3222cded532d02ae6',
};

const TOPIC_TO_TYPE = {};
TOPIC_TO_TYPE[TOPICS.TRANSACTION_EXECUTED] = 'TransactionExecuted';
TOPIC_TO_TYPE[TOPICS.COMMITMENT_ROOT_ADDED] = 'CommitmentTreeRootAdded';
TOPIC_TO_TYPE[TOPICS.ACTION_EXECUTED] = 'ActionExecuted';
TOPIC_TO_TYPE[TOPICS.DISCOVERY_PAYLOAD] = 'DiscoveryPayload';
TOPIC_TO_TYPE[TOPICS.RESOURCE_PAYLOAD] = 'ResourcePayload';

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
//  PHASE 2: Fetch ALL event logs (5 event types)
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
//  PHASE 3: Process logs into rich data structures
// ══════════════════════════════════════════════════════════════
function processLogs(logs, txMap) {
    console.log('🔬 PHASE 3: Processing event logs...');

    const payloads = [];
    const privacyStats = [];
    const actionCounts = new Map(); // tx_hash -> actionTagCount

    // Counters
    const counts = { TransactionExecuted: 0, CommitmentTreeRootAdded: 0, ActionExecuted: 0, DiscoveryPayload: 0, ResourcePayload: 0, Unknown: 0 };

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
            case 'ResourcePayload': {
                const tag = log.topics?.[1] || log.decoded?.parameters?.[0]?.value || '';
                const index = log.decoded?.parameters?.[1]?.value ?? 0;
                const blob = log.decoded?.parameters?.[2]?.value || log.data || '';
                payloads.push({
                    chain_id: CHAIN_ID,
                    tx_hash: txHash,
                    block_number: blockNumber,
                    payload_type: 'Resource',
                    payload_index: parseInt(index),
                    blob: blob.substring(0, 500), // Truncate large blobs
                    timestamp
                });
                break;
            }
            case 'DiscoveryPayload': {
                const tag = log.topics?.[1] || log.decoded?.parameters?.[0]?.value || '';
                const index = log.decoded?.parameters?.[1]?.value ?? 0;
                const blob = log.decoded?.parameters?.[2]?.value || log.data || '';
                payloads.push({
                    chain_id: CHAIN_ID,
                    tx_hash: txHash,
                    block_number: blockNumber,
                    payload_type: 'Discovery',
                    payload_index: parseInt(index),
                    blob: blob.substring(0, 500),
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
function computeAnalytics(txMap, payloads) {
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

    // === Daily Stats ===
    const dailyMap = new Map();
    for (const tx of txMap.values()) {
        const date = new Date(tx.timestamp * 1000).toISOString().split('T')[0];
        if (!dailyMap.has(date)) {
            dailyMap.set(date, { chain_id: CHAIN_ID, date, count: 0, volume: 0n, gas: 0 });
        }
        const d = dailyMap.get(date);
        d.count++;
        d.volume += BigInt(tx.value_wei || '0');
        d.gas += tx.gas_used || 0;
    }
    const daily_stats = Array.from(dailyMap.values()).map(d => ({
        ...d, volume: d.volume.toString()
    }));
    console.log(`   Daily stats entries: ${daily_stats.length}`);

    return { solvers, daily_stats };
}

// ══════════════════════════════════════════════════════════════
//  PHASE 5: Upload all data in batches
// ══════════════════════════════════════════════════════════════
async function uploadAll(txMap, payloads, privacyStats, solvers, daily_stats) {
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

    // 4) Solvers
    console.log(`   Uploading ${solvers.length} solver entries...`);
    await uploadBatch({ solvers });

    // 5) Daily Stats
    console.log(`   Uploading ${daily_stats.length} daily stats...`);
    await uploadBatch({ daily_stats });

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
║  Gnoma Explorer - Full Data Backfill    ║
║  Contract: ${CONTRACT_ADDRESS.substring(0, 10)}...  ║
║  Chain: Base (${CHAIN_ID})                     ║
╚══════════════════════════════════════════╝
`);

    // PHASE 1: Get all transactions
    const txMap = await fetchAllTransactions();

    // PHASE 2: Get all event logs
    const logs = await fetchAllLogs();

    // PHASE 3: Process logs
    const { payloads, privacyStats } = processLogs(logs, txMap);

    // PHASE 4: Compute analytics
    const { solvers, daily_stats } = computeAnalytics(txMap, payloads);

    // Summary
    console.log(`
╔══════════════════════════════════════════╗
║              DATA SUMMARY               ║
╠══════════════════════════════════════════╣
║  Transactions:    ${String(txMap.size).padStart(6)}               ║
║  Payloads:        ${String(payloads.length).padStart(6)}               ║
║  Commitment Roots:${String(privacyStats.length).padStart(6)}               ║
║  Unique Solvers:  ${String(solvers.length).padStart(6)}               ║
║  Daily Stats:     ${String(daily_stats.length).padStart(6)}               ║
╚══════════════════════════════════════════╝
`);

    // PHASE 5: Upload everything
    await uploadAll(txMap, payloads, privacyStats, solvers, daily_stats);

    console.log('\n🎉 Full backfill complete!');
}

run();
