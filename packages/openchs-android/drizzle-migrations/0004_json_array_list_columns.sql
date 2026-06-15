ALTER TABLE `concept` ADD `answers` text DEFAULT '[]';--> statement-breakpoint
ALTER TABLE `report_card` ADD `standard_report_card_input_subject_types` text DEFAULT '[]';--> statement-breakpoint
ALTER TABLE `report_card` ADD `standard_report_card_input_programs` text DEFAULT '[]';--> statement-breakpoint
ALTER TABLE `report_card` ADD `standard_report_card_input_encounter_types` text DEFAULT '[]';--> statement-breakpoint
ALTER TABLE `task_type` ADD `metadata_search_fields` text DEFAULT '[]';--> statement-breakpoint
ALTER TABLE `attendance_record` ADD `reason_concept_uui_ds` text DEFAULT '[]';