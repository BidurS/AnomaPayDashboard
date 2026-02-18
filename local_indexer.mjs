import { createPublicClient, http, decodeAbiParameters, decodeFunctionData } from 'viem';
import { base } from 'viem/chains';
import fs from 'fs';

// Configuration
const WORKER_URL = 'https://anomapay-explorer.bidurandblog.workers.dev';
const RPC_URL = 'https://mainnet.base.org';
// Dispatcher/Entrypoint
const CONTRACT_ADDRESS = '0x9ed43c229480659bf6b6607c46d7b96c6d760cbb';
// Vault/Pool
const SHIELDED_POOL_ADDRESS = '0x990c1773c28b985c2cf32c0a920192bd8717c871'.toLowerCase();

const START_BLOCK = 42290000; // Resume from recent block for quick sync
const END_BLOCK = 0; // 0 = Auto-detect latest block
const BATCH_SIZE = 20;
const CONCURRENCY = 1;
const SAVE_LOCALLY = true;

const CHAIN_ID = 8453;

const TOPICS = {
    TRANSACTION_EXECUTED: '0x1cc9a0755dd734c1ebfe98b68ece200037e363eb366d0dee04e420e2f23cc010',
    RESOURCE_PAYLOAD: '0xcddb327adb31fe5437df2a8c68301bb13a6baae432a804838caaf682506aadf1',
    DISCOVERY_PAYLOAD: '0x0a2dc548ed950accb40d5d78541f3954c5e182a8ecf19e581a4f2263f61f59d2',
    EXTERNAL_PAYLOAD: '0x742915307a0914d79dfa684b976df90d24c035d6a75b17f41b700e8c18ca5364',
    APPLICATION_PAYLOAD: '0x842915307a0914d79dfa684b976df90d24c035d6a75b17f41b700e8c18ca5364',
    COMMITMENT_ROOT_ADDED: '0x10dd528db2c49add6545679b976df90d24c035d6a75b17f41b700e8c18ca5364'
};

const client = createPublicClient({
    chain: base,
    transport: http(RPC_URL)
});

let cumulativePoolSize = 0;

(async () => {
    try {
        const res = await fetch(`${WORKER_URL}/api/privacy-stats?chainId=${CHAIN_ID}`);
        const data = await res.json();
        if (data && data.length > 0) {
            cumulativePoolSize = data[0].estimated_pool_size || 0;
            console.log(`Loaded Pool Size: ${cumulativePoolSize}`);
        }
    } catch (e) { console.warn("Failed to load pool size", e); }
})();

async function run() {
    let currentBlock = START_BLOCK;
    let endBlockTarget = END_BLOCK;

    try {
        const chainHeight = await client.getBlockNumber();
        console.log(`🌐 Current Chain Height: ${chainHeight}`);
        endBlockTarget = Number(chainHeight);

        if (!fs.existsSync('data')) {
            fs.mkdirSync('data');
            console.log(`Created data directory.`);
        }
    } catch (e) {
        console.warn("⚠️ Failed to auto-configure start/end blocks, using defaults.", e);
    }

    console.log(`🚀 Starting Local Indexer: ${currentBlock} -> ${endBlockTarget}`);

    const PARALLEL_BATCHES = 2;

    while (currentBlock < endBlockTarget) {
        const batchPromises = [];
        for (let i = 0; i < PARALLEL_BATCHES && (currentBlock + i * BATCH_SIZE) < endBlockTarget; i++) {
            const bFrom = currentBlock + i * BATCH_SIZE;
            const bTo = Math.min(bFrom + BATCH_SIZE - 1, endBlockTarget);

            const filename = `data/batch_${bFrom}_${bTo}.json`;
            if (fs.existsSync(filename)) {
                // console.log(`⏩ Skipping Batch ${bFrom}-${bTo} (Already exists)`);
                // continue;
            }

            console.log(`📡 Processing Batch ${bFrom} -> ${bTo} | ${((bFrom - START_BLOCK) / (endBlockTarget - START_BLOCK) * 100).toFixed(2)}% complete`);
            batchPromises.push(processBatch(bFrom, bTo));
        }

        await Promise.all(batchPromises);
        currentBlock += PARALLEL_BATCHES * BATCH_SIZE;
    }
    console.log("Done!");
}

async function processBatch(currentBlock, toBlock, attempts = 0) {
    try {
        const logs = await client.getLogs({
            address: CONTRACT_ADDRESS,
            fromBlock: BigInt(currentBlock),
            toBlock: BigInt(toBlock)
        });

        if (logs.length > 0) {
            console.log(`  Found ${logs.length} logs in ${currentBlock}-${toBlock}`);
            const payload = {
                events: [], payloads: [], privacy_stats: [], solvers: [], assets: [], daily_stats: []
            };

            const processedTxs = new Set();
            const blockTimestamps = new Map();

            // Sequential Processing to avoid Rate Limits
            for (const log of logs) {
                const blockNumber = Number(log.blockNumber);
                const txHash = log.transactionHash;

                if (!blockTimestamps.has(blockNumber)) {
                    try {
                        const block = await client.getBlock({ blockNumber: BigInt(blockNumber) });
                        blockTimestamps.set(blockNumber, Number(block.timestamp));
                    } catch (e) { continue; } // Skip if block fetch fails
                }
                const timestamp = blockTimestamps.get(blockNumber);
                if (!timestamp) continue;

                const topic0 = log.topics[0];

                if (topic0 === TOPICS.TRANSACTION_EXECUTED) {
                    if (processedTxs.has(txHash)) continue;
                    processedTxs.add(txHash);

                    // Add slight delay to avoid rate limits
                    await new Promise(r => setTimeout(r, 200));

                    let receipt, txData;
                    try {
                        [receipt, txData] = await Promise.all([
                            client.getTransactionReceipt({ hash: txHash }),
                            client.getTransaction({ hash: txHash })
                        ]);
                    } catch (err) {
                        console.warn(`❌ Failed to fetch tx data for ${txHash}: ${err.message}`);
                        continue;
                    }

                    const solverAddress = txData.from.toLowerCase();
                    let totalValueWei = BigInt(txData.value); // Native ETH value

                    // Decode Input Data
                    let decodedInput = null;
                    try {
                        const ABI = JSON.parse(fs.readFileSync('data/ProtocolAdapterABI.json', 'utf8'));
                        const decoded = decodeFunctionData({
                            abi: ABI,
                            data: txData.input
                        });

                        if (decoded.functionName === 'execute') {
                            decodedInput = JSON.parse(JSON.stringify(decoded.args, (key, value) =>
                                typeof value === 'bigint' ? value.toString() : value
                            ));
                        }
                    } catch (e) {
                        // console.warn(`Failed to decode input for ${txHash}`, e.message);
                    }

                    const ERC20_TRANSFER = '0xddf252ad1be2c89b69c2b068fc378daa952ba7f163c4a11628f55a4df523b3ef';

                    // Process Assets (Multi-Asset Support)
                    for (const rLog of receipt.logs) {
                        if (rLog.topics[0] === ERC20_TRANSFER) {
                            const from = ('0x' + (rLog.topics[1]?.slice(26) || '')).toLowerCase();
                            const to = ('0x' + (rLog.topics[2]?.slice(26) || '')).toLowerCase();
                            const tokenAddress = rLog.address.toLowerCase();
                            const val = BigInt(rLog.data);

                            if (to === SHIELDED_POOL_ADDRESS) {
                                payload.assets.push({
                                    chain_id: CHAIN_ID, token_address: tokenAddress, token_symbol: 'UNKNOWN',
                                    flow_in: val.toString(), flow_out: '0'
                                });
                            } else if (from === SHIELDED_POOL_ADDRESS) {
                                payload.assets.push({
                                    chain_id: CHAIN_ID, token_address: tokenAddress, token_symbol: 'UNKNOWN',
                                    flow_in: '0', flow_out: val.toString()
                                });
                            }
                        }
                    }

                    payload.events.push({
                        chain_id: CHAIN_ID, tx_hash: txHash, block_number: blockNumber,
                        event_type: 'TransactionExecuted', solver_address: solverAddress,
                        value_wei: totalValueWei.toString(), // RAW WEI
                        gas_used: Number(receipt.gasUsed),
                        gas_price_wei: receipt.effectiveGasPrice.toString(),
                        data_json: JSON.stringify(log.topics),
                        decoded_input: decodedInput, // New Field
                        timestamp
                    });

                    payload.solvers.push({
                        chain_id: CHAIN_ID, address: solverAddress, count: 1,
                        gas: (BigInt(receipt.gasUsed) * BigInt(receipt.effectiveGasPrice)).toString(),
                        val: totalValueWei.toString(),
                        timestamp
                    });

                    const date = new Date(timestamp * 1000).toISOString().split('T')[0];
                    payload.daily_stats.push({
                        chain_id: CHAIN_ID, date: date, count: 1,
                        volume: totalValueWei.toString(),
                        gas: Number(receipt.gasUsed)
                    });

                } else if (topic0 === TOPICS.COMMITMENT_ROOT_ADDED) {
                    try {
                        const root = decodeAbiParameters([{ type: 'bytes32', name: 'root' }], log.data)[0];
                        payload.privacy_stats.push({
                            chain_id: CHAIN_ID, block_number: blockNumber,
                            root_hash: root, timestamp, estimated_pool_size: 0
                        });
                    } catch (e) { }
                } else if ([TOPICS.RESOURCE_PAYLOAD, TOPICS.DISCOVERY_PAYLOAD, TOPICS.EXTERNAL_PAYLOAD, TOPICS.APPLICATION_PAYLOAD].includes(topic0)) {
                    const type = topic0 === TOPICS.RESOURCE_PAYLOAD ? 'Resource' :
                        topic0 === TOPICS.DISCOVERY_PAYLOAD ? 'Discovery' :
                            topic0 === TOPICS.EXTERNAL_PAYLOAD ? 'External' : 'Application';
                    payload.payloads.push({
                        chain_id: CHAIN_ID, tx_hash: txHash, block_number: blockNumber,
                        payload_type: type, payload_index: 0,
                        blob: log.data, // Store raw blob!
                        timestamp
                    });
                }
            }

            if (SAVE_LOCALLY) {
                const filename = `data/batch_${currentBlock}_${toBlock}.json`;
                const jsonData = JSON.stringify(payload, (key, value) => typeof value === 'bigint' ? value.toString() : value, 2);
                fs.writeFileSync(filename, jsonData);
                console.log(`  💾 Saved locally to ${filename}`);
            }
        }
    } catch (e) {
        if (attempts < 5) {
            attempts++;
            const isRateLimit = e.message && e.message.includes('429');
            const waitTime = isRateLimit ? 5000 * attempts : 2000;
            console.warn(`⚠️ Error in Batch ${currentBlock}-${toBlock} (Attempt ${attempts}/5): ${e.message}. Retrying in ${waitTime}ms...`);
            await new Promise(r => setTimeout(r, waitTime));
            return processBatch(currentBlock, toBlock, attempts);
        } else {
            console.error(`❌ FAILED Batch ${currentBlock}-${toBlock} after 5 attempts. Skipping.`);
        }
    }
}

run();