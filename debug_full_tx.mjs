
import { createPublicClient, http } from 'viem';
import { base } from 'viem/chains';

const client = createPublicClient({
    chain: base,
    transport: http('https://mainnet.base.org')
});

const txHash = '0x84feec34084eed77ba2537f67a296217b0fcbb74008815a99003f45b121eec35';

async function debug() {
    const receipt = await client.getTransactionReceipt({ hash: txHash });
    console.log(`Receipt for ${txHash}`);
    console.log(`Logs: ${receipt.logs.length}`);

    receipt.logs.forEach((log, i) => {
        console.log(`Log ${i} [${log.address}]:`);
        console.log(`  Topics:`, log.topics);
        console.log(`  Data:`, log.data);
    });
}

debug();
