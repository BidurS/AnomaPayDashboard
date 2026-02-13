
import { createPublicClient, http, decodeFunctionData } from 'viem';
import { base } from 'viem/chains';
import fs from 'fs';

const client = createPublicClient({
    chain: base,
    transport: http('https://mainnet.base.org')
});

const ABI = JSON.parse(fs.readFileSync('data/ProtocolAdapterABI.json', 'utf8'));
const txHash = '0x84feec34084eed77ba2537f67a296217b0fcbb74008815a99003f45b121eec35';

async function test() {
    console.log(`Fetching transaction ${txHash}...`);
    const tx = await client.getTransaction({ hash: txHash });

    console.log('Transaction Input Data (first 64 chars):', tx.input.slice(0, 64) + '...');

    try {
        const decoded = decodeFunctionData({
            abi: ABI,
            data: tx.input
        });

        console.log('Successfully Decoded!');
        console.log('Function Name:', decoded.functionName);
        console.log('Args Keys:', Object.keys(decoded.args));

        // Pretty print a summary of args
        console.log(JSON.stringify(decoded.args, (key, value) =>
            typeof value === 'bigint' ? value.toString() : value
            , 2));

    } catch (e) {
        console.error('Decoding failed:', e);
    }
}

test();
