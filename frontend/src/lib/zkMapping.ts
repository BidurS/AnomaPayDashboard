export interface ZKProgram {
    name: string
    description: string
    sourceUrl: string
    tags: string[]
}

export const ZK_PROGRAM_MAPPING: Record<string, ZKProgram> = {
    // These are example RISC Zero Image IDs (program hashes) 
    // In a real production app, these would be the actual hashes from the Anoma Protocol Adapters
    '0x1cc9a0755dd734c1ebfe98b68ece200037e363eb366d0dee04e420e2f23cc010': {
        name: 'Shielded Multi-Asset Transfer',
        description: 'Verifies the validity of resource transitions for fungible and non-fungible assets within the shielded pool.',
        sourceUrl: 'https://github.com/anoma/anoma/blob/main/core/zk/transfer.rs',
        tags: ['Transfer', 'Privacy']
    },
    '0x10dd528db2c49add6545679b976df90d24c035d6a75b17f41b700e8c18ca5364': {
        name: 'Atomic Swap Matcher',
        description: 'Ensures that two user intents are matched fairly without revealing the underlying assets until settlement.',
        sourceUrl: 'https://github.com/anoma/anoma/blob/main/core/zk/swap.rs',
        tags: ['Swap', 'Exchange']
    },
    '0x0a2dc548ed950accb40d5d78541f3954c5e182a8ecf19e581a4f2263f61f59d2': {
        name: 'Governance Voting Power',
        description: 'Proves a user has the required voting power based on shielded resource snapshots without revealing their balance.',
        sourceUrl: 'https://github.com/anoma/anoma/blob/main/core/zk/gov.rs',
        tags: ['Governance']
    },
    // Default fallback name for unknown ImageIDs
    'default': {
        name: 'Shielded Resource Logic',
        description: 'Custom ZK program defining resource consumption and creation rules on the Anoma ARM.',
        sourceUrl: 'https://github.com/anoma/anoma',
        tags: ['Logic']
    }
}

export function getZKProgram(imageId: string): ZKProgram {
    return ZK_PROGRAM_MAPPING[imageId] || ZK_PROGRAM_MAPPING['default']
}
