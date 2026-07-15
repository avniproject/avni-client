CREATE TABLE `downloadable_content` (
	`uuid` text PRIMARY KEY NOT NULL,
	`name` text,
	`category` text,
	`content_key` text,
	`sha256` text,
	`needs_key` integer DEFAULT 0,
	`payload` text,
	`voided` integer DEFAULT 0
);
--> statement-breakpoint
CREATE INDEX `idx_downloadable_content_voided` ON `downloadable_content` (`voided`);--> statement-breakpoint
ALTER TABLE `attendance_record` ADD `other_reason_text` text;