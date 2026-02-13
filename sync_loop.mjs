
import { execSync } from 'child_process';

console.log("🔄 Starting Sync Loop (Runs upload_data.mjs every 60s)...");

while (true) {
    try {
        console.log(`\n⏰ Running upload... ${new Date().toLocaleTimeString()}`);
        execSync('node upload_data.mjs', { stdio: 'inherit' });
    } catch (e) {
        console.error("❌ Upload failed:", e.message);
    }

    console.log("💤 Sleeping 60s...");
    await new Promise(r => setTimeout(r, 60000));
}
