-- Phase 3: Real-time Event Streaming
-- Creates realtime_events table for SSE event buffer

CREATE TABLE IF NOT EXISTS realtime_events (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  event_type TEXT NOT NULL,       -- 'intent_created', 'intent_settled', 'solver_matched', 'simulation_complete'
  chain_id INTEGER NOT NULL,
  payload TEXT NOT NULL,          -- JSON blob
  created_at INTEGER NOT NULL
);

CREATE INDEX IF NOT EXISTS idx_rt_events_time ON realtime_events(created_at DESC);
CREATE INDEX IF NOT EXISTS idx_rt_events_type ON realtime_events(event_type, created_at DESC);

-- Cleanup: auto-purge events older than 24 hours (called from cron)
-- DELETE FROM realtime_events WHERE created_at < (strftime('%s','now') - 86400);
