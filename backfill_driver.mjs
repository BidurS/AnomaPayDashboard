import fetch from 'node-fetch';

const WORKER_URL = 'https://anomapay-explorer.bidurandblog.workers.dev';
const ADMIN_KEY = 'temp-secret';
const CHAIN_ID = 8453;
const START_BLOCK = 39561457; // Exact deployment block (Found via BaseScan)
// Fetch current block dynamically if possible, or just set a high number
// 41,500,000 is approx now.
const END_BLOCK = 43000000;
const BATCH_SIZE = 10;

async function run() {
  console.log(`🚀 Starting Backfill for Chain ${CHAIN_ID}`);
  console.log(`From ${START_BLOCK} to ${END_BLOCK}`);

  let currentBlock = START_BLOCK;
  let retryCount = 0;
  const MAX_RETRIES = 3;

  while (currentBlock < END_BLOCK) {
    const toBlock = Math.min(currentBlock + BATCH_SIZE, END_BLOCK);

    console.log(`Processing ${currentBlock} -> ${toBlock}...`);

    try {
      const res = await fetch(`${WORKER_URL}/api/admin/backfill`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'X-Admin-Key': ADMIN_KEY
        },
        body: JSON.stringify({
          chainId: CHAIN_ID,
          fromBlock: currentBlock,
          toBlock: toBlock
        })
      });

      if (!res.ok) {
        const errText = await res.text();
        console.error(`❌ Error: ${res.status} ${res.statusText} - ${errText}`);
        if (retryCount < MAX_RETRIES) {
          retryCount++;
          console.log(`Retrying (${retryCount}/${MAX_RETRIES}) in 5s...`);
          await new Promise(r => setTimeout(r, 5000));
          continue;
        } else {
          console.error(`❌ Swallowing error and SKIPPING batch ${currentBlock} -> ${toBlock} after ${MAX_RETRIES} attempts.`);
          currentBlock = toBlock; // Skip this batch
          break; // Break retry loop, continue main loop
        }
      }

      const data = await res.json();
      console.log(`✅ Synced: Found ${data.firstBatchResult?.eventsFound || 0} events.`);
      retryCount = 0; // Reset on success

    } catch (e) {
      console.error("Network error:", e);
      if (retryCount < MAX_RETRIES) {
        retryCount++;
        await new Promise(r => setTimeout(r, 5000));
        continue;
      }
      break;
    }

    currentBlock += BATCH_SIZE;
    await new Promise(r => setTimeout(r, 200));
  }

  console.log("🏁 Backfill Complete!");
}

run();