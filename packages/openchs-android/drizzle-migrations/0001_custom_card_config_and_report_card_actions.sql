CREATE TABLE `custom_card_config` (
	`uuid` text PRIMARY KEY NOT NULL,
	`name` text,
	`html_file_s3_key` text,
	`data_rule` text,
	`voided` integer DEFAULT 0
);
--> statement-breakpoint
CREATE INDEX `idx_custom_card_config_voided` ON `custom_card_config` (`voided`);--> statement-breakpoint
ALTER TABLE `report_card` ADD `action` text;--> statement-breakpoint
ALTER TABLE `report_card` ADD `action_detail_subject_type_uuid` text REFERENCES subject_type(uuid);--> statement-breakpoint
ALTER TABLE `report_card` ADD `action_detail_program_uuid` text REFERENCES program(uuid);--> statement-breakpoint
ALTER TABLE `report_card` ADD `action_detail_encounter_type_uuid` text REFERENCES encounter_type(uuid);--> statement-breakpoint
ALTER TABLE `report_card` ADD `action_detail_visit_type` text;--> statement-breakpoint
ALTER TABLE `report_card` ADD `on_action_completion` text;--> statement-breakpoint
ALTER TABLE `report_card` ADD `custom_card_config_uuid` text REFERENCES custom_card_config(uuid);--> statement-breakpoint
CREATE INDEX `idx_report_card_action_detail_subject_type_uuid` ON `report_card` (`action_detail_subject_type_uuid`);--> statement-breakpoint
CREATE INDEX `idx_report_card_action_detail_program_uuid` ON `report_card` (`action_detail_program_uuid`);--> statement-breakpoint
CREATE INDEX `idx_report_card_action_detail_encounter_type_uuid` ON `report_card` (`action_detail_encounter_type_uuid`);--> statement-breakpoint
CREATE INDEX `idx_report_card_custom_card_config_uuid` ON `report_card` (`custom_card_config_uuid`);