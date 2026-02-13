// Shared Data Types

export interface Chain {
    id: number;
    name: string;
    explorer_url: string;
    icon: string;
}

export interface Stats {
    totalVolume: number;
    intentCount: number;
    uniqueSolvers: number;
    totalGasUsed: number;
    assetCount: number;
}

export interface Transaction {
    tx_hash: string;
    block_number: number;
    solver_address: string;
    value_wei: string;
    gas_used: number;
    timestamp: number;
    data_json: string;
    primary_type?: string;
}

export interface TransactionDetail extends Transaction {
    event_type: string;
    gas_price_wei: string;
    decoded_input: string;
    payloads: PayloadDetail[];
    tokenTransfers: TokenTransfer[];
    privacyRoot: { root_hash: string; estimated_pool_size: number } | null;
}

export interface PayloadDetail {
    payload_type: string;
    payload_index: number;
    blob: string;
    timestamp: number;
}

export interface TokenTransfer {
    tx_hash?: string;
    block_number?: number;
    token_address: string;
    token_symbol: string;
    token_decimals: number;
    from_address: string;
    to_address: string;
    amount_raw: string;
    amount_display: number;
    amount_usd: number;
    timestamp: number;
}

export interface Solver {
    address: string;
    tx_count: number;
    total_gas_spent: string;
    total_value_processed: string;
    first_seen: number;
    last_seen: number;
}

export interface SolverDetail extends Solver {
    totalVolumeUsd: number;
    recentTransactions: Transaction[];
    dailyActivity: { date: string; count: number }[];
}

export interface DailyStat {
    date: string;
    count: number;
    volume: string;
    unique_solvers: number;
    total_gas_used: number;
    gas_saved: number;
}

export interface Asset {
    token_address: string;
    asset_symbol: string;
    flow_in: string;
    flow_out: string;
    tx_count: number;
}

export interface NetworkHealth {
    tvl: number;
    shieldingRate: number;
}

export interface PayloadStat {
    type: string;
    count: number;
}

export interface AssetSummary {
    token_address: string;
    token_symbol: string;
    token_decimals: number;
    transfer_count: number;
    total_amount: number;
    total_usd: number;
}

// Chain Configuration (Backend specific, but useful to type)
export interface ChainConfig {
    id: number;
    name: string;
    rpc_url: string;
    contract_address: string;
    start_block: number;
    explorer_url: string | null;
    icon: string;
    is_enabled: number;
}
