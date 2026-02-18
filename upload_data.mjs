import fetch from 'node-fetch';
import fs from 'fs';
import path from 'path';

// CONFIG
const WORKER_URL = 'https://anomapay-explorer.bidurandblog.workers.dev';
const ENDPOINT = '/api/admin/import';
const ADMIN_KEY = process.env.ADMIN_KEY;
if (!ADMIN_KEY) {
    console.error("❌ Error: ADMIN_KEY environment variable is not set.");
    process.exit(1);
}
const DATA_DIR = 'data';
const CONCURRENCY = 20; // Parallel uploads

async function uploadFile(filename) {
    const filePath = path.join(DATA_DIR, filename);
    const content = fs.readFileSync(filePath, 'utf-8');
    const payload = JSON.parse(content);

    // Skip empty files (optimization)
    const hasData = (payload.events && payload.events.length > 0) ||
        (payload.payloads && payload.payloads.length > 0) ||
        (payload.privacy_stats && payload.privacy_stats.length > 0);

    if (!hasData) {
        // console.log(`Skipping empty batch: ${filename}`);
        return { success: true, skipped: true };
    }

    try {
        const res = await fetch(`${WORKER_URL}${ENDPOINT}`, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                'X-Admin-Key': ADMIN_KEY
            },
            body: content // improved: send raw string, no re-stringify
        });

        if (!res.ok) throw new Error(`${res.status} ${res.statusText} - ${await res.text()}`);
        return { success: true, filename };

    } catch (e) {
        return { success: false, filename, error: e.message };
    }
}

async function run() {
    console.log(`🚀 Starting Data Upload to ${WORKER_URL}`);

    if (!fs.existsSync(DATA_DIR)) {
        console.error(`❌ Data directory '${DATA_DIR}' not found.`);
        process.exit(1);
    }

    const files = fs.readdirSync(DATA_DIR).filter(f => f.startsWith('batch_') && f.endsWith('.json'));
    console.log(`📂 Found ${files.length} batch files.`);

    let completed = 0;
    let errors = [];
    let skipped = 0;

    // Process in chunks
    for (let i = 0; i < files.length; i += CONCURRENCY) {
        const chunk = files.slice(i, i + CONCURRENCY);
        const promises = chunk.map(f => uploadFile(f));

        const results = await Promise.all(promises);

        results.forEach(r => {
            if (r.skipped) skipped++;
            else if (r.success) completed++;
            else {
                console.error(`❌ Failed ${r.filename}: ${r.error}`);
                errors.push(r.filename);
            }
        });

        const percent = ((Math.min(i + CONCURRENCY, files.length) / files.length) * 100).toFixed(1);
        process.stdout.write(`\rProgress: ${percent}% | Uploaded: ${completed} | Skipped: ${skipped} | Errors: ${errors.length}`);
    }

    console.log(`\n\n✅ Done!`);
    console.log(`- Uploaded: ${completed}`);
    console.log(`- Skipped (Empty): ${skipped}`);
    console.log(`- Errors: ${errors.length}`);

    if (errors.length > 0) {
        console.log(`\nFailed Files:`, errors);
    }
}

run();
