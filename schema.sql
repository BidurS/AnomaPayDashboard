DROP TABLE IF EXISTS events;
DROP TABLE IF EXISTS sync_state;
DROP TABLE IF EXISTS chains;
DROP TABLE IF EXISTS solvers;
DROP TABLE IF EXISTS daily_stats;
DROP TABLE IF EXISTS asset_flows;
DROP TABLE IF EXISTS privacy_pool_stats;
DROP TABLE IF EXISTS payloads;
DROP TABLE IF EXISTS token_transfers;

-- Core events table for all indexed transactions
CREATE TABLE events (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  chain_id INTEGER NOT NULL,
  tx_hash TEXT NOT NULL,
  block_number INTEGER NOT NULL,
  event_type TEXT NOT NULL,
  solver_address TEXT,
  value_wei TEXT DEFAULT '0', -- Raw BigInt string
  gas_used INTEGER,
  gas_price_wei TEXT DEFAULT '0',
  data_json TEXT NOT NULL,
  decoded_input TEXT, -- JSON string of decoded input
  timestamp INTEGER DEFAULT (strftime('%s', 'now')),
  CONSTRAINT uniq_chain_tx UNIQUE (chain_id, tx_hash)
);

-- Sync state for smart indexing
CREATE TABLE sync_state (
  chain_id INTEGER PRIMARY KEY,
  last_block INTEGER NOT NULL,
  updated_at INTEGER DEFAULT (strftime('%s', 'now'))
);

-- Chain configuration
CREATE TABLE chains (
  id INTEGER PRIMARY KEY,
  name TEXT NOT NULL,
  rpc_url TEXT NOT NULL,
  contract_address TEXT NOT NULL,
  start_block INTEGER NOT NULL DEFAULT 0,
  explorer_url TEXT,
  icon TEXT DEFAULT '🔗',
  is_enabled INTEGER NOT NULL DEFAULT 1,
  created_at INTEGER DEFAULT (strftime('%s', 'now')),
  updated_at INTEGER DEFAULT (strftime('%s', 'now'))
);

-- Solver leaderboard
CREATE TABLE solvers (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  chain_id INTEGER NOT NULL,
  address TEXT NOT NULL,
  tx_count INTEGER DEFAULT 0,
  total_gas_spent TEXT DEFAULT '0', -- Raw BigInt string
  total_value_processed TEXT DEFAULT '0', -- Raw BigInt string
  first_seen INTEGER,
  last_seen INTEGER,
  CONSTRAINT uniq_chain_solver UNIQUE (chain_id, address)
);

-- Daily aggregated stats
CREATE TABLE daily_stats (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  chain_id INTEGER NOT NULL,
  date TEXT NOT NULL,
  intent_count INTEGER DEFAULT 0,
  total_volume TEXT DEFAULT '0', -- Raw BigInt string
  unique_solvers INTEGER DEFAULT 0,
  total_gas_used INTEGER DEFAULT 0,
  gas_saved INTEGER DEFAULT 0,
  CONSTRAINT uniq_chain_date UNIQUE (chain_id, date)
);

-- Asset flows for token tracking
CREATE TABLE asset_flows (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  chain_id INTEGER NOT NULL,
  token_address TEXT NOT NULL,
  token_symbol TEXT,
  flow_in TEXT DEFAULT '0', -- Raw BigInt string
  flow_out TEXT DEFAULT '0', -- Raw BigInt string
  tx_count INTEGER DEFAULT 0,
  last_updated INTEGER DEFAULT (strftime('%s', 'now')),
  CONSTRAINT uniq_chain_token UNIQUE (chain_id, token_address)
);

-- Privacy Pulse: Track CommitmentTreeRootAdded events and pool growth
CREATE TABLE privacy_pool_stats (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  chain_id INTEGER NOT NULL,
  block_number INTEGER NOT NULL,
  root_hash TEXT NOT NULL,
  timestamp INTEGER NOT NULL,
  estimated_pool_size INTEGER DEFAULT 0,  -- Cumulative shielded actions
  CONSTRAINT uniq_chain_root UNIQUE (chain_id, root_hash)
);

-- Payloads: specific intent data from Anoma Protocol
CREATE TABLE payloads (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  chain_id INTEGER NOT NULL,
  tx_hash TEXT NOT NULL,
  block_number INTEGER NOT NULL,
  payload_type TEXT NOT NULL, -- Resource, Discovery, External, Application
  payload_index INTEGER NOT NULL,
  blob TEXT, -- The actual data blob (hex)
  timestamp INTEGER DEFAULT (strftime('%s', 'now')),
  CONSTRAINT uniq_chain_tx_index UNIQUE (chain_id, tx_hash, payload_type, payload_index)
);

-- Indexes
CREATE INDEX idx_events_chain_time ON events(chain_id, timestamp DESC);
CREATE INDEX idx_events_solver ON events(chain_id, solver_address);
CREATE INDEX idx_solvers_chain_count ON solvers(chain_id, tx_count DESC);
CREATE INDEX idx_daily_stats_chain_date ON daily_stats(chain_id, date DESC);
CREATE INDEX idx_asset_flows_chain ON asset_flows(chain_id, tx_count DESC);
CREATE INDEX idx_privacy_pool_chain_block ON privacy_pool_stats(chain_id, block_number DESC);
CREATE INDEX idx_payloads_chain_type ON payloads(chain_id, payload_type);
CREATE INDEX idx_payloads_chain_time ON payloads(chain_id, timestamp DESC);

-- Token transfers for multi-asset tracking
CREATE TABLE token_transfers (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  chain_id INTEGER NOT NULL,
  tx_hash TEXT NOT NULL,
  block_number INTEGER NOT NULL,
  token_address TEXT NOT NULL,
  token_symbol TEXT DEFAULT 'UNKNOWN',
  token_decimals INTEGER DEFAULT 18,
  from_address TEXT NOT NULL,
  to_address TEXT NOT NULL,
  amount_raw TEXT NOT NULL,     -- Raw amount string
  amount_display REAL DEFAULT 0, -- Human-readable (amount / 10^decimals)
  amount_usd REAL DEFAULT 0,    -- USD value at time of tx
  timestamp INTEGER DEFAULT (strftime('%s', 'now')),
  CONSTRAINT uniq_chain_tx_token UNIQUE (chain_id, tx_hash, token_address, from_address, to_address)
);

CREATE INDEX idx_token_transfers_chain_time ON token_transfers(chain_id, timestamp DESC);
CREATE INDEX idx_token_transfers_token ON token_transfers(chain_id, token_address);
CREATE INDEX idx_token_transfers_tx ON token_transfers(chain_id, tx_hash);

-- Seed Base chain
INSERT INTO chains (id, name, rpc_url, contract_address, start_block, explorer_url, icon, is_enabled)
VALUES (8453, 'Base', 'https://base-mainnet.g.alchemy.com/v2/ZqhzKnOk-vuf5jZa42Idv', '0x9ed43c229480659bf6b6607c46d7b96c6d760cbb', 39561457, 'https://basescan.org', '🔵', 1);
