-- Phase 3: Developer Portal — API Key & Usage Tables
-- Run: npx wrangler d1 execute anomapay-db --remote --file=./migration_phase3_devportal.sql

-- API Keys table (matches schema.ts apiKeys definition)
CREATE TABLE IF NOT EXISTS api_keys (
  key_hash TEXT PRIMARY KEY,
  user_id TEXT NOT NULL,
  name TEXT NOT NULL,
  tier TEXT DEFAULT 'free',
  rate_limit INTEGER DEFAULT 100,
  daily_limit INTEGER DEFAULT 10000,
  created_at INTEGER NOT NULL,
  last_used INTEGER,
  is_active INTEGER DEFAULT 1
);

-- API Usage tracking
CREATE TABLE IF NOT EXISTS api_usage (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  key_hash TEXT NOT NULL,
  endpoint TEXT NOT NULL,
  response_time_ms INTEGER,
  timestamp INTEGER NOT NULL,
  FOREIGN KEY (key_hash) REFERENCES api_keys(key_hash)
);

-- Index for fast usage lookups
CREATE INDEX IF NOT EXISTS idx_api_usage_key ON api_usage (key_hash, timestamp);
CREATE INDEX IF NOT EXISTS idx_api_usage_endpoint ON api_usage (endpoint, timestamp);
CREATE INDEX IF NOT EXISTS idx_api_keys_user ON api_keys (user_id);
CREATE INDEX IF NOT EXISTS idx_api_keys_active ON api_keys (is_active);
