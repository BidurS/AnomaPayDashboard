import fetch from 'node-fetch';

const API_KEY = 'SGQSJ98663ZXUKWA51781WIB9KKBWRXWA7';
const USER_ADDRESS = '0xA776FE0059D93bD9689b91D98154330e56C0DB8B';
const CONTRACT_ADDRESS = '0x9ed43c229480659bf6b6607c46d7b96c6d760cbb';
const URL = `https://api.etherscan.io/v2/api?chainid=8453&module=account&action=txlist&address=${USER_ADDRESS}&startblock=0&endblock=99999999&sort=desc&apikey=${API_KEY}`;

async function run() {
    console.log(`Checking txs for ${USER_ADDRESS}...`);
    try {
        const res = await fetch(URL);
        const data = await res.json();

        if (data.status !== '1') {
            console.error('Error:', data.message);
            return;
        }

        const txs = data.result;
        console.log(`Found ${txs.length} total transactions for this user.`);

        const interactions = txs.filter(tx => tx.to.toLowerCase() === CONTRACT_ADDRESS.toLowerCase());
        console.log(`Found ${interactions.length} interactions with Anoma Contract (${CONTRACT_ADDRESS}).`);

        interactions.slice(0, 10).forEach(tx => {
            const date = new Date(parseInt(tx.timeStamp) * 1000).toISOString();
            console.log(`- ${date} | Block: ${tx.blockNumber} | Hash: ${tx.hash}`);
        });

    } catch (e) {
        console.error(e);
    }
}

run();
