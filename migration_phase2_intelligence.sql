-- ============================================================
-- Phase 2 Migration: Intelligence Layer
-- Tables: simulation_results, intent_annotations
-- Run: npx wrangler d1 execute anomapay-db --remote --file=migration_phase2_intelligence.sql
-- ============================================================

-- AI simulation results for intents
CREATE TABLE IF NOT EXISTS simulation_results (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    intent_id TEXT NOT NULL,
    chain_id INTEGER NOT NULL,

    -- Route data
    route_json TEXT NOT NULL,                    -- JSON array of SolutionStep objects
    route_type TEXT DEFAULT 'direct',            -- direct/multi-hop/cross-chain/internal/arbitrage
    route_steps INTEGER DEFAULT 1,

    -- Predictions
    predicted_output_usd REAL DEFAULT 0,
    predicted_gas INTEGER DEFAULT 0,
    predicted_gas_cost_usd REAL DEFAULT 0,
    predicted_slippage REAL DEFAULT 0,           -- as percentage
    predicted_profit_usd REAL DEFAULT 0,         -- solver profit
    risk_score INTEGER DEFAULT 50,               -- 0-100 (0 = safe, 100 = dangerous)
    confidence REAL DEFAULT 0.5,                 -- 0-1

    -- Risk factors
    risk_factors TEXT,                           -- JSON array of strings

    -- AI reasoning
    ai_model TEXT DEFAULT 'gemini-2.0-flash',
    ai_reasoning TEXT,                           -- Full AI explanation
    ai_tokens_used INTEGER DEFAULT 0,

    -- Post-settlement accuracy (filled after settlement)
    actual_output_usd REAL,
    actual_gas INTEGER,
    actual_gas_cost_usd REAL,
    prediction_accuracy REAL,                   -- 0-1 computed after settlement
    accuracy_computed_at INTEGER,

    -- Timing
    created_at INTEGER NOT NULL,
    simulation_duration_ms INTEGER DEFAULT 0,

    FOREIGN KEY (intent_id) REFERENCES intent_lifecycle(id)
);

CREATE INDEX IF NOT EXISTS idx_sim_intent ON simulation_results(intent_id);
CREATE INDEX IF NOT EXISTS idx_sim_chain ON simulation_results(chain_id, created_at);
CREATE INDEX IF NOT EXISTS idx_sim_accuracy ON simulation_results(prediction_accuracy);
CREATE INDEX IF NOT EXISTS idx_sim_model ON simulation_results(ai_model, created_at);

-- AI-generated annotations and insights per intent
CREATE TABLE IF NOT EXISTS intent_annotations (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    intent_id TEXT NOT NULL,
    chain_id INTEGER NOT NULL,
    annotation_type TEXT NOT NULL,               -- mev_opportunity, batch_candidate, anomaly, insight, warning
    severity TEXT DEFAULT 'info',                -- info, warning, critical
    title TEXT NOT NULL,
    description TEXT NOT NULL,
    metadata TEXT,                               -- JSON with type-specific data
    ai_confidence REAL DEFAULT 0.5,
    created_at INTEGER NOT NULL,

    FOREIGN KEY (intent_id) REFERENCES intent_lifecycle(id)
);

CREATE INDEX IF NOT EXISTS idx_annot_intent ON intent_annotations(intent_id);
CREATE INDEX IF NOT EXISTS idx_annot_type ON intent_annotations(annotation_type, created_at);
CREATE INDEX IF NOT EXISTS idx_annot_severity ON intent_annotations(severity, created_at);
