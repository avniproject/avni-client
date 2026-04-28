CREATE INDEX `idx_address_level_parent_uuid` ON `address_level` (`parent_uuid`);--> statement-breakpoint
CREATE INDEX `idx_address_level_type_uuid` ON `address_level` (`type_uuid`);--> statement-breakpoint
CREATE INDEX `idx_individual_registration_date` ON `individual` (`registration_date`);--> statement-breakpoint
CREATE INDEX `idx_program_enrolment_enrolment_date_time` ON `program_enrolment` (`enrolment_date_time`);--> statement-breakpoint
CREATE INDEX `idx_encounter_encounter_date_time` ON `encounter` (`encounter_date_time`);--> statement-breakpoint
CREATE INDEX `idx_location_hierarchy_parent_uuid` ON `location_hierarchy` (`parent_uuid`);--> statement-breakpoint
CREATE INDEX `idx_location_hierarchy_type_uuid` ON `location_hierarchy` (`type_uuid`);