CREATE TABLE `calendar` (
	`uuid` text PRIMARY KEY NOT NULL,
	`name` text,
	`working_pattern` text DEFAULT '{"mon":"all","tue":"all","wed":"all","thu":"all","fri":"all","sat":"none","sun":"none"}',
	`address_level_uuid` text,
	`is_default` integer DEFAULT 0,
	`voided` integer DEFAULT 0,
	`created_by` text,
	`created_by_uuid` text,
	`last_modified_by` text,
	`last_modified_by_uuid` text
);
--> statement-breakpoint
CREATE INDEX `idx_calendar_voided` ON `calendar` (`voided`);--> statement-breakpoint
CREATE TABLE `calendar_date_marker` (
	`uuid` text PRIMARY KEY NOT NULL,
	`calendar_uuid` text,
	`marker_date` text,
	`name` text,
	`is_working` integer DEFAULT 0,
	`voided` integer DEFAULT 0,
	`created_by` text,
	`created_by_uuid` text,
	`last_modified_by` text,
	`last_modified_by_uuid` text
);
--> statement-breakpoint
CREATE INDEX `idx_calendar_date_marker_voided` ON `calendar_date_marker` (`voided`);--> statement-breakpoint
CREATE TABLE `attendance_type` (
	`uuid` text PRIMARY KEY NOT NULL,
	`subject_type_uuid` text,
	`name` text,
	`sort_order` integer DEFAULT 0,
	`config` text DEFAULT '{}',
	`voided` integer DEFAULT 0,
	`created_by` text,
	`created_by_uuid` text,
	`last_modified_by` text,
	`last_modified_by_uuid` text
);
--> statement-breakpoint
CREATE INDEX `idx_attendance_type_voided` ON `attendance_type` (`voided`);--> statement-breakpoint
CREATE TABLE `session` (
	`uuid` text PRIMARY KEY NOT NULL,
	`group_subject_uuid` text,
	`scheduled_date` text,
	`attendance_type_uuid` text,
	`status` text,
	`reason_concept_uuid` text,
	`notes` text,
	`marked_by_user_name` text,
	`marked_at` integer,
	`voided` integer DEFAULT 0,
	`created_by` text,
	`created_by_uuid` text,
	`last_modified_by` text,
	`last_modified_by_uuid` text
);
--> statement-breakpoint
CREATE INDEX `idx_session_voided` ON `session` (`voided`);--> statement-breakpoint
CREATE TABLE `attendance_record` (
	`uuid` text PRIMARY KEY NOT NULL,
	`session_uuid` text,
	`subject_uuid` text,
	`status` text,
	`follow_up_encounter_uuid` text,
	`needs_follow_up` integer DEFAULT 0,
	`voided` integer DEFAULT 0,
	`created_by` text,
	`created_by_uuid` text,
	`last_modified_by` text,
	`last_modified_by_uuid` text
);
--> statement-breakpoint
CREATE INDEX `idx_attendance_record_voided` ON `attendance_record` (`voided`);--> statement-breakpoint
ALTER TABLE `form` ADD `share_rule` text;--> statement-breakpoint
ALTER TABLE `form` ADD `share_template_s3_key` text;--> statement-breakpoint
ALTER TABLE `form` ADD `share_translations` text;--> statement-breakpoint
ALTER TABLE `subject_type` ADD `attendance_enabled` integer DEFAULT 0;--> statement-breakpoint
ALTER TABLE `group_subject` ADD `removal_reason_concept_uuid` text;--> statement-breakpoint
ALTER TABLE `custom_card_config` ADD `translations` text;--> statement-breakpoint
ALTER TABLE `report_card` ADD `action_detail_attendance_type_uuid` text REFERENCES attendance_type(uuid);--> statement-breakpoint
CREATE INDEX `idx_report_card_action_detail_attendance_type_uuid` ON `report_card` (`action_detail_attendance_type_uuid`);