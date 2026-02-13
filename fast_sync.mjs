
import fetch from 'node-fetch';
import fs from 'fs';
import { decodeFunctionData } from 'viem';

// CONFIG
const START_BLOCK = 41480943;
const API_KEY = 'SGQSJ98663ZXUKWA51781WIB9KKBWRXWA7'; // User Provided
const CONTRACT_ADDRESS = '0x9ed43c229480659bf6b6607c46d7b96c6d760cbb';
const BASESCAN_API = 'https://api.etherscan.io/v2/api';
// ...
async function fetchTransactions(startBlock) {
    const url = `${BASESCAN_API}?chainid=8453&module=account&action=txlist&address=${CONTRACT_ADDRESS}&startblock=${startBlock}&endblock=99999999&sort=asc&apikey=${API_KEY}`;
    console.log(`📡 Fetching from Basescan: ${startBlock}...`);

    const res = await fetch(url);
    const data = await res.json();

    if (data.status !== '1' && data.message !== 'No transactions found') {
        throw new Error(`Basescan Error: ${data.message} - ${data.result}`);
    }

    return data.result || [];
}

async function run() {
    let currentBlock = START_BLOCK;

    while (true) {
        try {
            const txs = await fetchTransactions(currentBlock);
            if (txs.length === 0) {
                console.log("✅ No more new transactions. Synced!");
                break;
            }

            console.log(`📥 Received ${txs.length} transactions.`);

            // Group by batches of 100 to emulate old behavior
            const BATCH_SIZE = 100;

            for (let i = 0; i < txs.length; i += BATCH_SIZE) {
                const batchTxs = txs.slice(i, i + BATCH_SIZE);
                const first = batchTxs[0];
                const last = batchTxs[batchTxs.length - 1];

                const payload = {
                    events: [], payloads: [], privacy_stats: [], solvers: [], assets: [], daily_stats: []
                };

                for (const tx of batchTxs) {
                    if (tx.isError !== '0') continue; // Skip failed txs

                    const txHash = tx.hash;
                    const blockNumber = Number(tx.blockNumber);
                    const timestamp = Number(tx.timeStamp);
                    const solverAddress = tx.from.toLowerCase();
                    const valueWei = tx.value;
                    const gasUsed = Number(tx.gasUsed);
                    const gasPrice = tx.gasPrice;

                    // DECODE INPUT
                    let decodedInput = null;
                    let actions = [];
                    try {
                        const decoded = decodeFunctionData({ abi: ABI, data: tx.input });
                        if (decoded.functionName === 'execute') {
                            // Deep copy to handle BigInts
                            decodedInput = JSON.parse(JSON.stringify(decoded.args, (key, value) =>
                                typeof value === 'bigint' ? value.toString() : value
                            ));

                            // Extract Actions from the 'transaction' struct (2nd arg, index 1)
                            // "execute" args: [verifierInputs, transaction]
                            // "transaction" struct: [actions, deltaProof, aggProof]
                            if (decoded.args[1] && decoded.args[1].actions) {
                                actions = decoded.args[1].actions;
                            }
                        }
                    } catch (e) {
                        // console.warn(`Decoding failed for ${txHash}`, e.message);
                    }

                    // 1. TransactionExecuted Event
                    // Note: We don't have the original 'data_json' (topics) from the log here easily, 
                    // but we can reconstruct a dummy one or leave it null if the backend handles it.
                    // The backend schema requires data_json. Let's provide a valid string.
                    payload.events.push({
                        chain_id: 8453,
                        tx_hash: txHash,
                        block_number: blockNumber,
                        event_type: 'TransactionExecuted',
                        solver_address: solverAddress,
                        value_wei: valueWei,
                        gas_used: gasUsed,
                        gas_price_wei: gasPrice,
                        data_json: '["0x1cc9a0755dd734c1ebfe98b68ece200037e363eb366d0dee04e420e2f23cc010"]', // Mock Topic0
                        decoded_input: decodedInput,
                        timestamp
                    });

                    // 2. Solvers
                    payload.solvers.push({
                        chain_id: 8453,
                        address: solverAddress,
                        count: 1,
                        gas: (BigInt(gasUsed) * BigInt(gasPrice)).toString(),
                        val: valueWei,
                        timestamp
                    });

                    // 3. Daily Stats
                    const date = new Date(timestamp * 1000).toISOString().split('T')[0];
                    payload.daily_stats.push({
                        chain_id: 8453, date: date, count: 1,
                        volume: valueWei,
                        gas: gasUsed
                    });

                    // 4. Payloads (Extracted from Input Actions)
                    // Action Struct: [appData, proof]
                    // AppData: [tag, verifyingKey, resourcePayload[], discoveryPayload[], externalPayload[]...]
                    if (decodedInput && decodedInput[1] && decodedInput[1].actions) {
                        // We iterate the 'actions' array from the decoded input
                        // args[1] is 'transaction' tuple
                        // transaction[0] is 'actions' array
                        const actionsList = decodedInput[1].actions;

                        actionsList.forEach((action, idx) => {
                            const appData = action.appData; // This is an array/object based on the struct
                            // appData structure: [tag, vk, resource[], discovery[], external[], application[]]
                            // mapped by name in JSON usually

                            const processPayloads = (list, type) => {
                                if (list && list.length > 0) {
                                    list.forEach((item, pIdx) => {
                                        payload.payloads.push({
                                            chain_id: 8453,
                                            tx_hash: txHash,
                                            block_number: blockNumber,
                                            payload_type: type,
                                            payload_index: idx * 100 + pIdx, // composite index
                                            blob: item.blob, // The extracted blob
                                            timestamp
                                        });
                                    });
                                }
                            };

                            processPayloads(appData.resourcePayload, 'Resource');
                            processPayloads(appData.discoveryPayload, 'Discovery');
                            processPayloads(appData.externalPayload, 'External');
                            processPayloads(appData.applicationPayload, 'Application');
                        });
                    }
                } // end tx loop

                // SAVE
                if (payload.events.length > 0) {
                    const filename = `data/batch_${first.blockNumber}_${last.blockNumber}.json`;
                    fs.writeFileSync(filename, JSON.stringify(payload, null, 2));
                    console.log(`💾 Saved batch ${first.blockNumber} -> ${last.blockNumber} (${payload.events.length} txs)`);
                }

            } // end batch loop

            // Next Page
            const userLastBlock = Number(txs[txs.length - 1].blockNumber);
            currentBlock = userLastBlock + 1;

            // Rate limit compliance
            await new Promise(r => setTimeout(r, 250));

        } catch (e) {
            console.error("❌ Sync Error:", e);
            await new Promise(r => setTimeout(r, 5000));
        }
    }
}

run();
