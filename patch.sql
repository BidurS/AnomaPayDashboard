CREATE TABLE `action_events` (
	`id` integer PRIMARY KEY AUTOINCREMENT NOT NULL,
	`chain_id` integer NOT NULL,
	`tx_hash` text NOT NULL,
	`block_number` integer NOT NULL,
	`action_tree_root` text NOT NULL,
	`action_tag_count` integer DEFAULT 0,
	`timestamp` integer DEFAULT (strftime('%s', 'now'))
);
CREATE INDEX `idx_action_events_chain_time` ON `action_events` (`chain_id`,`timestamp`);
CREATE UNIQUE INDEX `uniq_chain_tx_action` ON `action_events` (`chain_id`,`tx_hash`);
