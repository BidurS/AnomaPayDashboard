
import fetch from 'node-fetch';

const API_KEY = 'SGQSJ98663ZXUKWA51781WIB9KKBWRXWA7';
const CONTRACT = '0x9ed43c229480659bf6b6607c46d7b96c6d760cbb';

const ENDPOINTS = [
    { name: 'Basescan V1', url: `https://api.basescan.org/api?module=account&action=txlist&address=${CONTRACT}&page=1&offset=1&api_key=${API_KEY}` },
    { name: 'Etherscan V2 (Base)', url: `https://api.etherscan.io/v2/api?chainid=8453&module=account&action=txlist&address=${CONTRACT}&page=1&offset=1&apikey=${API_KEY}` },
    { name: 'Etherscan V2 (Mainnet Check)', url: `https://api.etherscan.io/v2/api?chainid=1&module=account&action=txlist&address=0xdAC17F958D2ee523a2206206994597C13D831ec7&page=1&offset=1&apikey=${API_KEY}` }
];

async function test() {
    for (const ep of ENDPOINTS) {
        try {
            console.log(`Testing ${ep.name}...`);
            const res = await fetch(ep.url);
            const data = await res.json();
            console.log(`  Status: ${data.status}`);
            console.log(`  Message: ${data.message}`);
            if (data.result && typeof data.result === 'string') {
                console.log(`  Result: ${data.result.substring(0, 100)}...`);
            } else {
                console.log(`  Result Count: ${Array.isArray(data.result) ? data.result.length : data.result}`);
            }
        } catch (e) {
            console.log(`  Error: ${e.message}`);
        }
        console.log('---');
    }
}

test();
