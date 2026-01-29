DROP TABLE IF EXISTS events;
DROP TABLE IF EXISTS sync_state;

CREATE TABLE events (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  chain_id INTEGER NOT NULL,
  tx_hash TEXT NOT NULL,
  block_number INTEGER NOT NULL,
  event_type TEXT NOT NULL,
  data_json TEXT NOT NULL, -- Storing parsed event args as JSON
  timestamp INTEGER DEFAULT (strftime('%s', 'now')),
  CONSTRAINT uniq_chain_tx UNIQUE (chain_id, tx_hash)
);

CREATE TABLE sync_state (
  chain_id INTEGER PRIMARY KEY,
  last_block INTEGER NOT NULL,
  updated_at INTEGER DEFAULT (strftime('%s', 'now'))
);

-- Index for fast querying by chain and time
CREATE INDEX idx_events_chain_time ON events(chain_id, timestamp DESC);

-- Admin-managed chain configuration
CREATE TABLE chains (
  id INTEGER PRIMARY KEY, -- Chain ID (e.g., 8453 for Base)
  name TEXT NOT NULL,
  rpc_url TEXT NOT NULL,
  contract_address TEXT NOT NULL,
  start_block INTEGER NOT NULL DEFAULT 0,
  explorer_url TEXT,
  icon TEXT DEFAULT '🔗',
  is_enabled INTEGER NOT NULL DEFAULT 1, -- 1 = active, 0 = disabled
  created_at INTEGER DEFAULT (strftime('%s', 'now')),
  updated_at INTEGER DEFAULT (strftime('%s', 'now'))
);

-- Seed Base chain as default
INSERT INTO chains (id, name, rpc_url, contract_address, start_block, explorer_url, icon, is_enabled)
VALUES (8453, 'Base', 'https://base-mainnet.g.alchemy.com/v2/YOUR_API_KEY', '0x9ed43c229480659bf6b6607c46d7b96c6d760cbb', 24000000, 'https://basescan.org', '🔵', 1);
