import fetch from 'node-fetch';

const CONTRACT_ADDRESS = '0x9ed43c229480659bf6b6607c46d7b96c6d760cbb';
const API_URL = `https://base.blockscout.com/api/v2/addresses/${CONTRACT_ADDRESS}/transactions`;

async function testBlockscout() {
    console.log(`Fetching from ${API_URL}...`);
    try {
        const res = await fetch(API_URL);
        if (!res.ok) throw new Error(`${res.status} ${res.statusText}`);
        const data = await res.json();

        console.log('Success!');
        if (data.items && data.items.length > 0) {
            console.log('Sample Transaction:');
            console.log(JSON.stringify(data.items[0], null, 2));
        } else {
            console.log('No transactions found.');
        }
    } catch (e) {
        console.error('Error:', e.message);
    }
}

testBlockscout();
