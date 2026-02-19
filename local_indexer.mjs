import { createPublicClient, http, decodeAbiParameters, decodeFunctionData, toHex, keccak256, toBytes } from 'viem';
import { base } from 'viem/chains';
import fs from 'fs';

// Configuration
const WORKER_URL = 'https://anomapay-explorer.bidurandblog.workers.dev';
const RPC_URL = 'https://mainnet.base.org';
const CONTRACT_ADDRESS = '0x9ed43c229480659bf6b6607c46d7b96c6d760cbb';
const SHIELDED_POOL_ADDRESS = '0x990c1773c28b985c2cf32c0a920192bd8717c871'.toLowerCase();

const START_BLOCK = 25000000; // Resume from a point where contract is active
const END_BLOCK = 0; // 0 = Auto-detect latest block
const BATCH_SIZE = 50;
const SAVE_LOCALLY = true;

const CHAIN_ID = 8453;

// Event Signatures
// ActionExecuted(bytes32 actionTreeRoot, uint256 actionTagCount)
const ACTION_EXECUTED_TOPIC = '0x1cc9a0755dd734c1ebfe98b68ece200037e363eb366d0dee04e420e2f23cc010';

// ResourcePayload(bytes32 indexed tag, uint256 index, bytes blob)
const RESOURCE_PAYLOAD_TOPIC = '0x3a134d01c07803003c63301717ddc4612e6c47ae408eeea3222cded532d02ae6';
// DiscoveryPayload(bytes32 indexed tag, uint256 index, bytes blob)
const DISCOVERY_PAYLOAD_TOPIC = '0x' + keccak256(toBytes('DiscoveryPayload(bytes32,uint256,bytes)')).slice(2);
// ExternalPayload(bytes32 indexed tag, uint256 index, bytes blob)
const EXTERNAL_PAYLOAD_TOPIC = '0x' + keccak256(toBytes('ExternalPayload(bytes32,uint256,bytes)')).slice(2);
// ApplicationPayload(bytes32 indexed tag, uint256 index, bytes blob)
const APPLICATION_PAYLOAD_TOPIC = '0x' + keccak256(toBytes('ApplicationPayload(bytes32,uint256,bytes)')).slice(2);

const COMMITMENT_ROOT_ADDED_TOPIC = '0x10dd528db2c49add6545679b976df90d24c035d6a75b17f41b700e8c18ca5364';

const MINIMAL_ABI = [
    { inputs: [], name: 'commitmentCount', outputs: [{ type: 'uint256' }], stateMutability: 'view', type: 'function' },
    { inputs: [], name: 'nullifierCount', outputs: [{ type: 'uint256' }], stateMutability: 'view', type: 'function' }
];

const client = createPublicClient({
    chain: base,
    transport: http(RPC_URL)
});

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

    const PARALLEL_BATCHES = 1; // Keep strictly sequential to avoid nonce/rate-limit issues

    while (currentBlock < endBlockTarget) {
        const bFrom = currentBlock;
        const bTo = Math.min(bFrom + BATCH_SIZE - 1, endBlockTarget);

        console.log(`📡 Processing Batch ${bFrom} -> ${bTo} | ${((bFrom - START_BLOCK) / (endBlockTarget - START_BLOCK) * 100).toFixed(2)}% complete`);

        await processBatch(bFrom, bTo);
        currentBlock += BATCH_SIZE;
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

        const payload = {
            events: [],
            payloads: [], // This will map to payload_events table
            privacy_states: [],
            solvers: [],
            assets: [],
            action_events: [] // New table
        };

        if (logs.length > 0) {
            console.log(`  Found ${logs.length} logs in ${currentBlock}-${toBlock}`);
            const processedTxs = new Set();
            const blockTimestamps = new Map();

            for (const log of logs) {
                const blockNumber = Number(log.blockNumber);
                const txHash = log.transactionHash;

                if (!blockTimestamps.has(blockNumber)) {
                    try {
                        const block = await client.getBlock({ blockNumber: BigInt(blockNumber) });
                        blockTimestamps.set(blockNumber, Number(block.timestamp));
                    } catch (e) { continue; }
                }
                const timestamp = blockTimestamps.get(blockNumber);
                if (!timestamp) continue;

                const topic0 = log.topics[0];

                // 1. ActionExecuted
                if (topic0 === ACTION_EXECUTED_TOPIC) {
                    // avoid duplicates if handling multiple events per tx? 
                    // ActionExecuted is emitted ONCE per action (tx). 
                    // Actually, a tx could have multiple actions if batched? 
                    // For now assume 1:1 or 1:N but we store each event.

                    try {
                        // ActionExecuted(bytes32 actionTreeRoot, uint256 actionTagCount)
                        // Both are non-indexed usually (or explicitly check abi). Assuming non-indexed based on logs being in data.
                        const decoded = decodeAbiParameters(
                            [{ type: 'bytes32' }, { type: 'uint256' }],
                            log.data
                        );
                        const actionTreeRoot = decoded[0];
                        const actionTagCount = decoded[1];

                        payload.action_events.push({
                            chain_id: CHAIN_ID,
                            tx_hash: txHash,
                            block_number: blockNumber,
                            action_tree_root: actionTreeRoot,
                            action_tag_count: Number(actionTagCount),
                            timestamp
                        });

                        // Also Add to legacy 'events' table for backward compatibility if needed, 
                        // or just rely on action_events for new UI. 
                        // We will add a basic entry to 'events' to ensure it shows up in main lists.
                        if (!processedTxs.has(txHash)) {
                            processedTxs.add(txHash);
                            payload.events.push({
                                chain_id: CHAIN_ID, tx_hash: txHash, block_number: blockNumber,
                                event_type: 'ActionExecuted', solver_address: log.address, // Adapter is the emitter
                                value_wei: '0', gas_used: 0, gas_price_wei: '0',
                                data_json: JSON.stringify(log.topics),
                                decoded_input: null, primary_payload_type: 'Action', timestamp
                            });
                        }

                    } catch (err) {
                        console.warn(`Failed to decode ActionExecuted for ${txHash}`, err);
                    }
                }

                // 2. Payloads
                else if ([RESOURCE_PAYLOAD_TOPIC, DISCOVERY_PAYLOAD_TOPIC, EXTERNAL_PAYLOAD_TOPIC, APPLICATION_PAYLOAD_TOPIC].includes(topic0)) {
                    try {
                        // Event: Payload(bytes32 indexed tag, uint256 index, bytes blob)
                        // topic[1] is tag
                        const tag = log.topics[1]; // indexed

                        const decoded = decodeAbiParameters(
                            [{ type: 'uint256' }, { type: 'bytes' }],
                            log.data
                        );
                        const index = decoded[0];
                        const blob = decoded[1];

                        let type = 'Unknown';
                        if (topic0 === RESOURCE_PAYLOAD_TOPIC) type = 'Resource';
                        if (topic0 === DISCOVERY_PAYLOAD_TOPIC) type = 'Discovery';
                        if (topic0 === EXTERNAL_PAYLOAD_TOPIC) type = 'External';
                        if (topic0 === APPLICATION_PAYLOAD_TOPIC) type = 'Application';

                        payload.payloads.push({
                            chain_id: CHAIN_ID,
                            tx_hash: txHash,
                            block_number: blockNumber,
                            tag: tag, // NEW
                            payload_type: type,
                            payload_index: Number(index),
                            blob: blob, // Actual blob data
                            timestamp
                        });

                    } catch (err) {
                        console.warn(`Failed to decode Payload for ${txHash}`, err);
                    }
                }
            }
        }

        // 3. Privacy State Polling (Every ~5 mins or ~150 blocks)
        // We check if the current batches' toBlock is a mulitple of 150
        if (toBlock % 150 < BATCH_SIZE) {
            try {
                // Fetch at the block height of toBlock for historical accuracy
                const [commitmentCount, nullifierCount] = await client.multicall({
                    contracts: [
                        { address: CONTRACT_ADDRESS, abi: MINIMAL_ABI, functionName: 'commitmentCount' },
                        { address: CONTRACT_ADDRESS, abi: MINIMAL_ABI, functionName: 'nullifierCount' }
                    ],
                    blockNumber: BigInt(toBlock)
                });

                if (commitmentCount.status === 'success' && nullifierCount.status === 'success') {
                    console.log(`  🔒 Privacy State at #${toBlock}: ${commitmentCount.result} Commitments, ${nullifierCount.result} Nullifiers`);

                    // We need a root hash for the table schema, fetch latest root event or just use 'LATEST_POLL' placeholder?
                    // The schema requires `root_hash` and strict uniqueness. 
                    // Realistically, privacy_state should be keyed by block_number purely for history.
                    // But our schema has `root_hash` as not null. 
                    // Let's use a dummy root hash for poll-based stats or fetch actual root if possible.
                    // For now, we'll use a placeholder since we want the counts mainly.

                    payload.privacy_states.push({
                        chain_id: CHAIN_ID,
                        block_number: toBlock,
                        root_hash: `POLL_${toBlock}`, // Synthetic root for polling data
                        commitment_count: commitmentCount.result.toString(),
                        nullifier_count: nullifierCount.result.toString(),
                        timestamp: Math.floor(Date.now() / 1000), // Approximate timestamp
                        estimated_pool_size: Number(commitmentCount.result) // Legacy field
                    });
                }
            } catch (err) {
                console.warn("Failed to poll privacy state", err.message);
            }
        }

        if (SAVE_LOCALLY && (payload.events.length > 0 || payload.payloads.length > 0 || payload.action_events.length > 0)) {
            const filename = `data/batch_${currentBlock}_${toBlock}.json`;
            const jsonData = JSON.stringify(payload, (key, value) => typeof value === 'bigint' ? value.toString() : value, 2);
            fs.writeFileSync(filename, jsonData);
            // console.log(`  💾 Saved locally to ${filename}`);
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