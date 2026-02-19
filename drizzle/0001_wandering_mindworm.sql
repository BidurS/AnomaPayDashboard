CREATE TABLE `forwarder_calls` (
	`id` integer PRIMARY KEY AUTOINCREMENT NOT NULL,
	`chain_id` integer NOT NULL,
	`tx_hash` text NOT NULL,
	`block_number` integer NOT NULL,
	`untrusted_forwarder` text NOT NULL,
	`input` text NOT NULL,
	`output` text NOT NULL,
	`timestamp` integer DEFAULT (strftime('%s', 'now'))
);
--> statement-breakpoint
CREATE INDEX `idx_forwarder_calls_chain_time` ON `forwarder_calls` (`chain_id`,`timestamp`);--> statement-breakpoint
CREATE UNIQUE INDEX `uniq_chain_tx_forwarder` ON `forwarder_calls` (`chain_id`,`tx_hash`,`untrusted_forwarder`);