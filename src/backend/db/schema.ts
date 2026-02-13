import { sqliteTable, integer, real, text, index, unique } from 'drizzle-orm/sqlite-core';
import { sql } from 'drizzle-orm';

// Events Table
export const events = sqliteTable('events', {
    id: integer('id').primaryKey({ autoIncrement: true }),
    chainId: integer('chain_id').notNull(),
    txHash: text('tx_hash').notNull(),
    blockNumber: integer('block_number').notNull(),
    eventType: text('event_type').notNull(),
    solverAddress: text('solver_address'),
    valueWei: text('value_wei').default('0'), // Raw BigInt string
    gasUsed: integer('gas_used'),
    gasPriceWei: text('gas_price_wei').default('0'),
    dataJson: text('data_json').notNull(),
    decodedInput: text('decoded_input'), // JSON string of decoded input
    timestamp: integer('timestamp').default(sql`(strftime('%s', 'now'))`),
}, (table) => ({
    uniqChainTx: unique('uniq_chain_tx').on(table.chainId, table.txHash),
    idxChainTime: index('idx_events_chain_time').on(table.chainId, table.timestamp),
    idxSolver: index('idx_events_solver').on(table.chainId, table.solverAddress),
}));

// Sync State Table
export const syncState = sqliteTable('sync_state', {
    chainId: integer('chain_id').primaryKey(),
    lastBlock: integer('last_block').notNull(),
    updatedAt: integer('updated_at').default(sql`(strftime('%s', 'now'))`),
});

// Chains Table
export const chains = sqliteTable('chains', {
    id: integer('id').primaryKey(),
    name: text('name').notNull(),
    rpcUrl: text('rpc_url').notNull(),
    contractAddress: text('contract_address').notNull(),
    startBlock: integer('start_block').notNull().default(0),
    explorerUrl: text('explorer_url'),
    icon: text('icon').default('🔗'),
    isEnabled: integer('is_enabled').notNull().default(1),
    createdAt: integer('created_at').default(sql`(strftime('%s', 'now'))`),
    updatedAt: integer('updated_at').default(sql`(strftime('%s', 'now'))`),
});

// Solvers Table
export const solvers = sqliteTable('solvers', {
    id: integer('id').primaryKey({ autoIncrement: true }),
    chainId: integer('chain_id').notNull(),
    address: text('address').notNull(),
    txCount: integer('tx_count').default(0),
    totalGasSpent: text('total_gas_spent').default('0'), // Raw BigInt string
    totalValueProcessed: text('total_value_processed').default('0'), // Raw BigInt string
    firstSeen: integer('first_seen'),
    lastSeen: integer('last_seen'),
}, (table) => ({
    uniqChainSolver: unique('uniq_chain_solver').on(table.chainId, table.address),
    idxChainCount: index('idx_solvers_chain_count').on(table.chainId, table.txCount),
}));

// Daily Stats Table
export const dailyStats = sqliteTable('daily_stats', {
    id: integer('id').primaryKey({ autoIncrement: true }),
    chainId: integer('chain_id').notNull(),
    date: text('date').notNull(),
    intentCount: integer('intent_count').default(0),
    totalVolume: text('total_volume').default('0'), // Raw BigInt string
    uniqueSolvers: integer('unique_solvers').default(0),
    totalGasUsed: integer('total_gas_used').default(0),
    gasSaved: integer('gas_saved').default(0),
}, (table) => ({
    uniqChainDate: unique('uniq_chain_date').on(table.chainId, table.date),
    idxChainDate: index('idx_daily_stats_chain_date').on(table.chainId, table.date),
}));

// Asset Flows Table
export const assetFlows = sqliteTable('asset_flows', {
    id: integer('id').primaryKey({ autoIncrement: true }),
    chainId: integer('chain_id').notNull(),
    tokenAddress: text('token_address').notNull(),
    tokenSymbol: text('token_symbol'),
    flowIn: text('flow_in').default('0'), // Raw BigInt string
    flowOut: text('flow_out').default('0'), // Raw BigInt string
    txCount: integer('tx_count').default(0),
    lastUpdated: integer('last_updated').default(sql`(strftime('%s', 'now'))`),
}, (table) => ({
    uniqChainToken: unique('uniq_chain_token').on(table.chainId, table.tokenAddress),
    idxChainTxCount: index('idx_asset_flows_chain').on(table.chainId, table.txCount),
}));

// Privacy Pool Stats Table
export const privacyPoolStats = sqliteTable('privacy_pool_stats', {
    id: integer('id').primaryKey({ autoIncrement: true }),
    chainId: integer('chain_id').notNull(),
    blockNumber: integer('block_number').notNull(),
    rootHash: text('root_hash').notNull(),
    timestamp: integer('timestamp').notNull(),
    estimatedPoolSize: integer('estimated_pool_size').default(0),
}, (table) => ({
    uniqChainRoot: unique('uniq_chain_root').on(table.chainId, table.rootHash),
    idxChainBlock: index('idx_privacy_pool_chain_block').on(table.chainId, table.blockNumber),
}));

// Payloads Table
export const payloads = sqliteTable('payloads', {
    id: integer('id').primaryKey({ autoIncrement: true }),
    chainId: integer('chain_id').notNull(),
    txHash: text('tx_hash').notNull(),
    blockNumber: integer('block_number').notNull(),
    payloadType: text('payload_type').notNull(), // Resource, Discovery, External, Application
    payloadIndex: integer('payload_index').notNull(),
    blob: text('blob'), // The actual data blob (hex)
    timestamp: integer('timestamp').default(sql`(strftime('%s', 'now'))`),
}, (table) => ({
    uniqChainTxIndex: unique('uniq_chain_tx_index').on(table.chainId, table.txHash, table.payloadType, table.payloadIndex),
    idxChainType: index('idx_payloads_chain_type').on(table.chainId, table.payloadType),
    idxChainTime: index('idx_payloads_chain_time').on(table.chainId, table.timestamp),
}));

// Token Transfers Table
export const tokenTransfers = sqliteTable('token_transfers', {
    id: integer('id').primaryKey({ autoIncrement: true }),
    chainId: integer('chain_id').notNull(),
    txHash: text('tx_hash').notNull(),
    blockNumber: integer('block_number').notNull(),
    tokenAddress: text('token_address').notNull(),
    tokenSymbol: text('token_symbol').default('UNKNOWN'),
    tokenDecimals: integer('token_decimals').default(18),
    fromAddress: text('from_address').notNull(),
    toAddress: text('to_address').notNull(),
    amountRaw: text('amount_raw').notNull(),     // Raw amount string
    amountDisplay: real('amount_display').default(0),
    amountUsd: real('amount_usd').default(0),
    timestamp: integer('timestamp').default(sql`(strftime('%s', 'now'))`),
}, (table) => ({
    uniqChainTxToken: unique('uniq_chain_tx_token').on(table.chainId, table.txHash, table.tokenAddress, table.fromAddress, table.toAddress),
    idxChainTime: index('idx_token_transfers_chain_time').on(table.chainId, table.timestamp),
    idxToken: index('idx_token_transfers_token').on(table.chainId, table.tokenAddress),
    idxTx: index('idx_token_transfers_tx').on(table.chainId, table.txHash),
}));
