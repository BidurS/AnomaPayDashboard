import { useQuery } from '@tanstack/react-query'
import { API_BASE_url } from '../lib/api'

const API_URL = API_BASE_url

export interface BatchTransaction {
    tx_hash: string
    block_number: number
    solver_address: string
    value_wei: string
    gas_used: number
    timestamp: string
    method: string
    chain_id: number
}

export interface Batch {
    id: string
    blockNumber: number
    chainId: number
    solver: string
    transactions: BatchTransaction[]
    totalGas: number
    totalValue: string
    timestamp: string
    cowMatches: number // estimated CoW (Coincidence of Wants) matches
}

export interface BatchStats {
    totalBatches: number
    avgIntentsPerBatch: number
    cowMatchRate: number
    totalGasSaved: number
    activeSolvers: string[]
}

function groupIntoBatches(transactions: BatchTransaction[]): Batch[] {
    // Group by block_number + solver_address (same block + same solver = one batch)
    const groups: Record<string, BatchTransaction[]> = {}

    for (const tx of transactions) {
        const key = `${tx.chain_id}-${tx.block_number}-${tx.solver_address}`
        if (!groups[key]) groups[key] = []
        groups[key].push(tx)
    }

    const batches: Batch[] = Object.entries(groups).map(([key, txs]) => {
        const [chainId, blockNum] = key.split('-')
        const totalGas = txs.reduce((sum, tx) => sum + (tx.gas_used || 0), 0)

        // Estimate CoW matches: if multiple txs in same batch, some may be CoW-matched
        // In a real implementation this would check opposing resource logicRefs
        const cowMatches = txs.length > 1 ? Math.floor(txs.length / 2) : 0

        return {
            id: key,
            blockNumber: parseInt(blockNum),
            chainId: parseInt(chainId),
            solver: txs[0].solver_address,
            transactions: txs,
            totalGas,
            totalValue: txs.reduce((sum, tx) => {
                const val = parseFloat(tx.value_wei || '0')
                return sum + val
            }, 0).toString(),
            timestamp: txs[0].timestamp,
            cowMatches,
        }
    })

    // Sort by block number descending
    return batches.sort((a, b) => b.blockNumber - a.blockNumber)
}

function calculateStats(batches: Batch[]): BatchStats {
    const totalBatches = batches.length
    const totalIntents = batches.reduce((sum, b) => sum + b.transactions.length, 0)
    const totalCowMatches = batches.reduce((sum, b) => sum + b.cowMatches, 0)
    const totalGas = batches.reduce((sum, b) => sum + b.totalGas, 0)

    const solverSet = new Set<string>()
    batches.forEach(b => solverSet.add(b.solver))

    return {
        totalBatches,
        avgIntentsPerBatch: totalBatches > 0 ? totalIntents / totalBatches : 0,
        cowMatchRate: totalIntents > 0 ? (totalCowMatches / totalIntents) * 100 : 0,
        totalGasSaved: Math.floor(totalGas * 0.15), // estimate 15% gas saving from batching
        activeSolvers: Array.from(solverSet),
    }
}

export function useBatchAuctions(chainId: number) {
    const { data, isLoading } = useQuery({
        queryKey: ['batch-auctions', chainId],
        queryFn: async () => {
            const res = await fetch(`${API_URL}/api/transactions?chainId=${chainId}&limit=100`)
            if (!res.ok) return { batches: [], stats: calculateStats([]) }

            const txs = await res.json() as BatchTransaction[]
            const batches = groupIntoBatches(txs)
            const stats = calculateStats(batches)

            return { batches, stats }
        },
        refetchInterval: 30000,
        staleTime: 15000,
    })

    return {
        batches: data?.batches || [],
        stats: data?.stats || null,
        loading: isLoading,
    }
}

// Multi-chain batch auctions
export function useMultiChainBatchAuctions() {
    const ARM_CHAINS = [1, 8453, 10, 42161]

    const { data, isLoading } = useQuery({
        queryKey: ['multi-chain-batches'],
        queryFn: async () => {
            const results = await Promise.allSettled(
                ARM_CHAINS.map(async (chainId) => {
                    const res = await fetch(`${API_URL}/api/transactions?chainId=${chainId}&limit=50`)
                    if (!res.ok) return []
                    return (await res.json() as BatchTransaction[]).map(tx => ({ ...tx, chain_id: chainId }))
                })
            )

            const allTxs: BatchTransaction[] = []
            for (const r of results) {
                if (r.status === 'fulfilled') allTxs.push(...r.value)
            }

            const batches = groupIntoBatches(allTxs)
            const stats = calculateStats(batches)

            return { batches, stats }
        },
        refetchInterval: 30000,
        staleTime: 15000,
    })

    return {
        batches: data?.batches || [],
        stats: data?.stats || null,
        loading: isLoading,
    }
}
