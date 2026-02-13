// Check all unique topics from the contract logs
async function check() {
    const topics = {};
    let next = null;
    for (let i = 0; i < 5; i++) {
        const url = next
            ? 'https://base.blockscout.com/api/v2/addresses/0x9ed43c229480659bf6b6607c46d7b96c6d760cbb/logs?' + new URLSearchParams(next)
            : 'https://base.blockscout.com/api/v2/addresses/0x9ed43c229480659bf6b6607c46d7b96c6d760cbb/logs?limit=50';
        const r = await fetch(url);
        const d = await r.json();
        for (const l of d.items) {
            const t = l.topics[0];
            const name = l.decoded?.method_call?.split('(')[0] || 'unknown';
            if (!topics[t]) topics[t] = { name, count: 0 };
            topics[t].count++;
        }
        next = d.next_page_params;
        if (!next) break;
        await new Promise(r => setTimeout(r, 300));
    }
    for (const [hash, info] of Object.entries(topics)) {
        console.log(hash.substring(0, 18) + '...  ' + info.name + '  x' + info.count);
    }
}
check();
