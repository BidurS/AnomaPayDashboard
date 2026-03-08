// ERC-7683 Cross-Chain Intent Standard Decoder
// Also handles ARM Protocol Adapter calldata decoding

// ============================================================
// Chain Registry
// ============================================================
export const CHAIN_REGISTRY: Record<number, { name: string; icon: string; explorer: string; color: string }> = {
    1: { name: 'Ethereum', icon: '🔷', explorer: 'https://etherscan.io', color: '#627EEA' },
    10: { name: 'Optimism', icon: '🔴', explorer: 'https://optimistic.etherscan.io', color: '#FF0420' },
    56: { name: 'BNB Chain', icon: '🟡', explorer: 'https://bscscan.com', color: '#F3BA2F' },
    100: { name: 'Gnosis', icon: '🟢', explorer: 'https://gnosisscan.io', color: '#04795B' },
    137: { name: 'Polygon', icon: '🟣', explorer: 'https://polygonscan.com', color: '#8247E5' },
    8453: { name: 'Base', icon: '🔵', explorer: 'https://basescan.org', color: '#0052FF' },
    42161: { name: 'Arbitrum', icon: '🔵', explorer: 'https://arbiscan.io', color: '#28A0F0' },
    43114: { name: 'Avalanche', icon: '🔺', explorer: 'https://snowtrace.io', color: '#E84142' },
    534352: { name: 'Scroll', icon: '📜', explorer: 'https://scrollscan.com', color: '#FFEEDA' },
    59144: { name: 'Linea', icon: '🔘', explorer: 'https://lineascan.build', color: '#61DFFF' },
}

// ============================================================
// ERC-7683 Types
// ============================================================
export interface GaslessCrossChainOrder {
    originSettler: string
    user: string
    nonce: string
    originChainId: number
    openDeadline: number
    fillDeadline: number
    orderDataType: string
    orderData: string
}

export interface OnchainCrossChainOrder {
    fillDeadline: number
    orderDataType: string
    orderData: string
}

export interface ResolvedCrossChainOrder {
    user: string
    originChainId: number
    openDeadline: number
    fillDeadline: number
    minReceived: OutputToken[]
    maxSpent: InputToken[]
    fillInstructions: FillInstruction[]
}

export interface InputToken {
    token: string
    amount: string
    maxAmount: string
}

export interface OutputToken {
    token: string
    amount: string
    recipient: string
    chainId: number
}

export interface FillInstruction {
    destinationChainId: number
    destinationSettler: string
    originData: string
}

// ============================================================
// ARM Protocol Types
// ============================================================
export interface ARMTransaction {
    actions: ARMAction[]
    deltaProof: string
    aggregationProof: string
}

export interface ARMAction {
    logicVerifierInputs: LogicVerifierInput[]
    complianceVerifierInputs: ComplianceVerifierInput[]
}

export interface LogicVerifierInput {
    tag: string
    verifyingKey: string
    appData: {
        resourcePayload: ExpirableBlob[]
        discoveryPayload: ExpirableBlob[]
        externalPayload: ExpirableBlob[]
        applicationPayload: ExpirableBlob[]
    }
    proof: string
}

export interface ExpirableBlob {
    deletionCriterion: number
    blob: string
}

export interface ComplianceVerifierInput {
    proof: string
    instance: {
        consumed: { nullifier: string; logicRef: string; commitmentTreeRoot: string }
        created: { commitment: string; logicRef: string }
        unitDeltaX: string
        unitDeltaY: string
    }
}

export interface DecodedResult {
    type: 'erc7683-gasless' | 'erc7683-onchain' | 'arm-execute' | 'unknown'
    data: GaslessCrossChainOrder | OnchainCrossChainOrder | ARMTransaction | null
    raw: string
    error?: string
}

// ============================================================
// Decoder Logic
// ============================================================

// Known function selectors
const SELECTORS = {
    // ERC-7683
    'openFor': '0x8bc87712', // openFor(GaslessCrossChainOrder, bytes, bytes)
    'open': '0xa3c157c4', // open(OnchainCrossChainOrder)
    'fill': '0x62b4d3f9', // fill(bytes32, bytes, bytes)
    'resolve': '0x25e05a50', // resolve(OnchainCrossChainOrder[], bytes[])
    'resolveFor': '0x71d0be56', // resolveFor(GaslessCrossChainOrder[], bytes[], bytes[])
    // ARM
    'execute': '0x09c5eabe', // execute(Transaction)
}

function readAddress(data: string, offset: number): string {
    // 32 bytes per slot, address is last 20 bytes
    return '0x' + data.substring(offset * 2 + 24, offset * 2 + 64)
}

function readUint256(data: string, offset: number): string {
    return '0x' + data.substring(offset * 2, offset * 2 + 64)
}

function readUint32(data: string, offset: number): number {
    const hex = data.substring(offset * 2 + 56, offset * 2 + 64)
    return parseInt(hex, 16)
}

function readUint256AsNumber(data: string, offset: number): number {
    const hex = data.substring(offset * 2, offset * 2 + 64)
    return parseInt(hex, 16)
}

function readBytes32(data: string, offset: number): string {
    return '0x' + data.substring(offset * 2, offset * 2 + 64)
}

export function detectAndDecode(input: string): DecodedResult {
    const cleaned = input.trim()

    // Remove 0x prefix for processing
    const hex = cleaned.startsWith('0x') ? cleaned.slice(2) : cleaned

    // Validate hex
    if (!/^[0-9a-fA-F]*$/.test(hex)) {
        return { type: 'unknown', data: null, raw: cleaned, error: 'Invalid hexadecimal input' }
    }

    if (hex.length < 8) {
        return { type: 'unknown', data: null, raw: cleaned, error: 'Input too short — need at least a 4-byte function selector' }
    }

    const selector = '0x' + hex.substring(0, 8).toLowerCase()
    const calldata = hex.substring(8)

    // Try ARM execute
    if (selector === SELECTORS.execute) {
        return decodeARMExecute(calldata, cleaned)
    }

    // Try ERC-7683 openFor (GaslessCrossChainOrder)
    if (selector === SELECTORS.openFor) {
        return decodeGaslessOrder(calldata, cleaned)
    }

    // Try ERC-7683 open (OnchainCrossChainOrder)
    if (selector === SELECTORS.open) {
        return decodeOnchainOrder(calldata, cleaned)
    }

    // Try general ERC-7683 decode based on data shape
    return tryAutoDetect(calldata, cleaned, selector)
}

function decodeGaslessOrder(calldata: string, raw: string): DecodedResult {
    try {
        // GaslessCrossChainOrder layout (packed in tuples):
        // [0..32]   pointer to order struct data
        // The struct: originSettler, user, nonce, originChainId, openDeadline, fillDeadline, orderDataType, orderData(pointer)

        const offset = readUint256AsNumber(calldata, 0) * 2 // byte offset to char offset
        const structData = offset > 0 ? calldata.substring(offset) : calldata

        const order: GaslessCrossChainOrder = {
            originSettler: readAddress(structData, 0),
            user: readAddress(structData, 32),
            nonce: readUint256(structData, 64),
            originChainId: readUint256AsNumber(structData, 96),
            openDeadline: readUint32(structData, 128),
            fillDeadline: readUint32(structData, 160),
            orderDataType: readBytes32(structData, 192),
            orderData: '0x' + structData.substring(224 * 2).slice(0, 200) + '...'
        }

        return { type: 'erc7683-gasless', data: order, raw }
    } catch (e) {
        return { type: 'erc7683-gasless', data: null, raw, error: `Decode error: ${(e as Error).message}` }
    }
}

function decodeOnchainOrder(calldata: string, raw: string): DecodedResult {
    try {
        const order: OnchainCrossChainOrder = {
            fillDeadline: readUint32(calldata, 0),
            orderDataType: readBytes32(calldata, 32),
            orderData: '0x' + calldata.substring(64 * 2).slice(0, 200) + '...'
        }
        return { type: 'erc7683-onchain', data: order, raw }
    } catch (e) {
        return { type: 'erc7683-onchain', data: null, raw, error: `Decode error: ${(e as Error).message}` }
    }
}

function decodeARMExecute(calldata: string, raw: string): DecodedResult {
    try {
        // ARM execute(Transaction) is complex — extract high-level structure
        // Transaction = { Action[], bytes deltaProof, bytes aggregationProof }

        // First 32 bytes = pointer to Transaction tuple
        const txOffset = readUint256AsNumber(calldata, 0) * 2
        const txData = calldata.substring(txOffset)

        // Within Transaction:
        // [0]  pointer to actions array
        // [32] pointer to deltaProof bytes
        // [64] pointer to aggregationProof bytes
        const actionsOffset = readUint256AsNumber(txData, 0) * 2
        const deltaProofOffset = readUint256AsNumber(txData, 32) * 2
        const aggProofOffset = readUint256AsNumber(txData, 64) * 2

        // Read actions array length
        const actionsData = txData.substring(actionsOffset)
        const actionCount = readUint256AsNumber(actionsData, 0)

        // Read delta proof
        const deltaData = txData.substring(deltaProofOffset)
        const deltaLen = readUint256AsNumber(deltaData, 0)
        const deltaProof = '0x' + deltaData.substring(64, 64 + Math.min(deltaLen * 2, 100)) + (deltaLen > 50 ? '...' : '')

        // Read aggregation proof
        const aggData = txData.substring(aggProofOffset)
        const aggLen = readUint256AsNumber(aggData, 0)
        const aggProof = '0x' + aggData.substring(64, 64 + Math.min(aggLen * 2, 100)) + (aggLen > 50 ? '...' : '')

        // Parse individual actions (simplified — extract key refs)
        const actions: ARMAction[] = []
        for (let i = 0; i < Math.min(actionCount, 10); i++) {
            // Each action pointer
            const actionPtrData = actionsData.substring(64 + i * 64)
            const actionRelOffset = readUint256AsNumber(actionPtrData, 0) * 2
            const actionData = actionsData.substring(64 + actionRelOffset)

            try {
                // Extract compliance inputs
                const compPtr = readUint256AsNumber(actionData, 32) * 2

                const compData = actionData.substring(compPtr)
                const compCount = readUint256AsNumber(compData, 0)

                const compInputs: ComplianceVerifierInput[] = []
                // Read first compliance input for key data
                if (compCount > 0 && compData.length > 128) {
                    const firstCompPtr = readUint256AsNumber(compData, 32) * 2
                    const firstComp = compData.substring(firstCompPtr)

                    // Instance is inline after proof pointer
                    const instanceStart = 32 // After proof pointer

                    compInputs.push({
                        proof: '(omitted)',
                        instance: {
                            consumed: {
                                nullifier: readBytes32(firstComp, instanceStart),
                                logicRef: readBytes32(firstComp, instanceStart + 32),
                                commitmentTreeRoot: readBytes32(firstComp, instanceStart + 64),
                            },
                            created: {
                                commitment: readBytes32(firstComp, instanceStart + 96),
                                logicRef: readBytes32(firstComp, instanceStart + 128),
                            },
                            unitDeltaX: readBytes32(firstComp, instanceStart + 160),
                            unitDeltaY: readBytes32(firstComp, instanceStart + 192),
                        }
                    })
                }

                actions.push({
                    logicVerifierInputs: [],
                    complianceVerifierInputs: compInputs,
                })
            } catch {
                actions.push({
                    logicVerifierInputs: [],
                    complianceVerifierInputs: [],
                })
            }
        }

        const tx: ARMTransaction = {
            actions,
            deltaProof,
            aggregationProof: aggProof,
        }

        return { type: 'arm-execute', data: tx, raw }
    } catch (e) {
        return { type: 'arm-execute', data: null, raw, error: `ARM decode error: ${(e as Error).message}` }
    }
}

function tryAutoDetect(_c: string, raw: string, selector: string): DecodedResult {
    // Try to identify by selector patterns
    return {
        type: 'unknown',
        data: null,
        raw,
        error: `Unknown function selector: ${selector}. Supported: ARM execute (0x09c5eabe), ERC-7683 openFor (0x8bc87712), open (0xa3c157c4)`
    }
}

// ============================================================
// Format Helpers
// ============================================================

export function formatTimestamp(ts: number): string {
    if (ts === 0) return 'Never'
    const date = new Date(ts * 1000)
    const now = Date.now()
    const diff = ts * 1000 - now

    const formatted = date.toLocaleString('en-US', {
        month: 'short', day: 'numeric', year: 'numeric',
        hour: '2-digit', minute: '2-digit', second: '2-digit'
    })

    if (diff > 0) {
        const mins = Math.floor(diff / 60000)
        const hours = Math.floor(mins / 60)
        const days = Math.floor(hours / 24)
        const remain = days > 0 ? `${days}d ${hours % 24}h` : hours > 0 ? `${hours}h ${mins % 60}m` : `${mins}m`
        return `${formatted} (in ${remain})`
    } else {
        const mins = Math.floor(-diff / 60000)
        const hours = Math.floor(mins / 60)
        const days = Math.floor(hours / 24)
        const remain = days > 0 ? `${days}d ago` : hours > 0 ? `${hours}h ago` : `${mins}m ago`
        return `${formatted} (${remain})`
    }
}

export function shortenHex(hex: string, chars = 6): string {
    if (!hex) return ''
    if (hex.length <= chars * 2 + 4) return hex
    return hex.substring(0, chars + 2) + '...' + hex.substring(hex.length - chars)
}

export function getChainName(chainId: number): string {
    return CHAIN_REGISTRY[chainId]?.name || `Chain #${chainId}`
}

export function getChainIcon(chainId: number): string {
    return CHAIN_REGISTRY[chainId]?.icon || '🔗'
}

// Sample data for examples
export const SAMPLE_ARM_CALLDATA = '0x09c5eabe0000000000000000000000000000000000000000000000000000000000000020000000000000000000000000000000000000000000000000000000000000006000000000000000000000000000000000000000000000000000000000000003a000000000000000000000000000000000000000000000000000000000000003e00000000000000000000000000000000000000000000000000000000000000001'

export const SAMPLE_ERC7683_CALLDATA = '0x8bc87712000000000000000000000000a0b86fa1305d1f2c62b3622c70c6b4c3c3d1c4a100000000000000000000000078c56e2c5e9b4a6f6c8c3e9b7d4e2f1a0b3c5d7e0000000000000000000000000000000000000000000000000000000000000001000000000000000000000000000000000000000000000000000000000000000100000000000000000000000000000000000000000000000000000000680a1e0000000000000000000000000000000000000000000000000000000000680a3c4000000000000000000000000000000000000000000000000000000000000000e0'
