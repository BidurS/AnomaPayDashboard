-- ============================================================
-- Phase 1: Intent Lifecycle Engine Migration
-- AnomaScan Multi-Chain Observability Platform
-- ============================================================

-- 1. Intent Lifecycle — full lifecycle tracking for every intent
CREATE TABLE IF NOT EXISTS `intent_lifecycle` (
    `id` text PRIMARY KEY NOT NULL,                       -- chainId:txHash:logIndex
    `chain_id` integer NOT NULL,
    `status` text NOT NULL DEFAULT 'settled',              -- pending/matched/settling/settled/failed/expired
    `intent_type` text NOT NULL DEFAULT 'unknown',         -- swap/transfer/bridge/stake/resource/discovery/external/application
    `creator` text,                                        -- Solver/submitter address
    `solver` text,                                         -- Solver address (from events table)

    -- ARM Resource Model
    `consumed_resources` text,                             -- JSON: [{label, quantity, denomination}]
    `created_resources` text,                              -- JSON: [{label, quantity, denomination}]
    `action_tree_root` text,                               -- Root hash from ActionExecuted event
    `tag_count` integer DEFAULT 0,                         -- Number of tags in this intent

    -- Financial
    `input_value_usd` real DEFAULT 0,
    `output_value_usd` real DEFAULT 0,
    `solver_profit_usd` real DEFAULT 0,
    `gas_cost_usd` real DEFAULT 0,
    `gas_used` integer DEFAULT 0,
    `gas_price_wei` text DEFAULT '0',

    -- Privacy
    `is_shielded` integer DEFAULT 0,
    `commitment_root` text,
    `nullifier_count` integer DEFAULT 0,

    -- Cross-chain
    `is_multi_chain` integer DEFAULT 0,
    `correlation_id` text,

    -- Payloads summary
    `payload_types` text,                                  -- JSON array: ["Resource", "Discovery"]
    `payload_count` integer DEFAULT 0,
    `has_forwarder_calls` integer DEFAULT 0,

    -- Timing
    `created_at` integer NOT NULL,
    `matched_at` integer,
    `settled_at` integer,
    `expires_at` integer,
    `settlement_time_ms` integer,                          -- matched_at - created_at (when both available)

    -- Raw data
    `tx_hash` text NOT NULL,
    `block_number` integer NOT NULL,
    `value_wei` text DEFAULT '0',
    `raw_data_json` text,

    FOREIGN KEY (`chain_id`) REFERENCES `chains`(`id`)
);

CREATE INDEX IF NOT EXISTS `idx_lifecycle_status` ON `intent_lifecycle`(`status`, `created_at`);
CREATE INDEX IF NOT EXISTS `idx_lifecycle_solver` ON `intent_lifecycle`(`solver`, `settled_at`);
CREATE INDEX IF NOT EXISTS `idx_lifecycle_type` ON `intent_lifecycle`(`intent_type`, `chain_id`);
CREATE INDEX IF NOT EXISTS `idx_lifecycle_chain_time` ON `intent_lifecycle`(`chain_id`, `created_at`);
CREATE INDEX IF NOT EXISTS `idx_lifecycle_correlation` ON `intent_lifecycle`(`correlation_id`);
CREATE INDEX IF NOT EXISTS `idx_lifecycle_tx` ON `intent_lifecycle`(`chain_id`, `tx_hash`);

-- 2. Lifecycle Events — state transition audit log
CREATE TABLE IF NOT EXISTS `lifecycle_events` (
    `id` integer PRIMARY KEY AUTOINCREMENT NOT NULL,
    `intent_id` text NOT NULL,
    `from_status` text NOT NULL,
    `to_status` text NOT NULL,
    `triggered_by` text,                                   -- solver address or 'system'
    `metadata` text,                                       -- JSON with transition-specific data
    `timestamp` integer NOT NULL,
    FOREIGN KEY (`intent_id`) REFERENCES `intent_lifecycle`(`id`)
);

CREATE INDEX IF NOT EXISTS `idx_lifecycle_events_intent` ON `lifecycle_events`(`intent_id`, `timestamp`);

-- 3. Solver Economics — daily P&L per solver
CREATE TABLE IF NOT EXISTS `solver_economics` (
    `id` integer PRIMARY KEY AUTOINCREMENT NOT NULL,
    `solver_address` text NOT NULL,
    `chain_id` integer NOT NULL,
    `period` text NOT NULL,                                -- YYYY-MM-DD
    `intents_solved` integer DEFAULT 0,
    `intents_failed` integer DEFAULT 0,
    `total_revenue_usd` real DEFAULT 0,
    `total_gas_cost_usd` real DEFAULT 0,
    `net_profit_usd` real DEFAULT 0,
    `avg_settlement_time_ms` integer DEFAULT 0,
    `avg_batch_size` real DEFAULT 1,
    `success_rate` real DEFAULT 1.0,
    `intent_types_json` text,                              -- JSON: {"swap": 5, "bridge": 2}
    UNIQUE(`solver_address`, `chain_id`, `period`)
);

CREATE INDEX IF NOT EXISTS `idx_solver_econ_address` ON `solver_economics`(`solver_address`, `period`);
CREATE INDEX IF NOT EXISTS `idx_solver_econ_chain` ON `solver_economics`(`chain_id`, `period`);

-- 4. Cross-chain Correlations
CREATE TABLE IF NOT EXISTS `cross_chain_correlations` (
    `correlation_id` text PRIMARY KEY NOT NULL,
    `intent_ids` text NOT NULL,                            -- JSON array of intent IDs
    `correlation_type` text NOT NULL,                      -- bridge/atomic_swap/chimera
    `confidence` real DEFAULT 0,
    `total_value_usd` real DEFAULT 0,
    `chains` text NOT NULL,                                -- JSON array of chain IDs
    `status` text DEFAULT 'in_progress',                   -- in_progress/completed/partial_failure
    `started_at` integer NOT NULL,
    `completed_at` integer
);

-- 5. API Keys for developer access
CREATE TABLE IF NOT EXISTS `api_keys` (
    `key_hash` text PRIMARY KEY NOT NULL,
    `user_id` text NOT NULL,
    `name` text NOT NULL,
    `tier` text DEFAULT 'free',                            -- free/pro/enterprise
    `rate_limit` integer DEFAULT 100,                      -- requests per minute
    `daily_limit` integer DEFAULT 10000,
    `created_at` integer NOT NULL,
    `last_used` integer,
    `is_active` integer DEFAULT 1
);

-- 6. API Usage tracking
CREATE TABLE IF NOT EXISTS `api_usage` (
    `id` integer PRIMARY KEY AUTOINCREMENT NOT NULL,
    `key_hash` text NOT NULL,
    `endpoint` text NOT NULL,
    `response_time_ms` integer,
    `timestamp` integer NOT NULL,
    FOREIGN KEY (`key_hash`) REFERENCES `api_keys`(`key_hash`)
);

CREATE INDEX IF NOT EXISTS `idx_api_usage_key` ON `api_usage`(`key_hash`, `timestamp`);
