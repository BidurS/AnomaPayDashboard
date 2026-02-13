
import { createPublicClient, http } from 'viem';
import { base } from 'viem/chains';

const client = createPublicClient({
    chain: base,
    transport: http('https://mainnet.base.org')
});

const txHashes = [
    '0x84feec34084eed77ba2537f67a296217b0fcbb74008815a99003f45b121eec35',
    '0xfa43b42e544f46fada1bcc7445ab428babcb7ea942c2f7a5d543eea7070541af'
];

async function debug() {
    for (const hash of txHashes) {
        const tx = await client.getTransaction({ hash });
        console.log(`Tx ${hash}:`);
        console.log(`  From: ${tx.from}`);
    }
}

debug();
