
import { createPublicClient, http } from 'viem';
import { base } from 'viem/chains';

const client = createPublicClient({
    chain: base,
    transport: http('https://mainnet.base.org')
});

const txHash = '0xfa43b42e544f46fada1bcc7445ab428babcb7ea942c2f7a5d543eea7070541af';
const USDC = '0x833589fcd6edb6e08f4c7c32d4f71b54bda02913'.toLowerCase();

async function debug() {
    const receipt = await client.getTransactionReceipt({ hash: txHash });
    console.log(`Receipt for ${txHash}`);
    console.log(`Logs: ${receipt.logs.length}`);

    for (const [i, log] of receipt.logs.entries()) {
        const addr = log.address.toLowerCase();
        if (addr === USDC) {
            console.log(`Log ${i}: USDC Transfer detected!`);
            console.log(`Topics:`, log.topics);
            console.log(`Data:`, log.data);
        }
    }
}

debug();
