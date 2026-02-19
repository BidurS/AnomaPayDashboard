CREATE TABLE `action_events` (
	`id` integer PRIMARY KEY AUTOINCREMENT NOT NULL,
	`chain_id` integer NOT NULL,
	`tx_hash` text NOT NULL,
	`block_number` integer NOT NULL,
	`action_tree_root` text NOT NULL,
	`action_tag_count` integer DEFAULT 0,
	`timestamp` integer DEFAULT (strftime('%s', 'now'))
);
--> statement-breakpoint
CREATE INDEX `idx_action_events_chain_time` ON `action_events` (`chain_id`,`timestamp`);--> statement-breakpoint
CREATE UNIQUE INDEX `uniq_chain_tx_action` ON `action_events` (`chain_id`,`tx_hash`);--> statement-breakpoint
CREATE TABLE `asset_flows` (
	`id` integer PRIMARY KEY AUTOINCREMENT NOT NULL,
	`chain_id` integer NOT NULL,
	`token_address` text NOT NULL,
	`token_symbol` text,
	`flow_in` text DEFAULT '0',
	`flow_out` text DEFAULT '0',
	`tx_count` integer DEFAULT 0,
	`last_updated` integer DEFAULT (strftime('%s', 'now'))
);
--> statement-breakpoint
CREATE INDEX `idx_asset_flows_chain` ON `asset_flows` (`chain_id`,`tx_count`);--> statement-breakpoint
CREATE UNIQUE INDEX `uniq_chain_token` ON `asset_flows` (`chain_id`,`token_address`);--> statement-breakpoint
CREATE TABLE `chains` (
	`id` integer PRIMARY KEY NOT NULL,
	`name` text NOT NULL,
	`rpc_url` text NOT NULL,
	`contract_address` text NOT NULL,
	`start_block` integer DEFAULT 0 NOT NULL,
	`explorer_url` text,
	`icon` text DEFAULT '🔗',
	`is_enabled` integer DEFAULT 1 NOT NULL,
	`created_at` integer DEFAULT (strftime('%s', 'now')),
	`updated_at` integer DEFAULT (strftime('%s', 'now'))
);
--> statement-breakpoint
CREATE TABLE `daily_stats` (
	`id` integer PRIMARY KEY AUTOINCREMENT NOT NULL,
	`chain_id` integer NOT NULL,
	`date` text NOT NULL,
	`intent_count` integer DEFAULT 0,
	`total_volume` text DEFAULT '0',
	`unique_solvers` integer DEFAULT 0,
	`total_gas_used` integer DEFAULT 0,
	`gas_saved` integer DEFAULT 0
);
--> statement-breakpoint
CREATE INDEX `idx_daily_stats_chain_date` ON `daily_stats` (`chain_id`,`date`);--> statement-breakpoint
CREATE UNIQUE INDEX `uniq_chain_date` ON `daily_stats` (`chain_id`,`date`);--> statement-breakpoint
CREATE TABLE `events` (
	`id` integer PRIMARY KEY AUTOINCREMENT NOT NULL,
	`chain_id` integer NOT NULL,
	`tx_hash` text NOT NULL,
	`block_number` integer NOT NULL,
	`event_type` text NOT NULL,
	`solver_address` text,
	`value_wei` text DEFAULT '0',
	`gas_used` integer,
	`gas_price_wei` text DEFAULT '0',
	`data_json` text NOT NULL,
	`decoded_input` text,
	`primary_payload_type` text,
	`timestamp` integer DEFAULT (strftime('%s', 'now'))
);
--> statement-breakpoint
CREATE INDEX `idx_events_chain_time` ON `events` (`chain_id`,`timestamp`);--> statement-breakpoint
CREATE INDEX `idx_events_solver` ON `events` (`chain_id`,`solver_address`);--> statement-breakpoint
CREATE UNIQUE INDEX `uniq_chain_tx` ON `events` (`chain_id`,`tx_hash`);--> statement-breakpoint
CREATE TABLE `payloads` (
	`id` integer PRIMARY KEY AUTOINCREMENT NOT NULL,
	`chain_id` integer NOT NULL,
	`tx_hash` text NOT NULL,
	`block_number` integer NOT NULL,
	`tag` text,
	`payload_type` text NOT NULL,
	`payload_index` integer NOT NULL,
	`blob` text,
	`timestamp` integer DEFAULT (strftime('%s', 'now'))
);
--> statement-breakpoint
CREATE INDEX `idx_payloads_chain_type` ON `payloads` (`chain_id`,`payload_type`);--> statement-breakpoint
CREATE INDEX `idx_payloads_chain_time` ON `payloads` (`chain_id`,`timestamp`);--> statement-breakpoint
CREATE INDEX `idx_payloads_tag` ON `payloads` (`chain_id`,`tag`);--> statement-breakpoint
CREATE UNIQUE INDEX `uniq_chain_tx_index` ON `payloads` (`chain_id`,`tx_hash`,`payload_type`,`payload_index`);--> statement-breakpoint
CREATE TABLE `privacy_states` (
	`id` integer PRIMARY KEY AUTOINCREMENT NOT NULL,
	`chain_id` integer NOT NULL,
	`block_number` integer NOT NULL,
	`root_hash` text NOT NULL,
	`commitment_count` text DEFAULT '0',
	`nullifier_count` text DEFAULT '0',
	`timestamp` integer NOT NULL,
	`estimated_pool_size` integer DEFAULT 0
);
--> statement-breakpoint
CREATE INDEX `idx_privacy_states_chain_block` ON `privacy_states` (`chain_id`,`block_number`);--> statement-breakpoint
CREATE UNIQUE INDEX `uniq_chain_root` ON `privacy_states` (`chain_id`,`root_hash`);--> statement-breakpoint
CREATE TABLE `solvers` (
	`id` integer PRIMARY KEY AUTOINCREMENT NOT NULL,
	`chain_id` integer NOT NULL,
	`address` text NOT NULL,
	`tx_count` integer DEFAULT 0,
	`total_gas_spent` text DEFAULT '0',
	`total_value_processed` text DEFAULT '0',
	`first_seen` integer,
	`last_seen` integer
);
--> statement-breakpoint
CREATE INDEX `idx_solvers_chain_count` ON `solvers` (`chain_id`,`tx_count`);--> statement-breakpoint
CREATE UNIQUE INDEX `uniq_chain_solver` ON `solvers` (`chain_id`,`address`);--> statement-breakpoint
CREATE TABLE `sync_state` (
	`chain_id` integer PRIMARY KEY NOT NULL,
	`last_block` integer NOT NULL,
	`updated_at` integer DEFAULT (strftime('%s', 'now'))
);
--> statement-breakpoint
CREATE TABLE `token_transfers` (
	`id` integer PRIMARY KEY AUTOINCREMENT NOT NULL,
	`chain_id` integer NOT NULL,
	`tx_hash` text NOT NULL,
	`block_number` integer NOT NULL,
	`token_address` text NOT NULL,
	`token_symbol` text DEFAULT 'UNKNOWN',
	`token_decimals` integer DEFAULT 18,
	`from_address` text NOT NULL,
	`to_address` text NOT NULL,
	`amount_raw` text NOT NULL,
	`amount_display` real DEFAULT 0,
	`amount_usd` real DEFAULT 0,
	`timestamp` integer DEFAULT (strftime('%s', 'now'))
);
--> statement-breakpoint
CREATE INDEX `idx_token_transfers_chain_time` ON `token_transfers` (`chain_id`,`timestamp`);--> statement-breakpoint
CREATE INDEX `idx_token_transfers_token` ON `token_transfers` (`chain_id`,`token_address`);--> statement-breakpoint
CREATE INDEX `idx_token_transfers_tx` ON `token_transfers` (`chain_id`,`tx_hash`);--> statement-breakpoint
CREATE UNIQUE INDEX `uniq_chain_tx_token` ON `token_transfers` (`chain_id`,`tx_hash`,`token_address`,`from_address`,`to_address`);