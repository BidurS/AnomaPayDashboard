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
    primaryPayloadType: text('primary_payload_type'), // Optimization to avoid subqueries
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

// Privacy Pool Stats Table (Extended for Phase 3)
export const privacyStates = sqliteTable('privacy_pool_stats', {
    id: integer('id').primaryKey({ autoIncrement: true }),
    chainId: integer('chain_id').notNull(),
    blockNumber: integer('block_number').notNull(),
    rootHash: text('root_hash').notNull(),
    commitmentCount: text('commitment_count').default('0'), // Exact on-chain count
    nullifierCount: text('nullifier_count').default('0'),   // Exact on-chain count
    timestamp: integer('timestamp').notNull(),
    estimatedPoolSize: integer('estimated_pool_size').default(0), // Kept for backward compat/estimation
}, (table) => ({
    uniqChainRoot: unique('uniq_chain_root').on(table.chainId, table.rootHash),
    idxChainBlock: index('idx_privacy_states_chain_block').on(table.chainId, table.blockNumber),
}));

// Action Events Table (New for Phase 3)
export const actionEvents = sqliteTable('action_events', {
    id: integer('id').primaryKey({ autoIncrement: true }),
    chainId: integer('chain_id').notNull(),
    txHash: text('tx_hash').notNull(),
    blockNumber: integer('block_number').notNull(),
    actionTreeRoot: text('action_tree_root').notNull(),
    actionTagCount: integer('action_tag_count').default(0),
    timestamp: integer('timestamp').default(sql`(strftime('%s', 'now'))`),
}, (table) => ({
    uniqChainTxAction: unique('uniq_chain_tx_action').on(table.chainId, table.txHash),
    idxChainTime: index('idx_action_events_chain_time').on(table.chainId, table.timestamp),
}));

// Payloads Table (Updated for Phase 3)
export const payloads = sqliteTable('payloads', {
    id: integer('id').primaryKey({ autoIncrement: true }),
    chainId: integer('chain_id').notNull(),
    txHash: text('tx_hash').notNull(),
    blockNumber: integer('block_number').notNull(),
    tag: text('tag'), // New: Action Tag association
    payloadType: text('payload_type').notNull(), // Resource, Discovery, External, Application
    payloadIndex: integer('payload_index').notNull(),
    blob: text('blob'), // The actual data blob (hex)
    timestamp: integer('timestamp').default(sql`(strftime('%s', 'now'))`),
}, (table) => ({
    uniqChainTxIndex: unique('uniq_chain_tx_index').on(table.chainId, table.txHash, table.payloadType, table.payloadIndex),
    idxChainType: index('idx_payloads_chain_type').on(table.chainId, table.payloadType),
    idxChainTime: index('idx_payloads_chain_time').on(table.chainId, table.timestamp),
    idxTag: index('idx_payloads_tag').on(table.chainId, table.tag),
}));

// Forwarder Calls Table (New for Phase 12)
export const forwarderCalls = sqliteTable('forwarder_calls', {
    id: integer('id').primaryKey({ autoIncrement: true }),
    chainId: integer('chain_id').notNull(),
    txHash: text('tx_hash').notNull(),
    blockNumber: integer('block_number').notNull(),
    untrustedForwarder: text('untrusted_forwarder').notNull(),
    input: text('input').notNull(),
    output: text('output').notNull(),
    timestamp: integer('timestamp').default(sql`(strftime('%s', 'now'))`),
}, (table) => ({
    uniqChainTxForwarder: unique('uniq_chain_tx_forwarder').on(table.chainId, table.txHash, table.untrustedForwarder),
    idxChainTime: index('idx_forwarder_calls_chain_time').on(table.chainId, table.timestamp),
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

// ══════════════════════════════════════════════════════════════
//  Phase 1: Intent Lifecycle Engine Tables
// ══════════════════════════════════════════════════════════════

// Intent Lifecycle — full lifecycle tracking for every intent
export const intentLifecycle = sqliteTable('intent_lifecycle', {
    id: text('id').primaryKey(),                           // chainId:txHash:logIndex
    chainId: integer('chain_id').notNull(),
    status: text('status').notNull().default('settled'),    // pending/matched/settling/settled/failed/expired
    intentType: text('intent_type').notNull().default('unknown'), // swap/transfer/bridge/resource/discovery/external/application
    creator: text('creator'),
    solver: text('solver'),

    // ARM Resource Model
    consumedResources: text('consumed_resources'),          // JSON array
    createdResources: text('created_resources'),            // JSON array
    actionTreeRoot: text('action_tree_root'),
    tagCount: integer('tag_count').default(0),

    // Financial
    inputValueUsd: real('input_value_usd').default(0),
    outputValueUsd: real('output_value_usd').default(0),
    solverProfitUsd: real('solver_profit_usd').default(0),
    gasCostUsd: real('gas_cost_usd').default(0),
    gasUsed: integer('gas_used').default(0),
    gasPriceWei: text('gas_price_wei').default('0'),

    // Privacy
    isShielded: integer('is_shielded').default(0),
    commitmentRoot: text('commitment_root'),
    nullifierCount: integer('nullifier_count').default(0),

    // Cross-chain
    isMultiChain: integer('is_multi_chain').default(0),
    correlationId: text('correlation_id'),

    // Payloads
    payloadTypes: text('payload_types'),                    // JSON array: ["Resource", "Discovery"]
    payloadCount: integer('payload_count').default(0),
    hasForwarderCalls: integer('has_forwarder_calls').default(0),

    // Timing
    createdAt: integer('created_at').notNull(),
    matchedAt: integer('matched_at'),
    settledAt: integer('settled_at'),
    expiresAt: integer('expires_at'),
    settlementTimeMs: integer('settlement_time_ms'),

    // Raw data
    txHash: text('tx_hash').notNull(),
    blockNumber: integer('block_number').notNull(),
    valueWei: text('value_wei').default('0'),
    rawDataJson: text('raw_data_json'),
}, (table) => ({
    idxStatus: index('idx_lifecycle_status').on(table.status, table.createdAt),
    idxSolver: index('idx_lifecycle_solver').on(table.solver, table.settledAt),
    idxType: index('idx_lifecycle_type').on(table.intentType, table.chainId),
    idxChainTime: index('idx_lifecycle_chain_time').on(table.chainId, table.createdAt),
    idxCorrelation: index('idx_lifecycle_correlation').on(table.correlationId),
    idxTx: index('idx_lifecycle_tx').on(table.chainId, table.txHash),
}));

// Lifecycle Events — state transition audit log
export const lifecycleEvents = sqliteTable('lifecycle_events', {
    id: integer('id').primaryKey({ autoIncrement: true }),
    intentId: text('intent_id').notNull(),
    fromStatus: text('from_status').notNull(),
    toStatus: text('to_status').notNull(),
    triggeredBy: text('triggered_by'),
    metadata: text('metadata'),
    timestamp: integer('timestamp').notNull(),
}, (table) => ({
    idxIntent: index('idx_lifecycle_events_intent').on(table.intentId, table.timestamp),
}));

// Solver Economics — daily P&L per solver
export const solverEconomics = sqliteTable('solver_economics', {
    id: integer('id').primaryKey({ autoIncrement: true }),
    solverAddress: text('solver_address').notNull(),
    chainId: integer('chain_id').notNull(),
    period: text('period').notNull(),                      // YYYY-MM-DD
    intentsSolved: integer('intents_solved').default(0),
    intentsFailed: integer('intents_failed').default(0),
    totalRevenueUsd: real('total_revenue_usd').default(0),
    totalGasCostUsd: real('total_gas_cost_usd').default(0),
    netProfitUsd: real('net_profit_usd').default(0),
    avgSettlementTimeMs: integer('avg_settlement_time_ms').default(0),
    avgBatchSize: real('avg_batch_size').default(1),
    successRate: real('success_rate').default(1.0),
    intentTypesJson: text('intent_types_json'),            // JSON: {"swap": 5, "bridge": 2}
}, (table) => ({
    uniqSolverPeriod: unique('uniq_solver_chain_period').on(table.solverAddress, table.chainId, table.period),
    idxAddress: index('idx_solver_econ_address').on(table.solverAddress, table.period),
    idxChain: index('idx_solver_econ_chain').on(table.chainId, table.period),
}));

// Cross-chain Correlations
export const crossChainCorrelations = sqliteTable('cross_chain_correlations', {
    correlationId: text('correlation_id').primaryKey(),
    intentIds: text('intent_ids').notNull(),                // JSON array
    correlationType: text('correlation_type').notNull(),    // bridge/atomic_swap/chimera
    confidence: real('confidence').default(0),
    totalValueUsd: real('total_value_usd').default(0),
    chains: text('chains').notNull(),                      // JSON array of chain IDs
    status: text('status').default('in_progress'),
    startedAt: integer('started_at').notNull(),
    completedAt: integer('completed_at'),
});

// API Keys for developer access
export const apiKeys = sqliteTable('api_keys', {
    keyHash: text('key_hash').primaryKey(),
    userId: text('user_id').notNull(),
    name: text('name').notNull(),
    tier: text('tier').default('free'),
    rateLimit: integer('rate_limit').default(100),
    dailyLimit: integer('daily_limit').default(10000),
    createdAt: integer('created_at').notNull(),
    lastUsed: integer('last_used'),
    isActive: integer('is_active').default(1),
});

// API Usage tracking
export const apiUsage = sqliteTable('api_usage', {
    id: integer('id').primaryKey({ autoIncrement: true }),
    keyHash: text('key_hash').notNull(),
    endpoint: text('endpoint').notNull(),
    responseTimeMs: integer('response_time_ms'),
    timestamp: integer('timestamp').notNull(),
}, (table) => ({
    idxKey: index('idx_api_usage_key').on(table.keyHash, table.timestamp),
}));

// ============================================================
// Phase 2: Intelligence Layer
// ============================================================

// AI Simulation results for intents
export const simulationResults = sqliteTable('simulation_results', {
    id: integer('id').primaryKey({ autoIncrement: true }),
    intentId: text('intent_id').notNull(),
    chainId: integer('chain_id').notNull(),

    // Route
    routeJson: text('route_json').notNull(),
    routeType: text('route_type').default('direct'),
    routeSteps: integer('route_steps').default(1),

    // Predictions
    predictedOutputUsd: real('predicted_output_usd').default(0),
    predictedGas: integer('predicted_gas').default(0),
    predictedGasCostUsd: real('predicted_gas_cost_usd').default(0),
    predictedSlippage: real('predicted_slippage').default(0),
    predictedProfitUsd: real('predicted_profit_usd').default(0),
    riskScore: integer('risk_score').default(50),
    confidence: real('confidence').default(0.5),

    // Risk
    riskFactors: text('risk_factors'),

    // AI
    aiModel: text('ai_model').default('gemini-2.0-flash'),
    aiReasoning: text('ai_reasoning'),
    aiTokensUsed: integer('ai_tokens_used').default(0),

    // Post-settlement accuracy
    actualOutputUsd: real('actual_output_usd'),
    actualGas: integer('actual_gas'),
    actualGasCostUsd: real('actual_gas_cost_usd'),
    predictionAccuracy: real('prediction_accuracy'),
    accuracyComputedAt: integer('accuracy_computed_at'),

    // Timing
    createdAt: integer('created_at').notNull(),
    simulationDurationMs: integer('simulation_duration_ms').default(0),
}, (table) => ({
    idxIntent: index('idx_sim_intent').on(table.intentId),
    idxChain: index('idx_sim_chain').on(table.chainId, table.createdAt),
    idxAccuracy: index('idx_sim_accuracy').on(table.predictionAccuracy),
}));

// AI-generated annotations and insights per intent
export const intentAnnotations = sqliteTable('intent_annotations', {
    id: integer('id').primaryKey({ autoIncrement: true }),
    intentId: text('intent_id').notNull(),
    chainId: integer('chain_id').notNull(),
    annotationType: text('annotation_type').notNull(),
    severity: text('severity').default('info'),
    title: text('title').notNull(),
    description: text('description').notNull(),
    metadata: text('metadata'),
    aiConfidence: real('ai_confidence').default(0.5),
    createdAt: integer('created_at').notNull(),
}, (table) => ({
    idxIntent: index('idx_annot_intent').on(table.intentId),
    idxType: index('idx_annot_type').on(table.annotationType, table.createdAt),
    idxSeverity: index('idx_annot_severity').on(table.severity, table.createdAt),
}));

// ══════════════════════════════════════════════════════════════
//  Admin Panel v2: Solver Labels & Identity
// ══════════════════════════════════════════════════════════════

export const solverLabels = sqliteTable('solver_labels', {
    address: text('address').primaryKey(),           // Wallet address (lowercase)
    label: text('label').notNull(),                  // Human name: "BarterSwap"
    category: text('category').default('solver'),    // solver/relayer/protocol/user/deployer
    logoUrl: text('logo_url'),
    website: text('website'),
    notes: text('notes'),
    createdAt: integer('created_at').default(sql`(strftime('%s', 'now'))`),
    updatedAt: integer('updated_at').default(sql`(strftime('%s', 'now'))`),
}, (table) => ({
    idxCategory: index('idx_solver_labels_category').on(table.category),
    idxLabel: index('idx_solver_labels_label').on(table.label),
}));

// ══════════════════════════════════════════════════════════════
//  Agent Autonomy: Autonomous Solver Agents
// ══════════════════════════════════════════════════════════════

export const agents = sqliteTable('agents', {
    id: text('id').primaryKey(),                     // UUID
    name: text('name').notNull(),
    strategy: text('strategy').notNull(),             // arbitrage, market_maker, liquidator, mev, custom
    walletAddress: text('wallet_address'),
    status: text('status').default('active'),         // active, paused, disabled
    apiKeyHash: text('api_key_hash'),                 // Links to API key owner
    maxGasPerTx: integer('max_gas_per_tx').default(500000),
    maxDailySpend: integer('max_daily_spend').default(100),  // USD
    allowedChains: text('allowed_chains'),            // JSON array string
    allowedIntentTypes: text('allowed_intent_types'), // JSON array string
    totalExecutions: integer('total_executions').default(0),
    successfulExecutions: integer('successful_executions').default(0),
    totalGasSpent: integer('total_gas_spent').default(0),
    createdAt: integer('created_at').default(sql`(strftime('%s', 'now'))`),
    lastActive: integer('last_active').default(sql`(strftime('%s', 'now'))`),
}, (table) => ({
    idxStatus: index('idx_agents_status').on(table.status),
    idxStrategy: index('idx_agents_strategy').on(table.strategy),
    idxApiKey: index('idx_agents_api_key').on(table.apiKeyHash),
}));

export const agentExecutions = sqliteTable('agent_executions', {
    id: text('id').primaryKey(),                     // UUID
    agentId: text('agent_id').notNull(),
    chainId: integer('chain_id').notNull(),
    intentType: text('intent_type').notNull(),
    params: text('params'),                           // JSON string
    status: text('status').notNull(),                 // simulated, submitted, confirmed, failed
    txHash: text('tx_hash'),
    gasUsed: integer('gas_used'),
    result: text('result'),                           // JSON string
    errorMessage: text('error_message'),
    createdAt: integer('created_at').default(sql`(strftime('%s', 'now'))`),
}, (table) => ({
    idxAgent: index('idx_agent_exec_agent').on(table.agentId, table.createdAt),
    idxStatus: index('idx_agent_exec_status').on(table.status),
    idxChain: index('idx_agent_exec_chain').on(table.chainId),
}));
