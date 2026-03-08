-- Migration: Agent Autonomy Tables
-- Run against anomapay-explorer D1 database

CREATE TABLE IF NOT EXISTS agents (
    id TEXT PRIMARY KEY,
    name TEXT NOT NULL,
    strategy TEXT NOT NULL,
    wallet_address TEXT,
    status TEXT DEFAULT 'active',
    api_key_hash TEXT,
    max_gas_per_tx INTEGER DEFAULT 500000,
    max_daily_spend INTEGER DEFAULT 100,
    allowed_chains TEXT,
    allowed_intent_types TEXT,
    total_executions INTEGER DEFAULT 0,
    successful_executions INTEGER DEFAULT 0,
    total_gas_spent INTEGER DEFAULT 0,
    created_at INTEGER DEFAULT (strftime('%s', 'now')),
    last_active INTEGER DEFAULT (strftime('%s', 'now'))
);

CREATE INDEX IF NOT EXISTS idx_agents_status ON agents(status);
CREATE INDEX IF NOT EXISTS idx_agents_strategy ON agents(strategy);
CREATE INDEX IF NOT EXISTS idx_agents_api_key ON agents(api_key_hash);

CREATE TABLE IF NOT EXISTS agent_executions (
    id TEXT PRIMARY KEY,
    agent_id TEXT NOT NULL,
    chain_id INTEGER NOT NULL,
    intent_type TEXT NOT NULL,
    params TEXT,
    status TEXT NOT NULL,
    tx_hash TEXT,
    gas_used INTEGER,
    result TEXT,
    error_message TEXT,
    created_at INTEGER DEFAULT (strftime('%s', 'now'))
);

CREATE INDEX IF NOT EXISTS idx_agent_exec_agent ON agent_executions(agent_id, created_at);
CREATE INDEX IF NOT EXISTS idx_agent_exec_status ON agent_executions(status);
CREATE INDEX IF NOT EXISTS idx_agent_exec_chain ON agent_executions(chain_id);
