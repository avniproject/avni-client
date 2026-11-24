CREATE TABLE `dashboard_filter` (
	`uuid` text PRIMARY KEY NOT NULL,
	`dashboard_uuid` text,
	`name` text,
	`filter_config` text,
	`voided` integer DEFAULT 0,
	FOREIGN KEY (`dashboard_uuid`) REFERENCES `dashboard`(`uuid`) ON UPDATE no action ON DELETE no action
);
--> statement-breakpoint
CREATE INDEX `idx_dashboard_filter_dashboard_uuid` ON `dashboard_filter` (`dashboard_uuid`);--> statement-breakpoint
CREATE INDEX `idx_dashboard_filter_voided` ON `dashboard_filter` (`voided`);--> statement-breakpoint
CREATE TABLE `locale_mapping` (
	`uuid` text PRIMARY KEY NOT NULL,
	`locale` text,
	`display_text` text
);
--> statement-breakpoint
CREATE TABLE `settings` (
	`uuid` text PRIMARY KEY NOT NULL,
	`server_url` text,
	`locale_uuid` text,
	`log_level` integer,
	`page_size` integer,
	`pool_id` text,
	`client_id` text,
	`idp_type` text,
	`keycloak_auth_server_url` text,
	`keycloak_client_id` text,
	`keycloak_scope` text,
	`keycloak_grant_type` text,
	`keycloak_realm` text,
	`dev_skip_validation` integer DEFAULT 0,
	`capture_location` integer DEFAULT 1,
	`user_id` text,
	`access_token` text,
	`refresh_token` text,
	FOREIGN KEY (`locale_uuid`) REFERENCES `locale_mapping`(`uuid`) ON UPDATE no action ON DELETE no action
);
--> statement-breakpoint
CREATE INDEX `idx_settings_locale_uuid` ON `settings` (`locale_uuid`);--> statement-breakpoint
CREATE TABLE `concept_answer` (
	`uuid` text PRIMARY KEY NOT NULL,
	`concept_uuid` text,
	`answer_order` real,
	`abnormal` integer,
	`unique` integer,
	`voided` integer DEFAULT 0,
	FOREIGN KEY (`concept_uuid`) REFERENCES `concept`(`uuid`) ON UPDATE no action ON DELETE no action
);
--> statement-breakpoint
CREATE INDEX `idx_concept_answer_concept_uuid` ON `concept_answer` (`concept_uuid`);--> statement-breakpoint
CREATE INDEX `idx_concept_answer_voided` ON `concept_answer` (`voided`);--> statement-breakpoint
CREATE TABLE `concept` (
	`uuid` text PRIMARY KEY NOT NULL,
	`name` text,
	`datatype` text,
	`low_absolute` real,
	`hi_absolute` real,
	`low_normal` real,
	`hi_normal` real,
	`unit` text,
	`key_values` text DEFAULT '[]',
	`voided` integer DEFAULT 0,
	`media` text DEFAULT '[]'
);
--> statement-breakpoint
CREATE INDEX `idx_concept_voided` ON `concept` (`voided`);--> statement-breakpoint
CREATE TABLE `encounter_type` (
	`uuid` text PRIMARY KEY NOT NULL,
	`name` text,
	`operational_encounter_type_name` text,
	`display_name` text,
	`voided` integer DEFAULT 0,
	`encounter_eligibility_check_rule` text,
	`active` integer DEFAULT 1,
	`immutable` integer DEFAULT 0
);
--> statement-breakpoint
CREATE INDEX `idx_encounter_type_voided` ON `encounter_type` (`voided`);--> statement-breakpoint
CREATE TABLE `gender` (
	`uuid` text PRIMARY KEY NOT NULL,
	`name` text
);
--> statement-breakpoint
CREATE TABLE `location_mapping` (
	`uuid` text PRIMARY KEY NOT NULL,
	`parent_uuid` text,
	`child_uuid` text,
	`voided` integer DEFAULT 0,
	FOREIGN KEY (`parent_uuid`) REFERENCES `address_level`(`uuid`) ON UPDATE no action ON DELETE no action,
	FOREIGN KEY (`child_uuid`) REFERENCES `address_level`(`uuid`) ON UPDATE no action ON DELETE no action
);
--> statement-breakpoint
CREATE INDEX `idx_location_mapping_parent_uuid` ON `location_mapping` (`parent_uuid`);--> statement-breakpoint
CREATE INDEX `idx_location_mapping_child_uuid` ON `location_mapping` (`child_uuid`);--> statement-breakpoint
CREATE INDEX `idx_location_mapping_voided` ON `location_mapping` (`voided`);--> statement-breakpoint
CREATE TABLE `address_level` (
	`uuid` text PRIMARY KEY NOT NULL,
	`name` text,
	`level` real,
	`type` text,
	`location_properties` text DEFAULT '[]',
	`title_lineage` text,
	`voided` integer DEFAULT 0,
	`parent_uuid` text,
	`type_uuid` text
);
--> statement-breakpoint
CREATE INDEX `idx_address_level_voided` ON `address_level` (`voided`);--> statement-breakpoint
CREATE TABLE `form` (
	`uuid` text PRIMARY KEY NOT NULL,
	`form_type` text,
	`name` text,
	`decision_rule` text,
	`edit_form_rule` text,
	`visit_schedule_rule` text,
	`validation_rule` text,
	`checklists_rule` text,
	`task_schedule_rule` text
);
--> statement-breakpoint
CREATE TABLE `form_mapping` (
	`uuid` text PRIMARY KEY NOT NULL,
	`form_uuid` text,
	`subject_type_uuid` text,
	`entity_uuid` text,
	`observations_type_entity_uuid` text,
	`voided` integer DEFAULT 0,
	`enable_approval` integer DEFAULT 0,
	`task_type_uuid` text,
	FOREIGN KEY (`form_uuid`) REFERENCES `form`(`uuid`) ON UPDATE no action ON DELETE no action,
	FOREIGN KEY (`subject_type_uuid`) REFERENCES `subject_type`(`uuid`) ON UPDATE no action ON DELETE no action,
	FOREIGN KEY (`task_type_uuid`) REFERENCES `task_type`(`uuid`) ON UPDATE no action ON DELETE no action
);
--> statement-breakpoint
CREATE INDEX `idx_form_mapping_form_uuid` ON `form_mapping` (`form_uuid`);--> statement-breakpoint
CREATE INDEX `idx_form_mapping_subject_type_uuid` ON `form_mapping` (`subject_type_uuid`);--> statement-breakpoint
CREATE INDEX `idx_form_mapping_task_type_uuid` ON `form_mapping` (`task_type_uuid`);--> statement-breakpoint
CREATE INDEX `idx_form_mapping_voided` ON `form_mapping` (`voided`);--> statement-breakpoint
CREATE TABLE `form_element_group` (
	`uuid` text PRIMARY KEY NOT NULL,
	`name` text,
	`display_order` real,
	`form_uuid` text,
	`voided` integer DEFAULT 0,
	`rule` text,
	`start_time` integer,
	`stay_time` integer,
	`timed` integer DEFAULT 0,
	`text_colour` text,
	`background_colour` text,
	FOREIGN KEY (`form_uuid`) REFERENCES `form`(`uuid`) ON UPDATE no action ON DELETE no action
);
--> statement-breakpoint
CREATE INDEX `idx_form_element_group_form_uuid` ON `form_element_group` (`form_uuid`);--> statement-breakpoint
CREATE INDEX `idx_form_element_group_voided` ON `form_element_group` (`voided`);--> statement-breakpoint
CREATE TABLE `form_element` (
	`uuid` text PRIMARY KEY NOT NULL,
	`name` text,
	`display_order` real,
	`mandatory` integer,
	`key_values` text DEFAULT '[]',
	`concept_uuid` text,
	`type` text,
	`form_element_group_uuid` text,
	`valid_format` text,
	`voided` integer DEFAULT 0,
	`rule` text,
	`group_uuid` text,
	`documentation_uuid` text,
	FOREIGN KEY (`concept_uuid`) REFERENCES `concept`(`uuid`) ON UPDATE no action ON DELETE no action,
	FOREIGN KEY (`form_element_group_uuid`) REFERENCES `form_element_group`(`uuid`) ON UPDATE no action ON DELETE no action,
	FOREIGN KEY (`documentation_uuid`) REFERENCES `documentation`(`uuid`) ON UPDATE no action ON DELETE no action
);
--> statement-breakpoint
CREATE INDEX `idx_form_element_concept_uuid` ON `form_element` (`concept_uuid`);--> statement-breakpoint
CREATE INDEX `idx_form_element_form_element_group_uuid` ON `form_element` (`form_element_group_uuid`);--> statement-breakpoint
CREATE INDEX `idx_form_element_documentation_uuid` ON `form_element` (`documentation_uuid`);--> statement-breakpoint
CREATE INDEX `idx_form_element_voided` ON `form_element` (`voided`);--> statement-breakpoint
CREATE TABLE `subject_type` (
	`uuid` text PRIMARY KEY NOT NULL,
	`name` text,
	`group` integer DEFAULT 0,
	`household` integer DEFAULT 0,
	`voided` integer DEFAULT 0,
	`active` integer DEFAULT 1,
	`type` text,
	`subject_summary_rule` text,
	`program_eligibility_check_rule` text,
	`member_addition_eligibility_check_rule` text,
	`unique_name` integer DEFAULT 0,
	`valid_first_name_format` text,
	`valid_middle_name_format` text,
	`valid_last_name_format` text,
	`icon_file_s3_key` text,
	`sync_registration_concept1` text,
	`sync_registration_concept2` text,
	`allow_profile_picture` integer DEFAULT 0,
	`allow_middle_name` integer DEFAULT 0,
	`last_name_optional` integer DEFAULT 0,
	`directly_assignable` integer DEFAULT 0,
	`name_help_text` text,
	`settings` text DEFAULT '{}'
);
--> statement-breakpoint
CREATE INDEX `idx_subject_type_voided` ON `subject_type` (`voided`);--> statement-breakpoint
CREATE TABLE `individual` (
	`uuid` text PRIMARY KEY NOT NULL,
	`subject_type_uuid` text,
	`name` text,
	`first_name` text,
	`middle_name` text,
	`last_name` text,
	`profile_picture` text,
	`date_of_birth` integer,
	`date_of_birth_verified` integer,
	`gender_uuid` text,
	`registration_date` integer,
	`lowest_address_level_uuid` text,
	`voided` integer DEFAULT 0,
	`observations` text DEFAULT '[]',
	`registration_location` text,
	`subject_location` text,
	`latest_entity_approval_status_uuid` text,
	`created_by` text,
	`created_by_uuid` text,
	`last_modified_by` text,
	`last_modified_by_uuid` text,
	FOREIGN KEY (`subject_type_uuid`) REFERENCES `subject_type`(`uuid`) ON UPDATE no action ON DELETE no action,
	FOREIGN KEY (`gender_uuid`) REFERENCES `gender`(`uuid`) ON UPDATE no action ON DELETE no action,
	FOREIGN KEY (`lowest_address_level_uuid`) REFERENCES `address_level`(`uuid`) ON UPDATE no action ON DELETE no action,
	FOREIGN KEY (`latest_entity_approval_status_uuid`) REFERENCES `entity_approval_status`(`uuid`) ON UPDATE no action ON DELETE no action
);
--> statement-breakpoint
CREATE INDEX `idx_individual_subject_type_uuid` ON `individual` (`subject_type_uuid`);--> statement-breakpoint
CREATE INDEX `idx_individual_gender_uuid` ON `individual` (`gender_uuid`);--> statement-breakpoint
CREATE INDEX `idx_individual_lowest_address_level_uuid` ON `individual` (`lowest_address_level_uuid`);--> statement-breakpoint
CREATE INDEX `idx_individual_latest_entity_approval_status_uuid` ON `individual` (`latest_entity_approval_status_uuid`);--> statement-breakpoint
CREATE INDEX `idx_individual_voided` ON `individual` (`voided`);--> statement-breakpoint
CREATE TABLE `program` (
	`uuid` text PRIMARY KEY NOT NULL,
	`name` text,
	`operational_program_name` text,
	`display_name` text,
	`colour` text,
	`program_subject_label` text,
	`enrolment_summary_rule` text,
	`enrolment_eligibility_check_rule` text,
	`manual_eligibility_check_required` integer,
	`show_growth_chart` integer,
	`manual_enrolment_eligibility_check_rule` text,
	`voided` integer DEFAULT 0,
	`active` integer DEFAULT 1,
	`allow_multiple_enrolments` integer DEFAULT 0
);
--> statement-breakpoint
CREATE INDEX `idx_program_voided` ON `program` (`voided`);--> statement-breakpoint
CREATE TABLE `program_enrolment` (
	`uuid` text PRIMARY KEY NOT NULL,
	`program_uuid` text,
	`enrolment_date_time` integer,
	`observations` text DEFAULT '[]',
	`program_exit_date_time` integer,
	`program_exit_observations` text DEFAULT '[]',
	`individual_uuid` text,
	`enrolment_location` text,
	`exit_location` text,
	`voided` integer DEFAULT 0,
	`latest_entity_approval_status_uuid` text,
	`created_by` text,
	`created_by_uuid` text,
	`last_modified_by` text,
	`last_modified_by_uuid` text,
	FOREIGN KEY (`program_uuid`) REFERENCES `program`(`uuid`) ON UPDATE no action ON DELETE no action,
	FOREIGN KEY (`individual_uuid`) REFERENCES `individual`(`uuid`) ON UPDATE no action ON DELETE no action,
	FOREIGN KEY (`latest_entity_approval_status_uuid`) REFERENCES `entity_approval_status`(`uuid`) ON UPDATE no action ON DELETE no action
);
--> statement-breakpoint
CREATE INDEX `idx_program_enrolment_program_uuid` ON `program_enrolment` (`program_uuid`);--> statement-breakpoint
CREATE INDEX `idx_program_enrolment_individual_uuid` ON `program_enrolment` (`individual_uuid`);--> statement-breakpoint
CREATE INDEX `idx_program_enrolment_latest_entity_approval_status_uuid` ON `program_enrolment` (`latest_entity_approval_status_uuid`);--> statement-breakpoint
CREATE INDEX `idx_program_enrolment_voided` ON `program_enrolment` (`voided`);--> statement-breakpoint
CREATE TABLE `program_encounter` (
	`uuid` text PRIMARY KEY NOT NULL,
	`name` text,
	`encounter_type_uuid` text,
	`earliest_visit_date_time` integer,
	`max_visit_date_time` integer,
	`encounter_date_time` integer,
	`program_enrolment_uuid` text,
	`observations` text DEFAULT '[]',
	`cancel_date_time` integer,
	`cancel_observations` text DEFAULT '[]',
	`encounter_location` text,
	`cancel_location` text,
	`voided` integer DEFAULT 0,
	`latest_entity_approval_status_uuid` text,
	`created_by` text,
	`created_by_uuid` text,
	`last_modified_by` text,
	`last_modified_by_uuid` text,
	`filled_by` text,
	`filled_by_uuid` text,
	FOREIGN KEY (`encounter_type_uuid`) REFERENCES `encounter_type`(`uuid`) ON UPDATE no action ON DELETE no action,
	FOREIGN KEY (`program_enrolment_uuid`) REFERENCES `program_enrolment`(`uuid`) ON UPDATE no action ON DELETE no action,
	FOREIGN KEY (`latest_entity_approval_status_uuid`) REFERENCES `entity_approval_status`(`uuid`) ON UPDATE no action ON DELETE no action
);
--> statement-breakpoint
CREATE INDEX `idx_program_encounter_encounter_type_uuid` ON `program_encounter` (`encounter_type_uuid`);--> statement-breakpoint
CREATE INDEX `idx_program_encounter_program_enrolment_uuid` ON `program_encounter` (`program_enrolment_uuid`);--> statement-breakpoint
CREATE INDEX `idx_program_encounter_latest_entity_approval_status_uuid` ON `program_encounter` (`latest_entity_approval_status_uuid`);--> statement-breakpoint
CREATE INDEX `idx_program_encounter_voided` ON `program_encounter` (`voided`);--> statement-breakpoint
CREATE TABLE `encounter` (
	`uuid` text PRIMARY KEY NOT NULL,
	`encounter_type_uuid` text,
	`encounter_date_time` integer,
	`individual_uuid` text,
	`observations` text DEFAULT '[]',
	`encounter_location` text,
	`name` text,
	`earliest_visit_date_time` integer,
	`max_visit_date_time` integer,
	`cancel_date_time` integer,
	`cancel_observations` text DEFAULT '[]',
	`cancel_location` text,
	`voided` integer DEFAULT 0,
	`latest_entity_approval_status_uuid` text,
	`created_by` text,
	`created_by_uuid` text,
	`last_modified_by` text,
	`last_modified_by_uuid` text,
	`filled_by` text,
	`filled_by_uuid` text,
	FOREIGN KEY (`encounter_type_uuid`) REFERENCES `encounter_type`(`uuid`) ON UPDATE no action ON DELETE no action,
	FOREIGN KEY (`individual_uuid`) REFERENCES `individual`(`uuid`) ON UPDATE no action ON DELETE no action,
	FOREIGN KEY (`latest_entity_approval_status_uuid`) REFERENCES `entity_approval_status`(`uuid`) ON UPDATE no action ON DELETE no action
);
--> statement-breakpoint
CREATE INDEX `idx_encounter_encounter_type_uuid` ON `encounter` (`encounter_type_uuid`);--> statement-breakpoint
CREATE INDEX `idx_encounter_individual_uuid` ON `encounter` (`individual_uuid`);--> statement-breakpoint
CREATE INDEX `idx_encounter_latest_entity_approval_status_uuid` ON `encounter` (`latest_entity_approval_status_uuid`);--> statement-breakpoint
CREATE INDEX `idx_encounter_voided` ON `encounter` (`voided`);--> statement-breakpoint
CREATE TABLE `entity_sync_status` (
	`uuid` text PRIMARY KEY NOT NULL,
	`entity_name` text,
	`loaded_since` integer,
	`entity_type_uuid` text
);
--> statement-breakpoint
CREATE INDEX `idx_entity_sync_status_entity_name` ON `entity_sync_status` (`entity_name`);--> statement-breakpoint
CREATE TABLE `entity_queue` (
	`saved_at` integer,
	`entity_uuid` text,
	`entity` text
);
--> statement-breakpoint
CREATE TABLE `checklist` (
	`uuid` text PRIMARY KEY NOT NULL,
	`detail_uuid` text,
	`base_date` integer,
	`program_enrolment_uuid` text,
	`created_by` text,
	`created_by_uuid` text,
	`last_modified_by` text,
	`last_modified_by_uuid` text,
	FOREIGN KEY (`detail_uuid`) REFERENCES `checklist_detail`(`uuid`) ON UPDATE no action ON DELETE no action,
	FOREIGN KEY (`program_enrolment_uuid`) REFERENCES `program_enrolment`(`uuid`) ON UPDATE no action ON DELETE no action
);
--> statement-breakpoint
CREATE INDEX `idx_checklist_detail_uuid` ON `checklist` (`detail_uuid`);--> statement-breakpoint
CREATE INDEX `idx_checklist_program_enrolment_uuid` ON `checklist` (`program_enrolment_uuid`);--> statement-breakpoint
CREATE TABLE `checklist_item` (
	`uuid` text PRIMARY KEY NOT NULL,
	`detail_uuid` text,
	`completion_date` integer,
	`observations` text DEFAULT '[]',
	`checklist_uuid` text,
	`latest_entity_approval_status_uuid` text,
	`created_by` text,
	`created_by_uuid` text,
	`last_modified_by` text,
	`last_modified_by_uuid` text,
	FOREIGN KEY (`detail_uuid`) REFERENCES `checklist_item_detail`(`uuid`) ON UPDATE no action ON DELETE no action,
	FOREIGN KEY (`checklist_uuid`) REFERENCES `checklist`(`uuid`) ON UPDATE no action ON DELETE no action,
	FOREIGN KEY (`latest_entity_approval_status_uuid`) REFERENCES `entity_approval_status`(`uuid`) ON UPDATE no action ON DELETE no action
);
--> statement-breakpoint
CREATE INDEX `idx_checklist_item_detail_uuid` ON `checklist_item` (`detail_uuid`);--> statement-breakpoint
CREATE INDEX `idx_checklist_item_checklist_uuid` ON `checklist_item` (`checklist_uuid`);--> statement-breakpoint
CREATE INDEX `idx_checklist_item_latest_entity_approval_status_uuid` ON `checklist_item` (`latest_entity_approval_status_uuid`);--> statement-breakpoint
CREATE TABLE `user_info` (
	`uuid` text PRIMARY KEY NOT NULL,
	`username` text,
	`organisation_name` text,
	`settings` text,
	`name` text,
	`sync_settings` text,
	`user_uuid` text
);
--> statement-breakpoint
CREATE TABLE `family` (
	`uuid` text PRIMARY KEY NOT NULL,
	`registration_date` integer,
	`lowest_address_level_uuid` text,
	`head_of_family_uuid` text,
	`type_of_family` text,
	`household_number` text,
	`observations` text DEFAULT '[]',
	FOREIGN KEY (`lowest_address_level_uuid`) REFERENCES `address_level`(`uuid`) ON UPDATE no action ON DELETE no action,
	FOREIGN KEY (`head_of_family_uuid`) REFERENCES `individual`(`uuid`) ON UPDATE no action ON DELETE no action
);
--> statement-breakpoint
CREATE INDEX `idx_family_lowest_address_level_uuid` ON `family` (`lowest_address_level_uuid`);--> statement-breakpoint
CREATE INDEX `idx_family_head_of_family_uuid` ON `family` (`head_of_family_uuid`);--> statement-breakpoint
CREATE TABLE `individual_relation` (
	`uuid` text PRIMARY KEY NOT NULL,
	`name` text,
	`voided` integer DEFAULT 0
);
--> statement-breakpoint
CREATE INDEX `idx_individual_relation_voided` ON `individual_relation` (`voided`);--> statement-breakpoint
CREATE TABLE `individual_relation_gender_mapping` (
	`uuid` text PRIMARY KEY NOT NULL,
	`relation_uuid` text,
	`gender_uuid` text,
	`voided` integer DEFAULT 0,
	FOREIGN KEY (`relation_uuid`) REFERENCES `individual_relation`(`uuid`) ON UPDATE no action ON DELETE no action,
	FOREIGN KEY (`gender_uuid`) REFERENCES `gender`(`uuid`) ON UPDATE no action ON DELETE no action
);
--> statement-breakpoint
CREATE INDEX `idx_individual_relation_gender_mapping_relation_uuid` ON `individual_relation_gender_mapping` (`relation_uuid`);--> statement-breakpoint
CREATE INDEX `idx_individual_relation_gender_mapping_gender_uuid` ON `individual_relation_gender_mapping` (`gender_uuid`);--> statement-breakpoint
CREATE INDEX `idx_individual_relation_gender_mapping_voided` ON `individual_relation_gender_mapping` (`voided`);--> statement-breakpoint
CREATE TABLE `individual_relationship_type` (
	`uuid` text PRIMARY KEY NOT NULL,
	`name` text,
	`individual_a_is_to_b_relation_uuid` text,
	`individual_b_is_to_a_relation_uuid` text,
	`voided` integer DEFAULT 0,
	FOREIGN KEY (`individual_a_is_to_b_relation_uuid`) REFERENCES `individual_relation`(`uuid`) ON UPDATE no action ON DELETE no action,
	FOREIGN KEY (`individual_b_is_to_a_relation_uuid`) REFERENCES `individual_relation`(`uuid`) ON UPDATE no action ON DELETE no action
);
--> statement-breakpoint
CREATE INDEX `idx_individual_relationship_type_individual_a_is_to_b_relation_uuid` ON `individual_relationship_type` (`individual_a_is_to_b_relation_uuid`);--> statement-breakpoint
CREATE INDEX `idx_individual_relationship_type_individual_b_is_to_a_relation_uuid` ON `individual_relationship_type` (`individual_b_is_to_a_relation_uuid`);--> statement-breakpoint
CREATE INDEX `idx_individual_relationship_type_voided` ON `individual_relationship_type` (`voided`);--> statement-breakpoint
CREATE TABLE `individual_relationship` (
	`uuid` text PRIMARY KEY NOT NULL,
	`relationship_uuid` text,
	`individual_a_uuid` text,
	`individual_b_uuid` text,
	`enter_date_time` integer,
	`exit_date_time` integer,
	`exit_observations` text DEFAULT '[]',
	`voided` integer DEFAULT 0,
	`created_by` text,
	`created_by_uuid` text,
	`last_modified_by` text,
	`last_modified_by_uuid` text,
	FOREIGN KEY (`relationship_uuid`) REFERENCES `individual_relationship_type`(`uuid`) ON UPDATE no action ON DELETE no action,
	FOREIGN KEY (`individual_a_uuid`) REFERENCES `individual`(`uuid`) ON UPDATE no action ON DELETE no action,
	FOREIGN KEY (`individual_b_uuid`) REFERENCES `individual`(`uuid`) ON UPDATE no action ON DELETE no action
);
--> statement-breakpoint
CREATE INDEX `idx_individual_relationship_relationship_uuid` ON `individual_relationship` (`relationship_uuid`);--> statement-breakpoint
CREATE INDEX `idx_individual_relationship_individual_a_uuid` ON `individual_relationship` (`individual_a_uuid`);--> statement-breakpoint
CREATE INDEX `idx_individual_relationship_individual_b_uuid` ON `individual_relationship` (`individual_b_uuid`);--> statement-breakpoint
CREATE INDEX `idx_individual_relationship_voided` ON `individual_relationship` (`voided`);--> statement-breakpoint
CREATE TABLE `rule_dependency` (
	`uuid` text PRIMARY KEY NOT NULL,
	`code` text
);
--> statement-breakpoint
CREATE TABLE `rule` (
	`uuid` text PRIMARY KEY NOT NULL,
	`_entity_string` text,
	`type` text,
	`name` text,
	`fn_name` text,
	`execution_order` real,
	`voided` integer DEFAULT 0,
	`data` text
);
--> statement-breakpoint
CREATE INDEX `idx_rule_voided` ON `rule` (`voided`);--> statement-breakpoint
CREATE TABLE `checklist_detail` (
	`uuid` text PRIMARY KEY NOT NULL,
	`name` text,
	`voided` integer DEFAULT 0
);
--> statement-breakpoint
CREATE INDEX `idx_checklist_detail_voided` ON `checklist_detail` (`voided`);--> statement-breakpoint
CREATE TABLE `checklist_item_detail` (
	`uuid` text PRIMARY KEY NOT NULL,
	`concept_uuid` text,
	`state_config` text DEFAULT '[]',
	`form_uuid` text,
	`checklist_detail_uuid` text,
	`voided` integer DEFAULT 0,
	`dependent_on_uuid` text,
	`schedule_on_expiry_of_dependency` integer DEFAULT 0,
	`min_days_from_start_date` integer,
	`min_days_from_dependent` integer,
	`expires_after` integer,
	FOREIGN KEY (`concept_uuid`) REFERENCES `concept`(`uuid`) ON UPDATE no action ON DELETE no action,
	FOREIGN KEY (`form_uuid`) REFERENCES `form`(`uuid`) ON UPDATE no action ON DELETE no action,
	FOREIGN KEY (`checklist_detail_uuid`) REFERENCES `checklist_detail`(`uuid`) ON UPDATE no action ON DELETE no action,
	FOREIGN KEY (`dependent_on_uuid`) REFERENCES `checklist_item_detail`(`uuid`) ON UPDATE no action ON DELETE no action
);
--> statement-breakpoint
CREATE INDEX `idx_checklist_item_detail_concept_uuid` ON `checklist_item_detail` (`concept_uuid`);--> statement-breakpoint
CREATE INDEX `idx_checklist_item_detail_form_uuid` ON `checklist_item_detail` (`form_uuid`);--> statement-breakpoint
CREATE INDEX `idx_checklist_item_detail_checklist_detail_uuid` ON `checklist_item_detail` (`checklist_detail_uuid`);--> statement-breakpoint
CREATE INDEX `idx_checklist_item_detail_dependent_on_uuid` ON `checklist_item_detail` (`dependent_on_uuid`);--> statement-breakpoint
CREATE INDEX `idx_checklist_item_detail_voided` ON `checklist_item_detail` (`voided`);--> statement-breakpoint
CREATE TABLE `video_telemetric` (
	`uuid` text PRIMARY KEY NOT NULL,
	`video_uuid` text,
	`player_open_time` integer,
	`player_close_time` integer,
	`video_start_time` real,
	`video_end_time` real,
	FOREIGN KEY (`video_uuid`) REFERENCES `video`(`uuid`) ON UPDATE no action ON DELETE no action
);
--> statement-breakpoint
CREATE INDEX `idx_video_telemetric_video_uuid` ON `video_telemetric` (`video_uuid`);--> statement-breakpoint
CREATE TABLE `video` (
	`uuid` text PRIMARY KEY NOT NULL,
	`title` text,
	`file_path` text,
	`description` text,
	`duration` real,
	`voided` integer DEFAULT 0
);
--> statement-breakpoint
CREATE INDEX `idx_video_voided` ON `video` (`voided`);--> statement-breakpoint
CREATE TABLE `media_queue` (
	`uuid` text PRIMARY KEY NOT NULL,
	`entity_uuid` text,
	`entity_name` text,
	`entity_target_field` text,
	`file_name` text,
	`type` text,
	`concept_uuid` text
);
--> statement-breakpoint
CREATE TABLE `sync_telemetry` (
	`uuid` text PRIMARY KEY NOT NULL,
	`app_version` text,
	`android_version` text,
	`device_name` text,
	`sync_status` text,
	`sync_start_time` integer,
	`sync_end_time` integer,
	`entity_status` text,
	`sync_source` text,
	`device_info` text,
	`app_info` text
);
--> statement-breakpoint
CREATE TABLE `identifier_source` (
	`uuid` text PRIMARY KEY NOT NULL,
	`name` text
);
--> statement-breakpoint
CREATE TABLE `identifier_assignment` (
	`uuid` text PRIMARY KEY NOT NULL,
	`identifier_source_uuid` text,
	`identifier` text,
	`assignment_order` real,
	`individual_uuid` text,
	`voided` integer DEFAULT 0,
	`program_enrolment_uuid` text,
	`used` integer DEFAULT 0,
	`created_by` text,
	`created_by_uuid` text,
	`last_modified_by` text,
	`last_modified_by_uuid` text,
	FOREIGN KEY (`identifier_source_uuid`) REFERENCES `identifier_source`(`uuid`) ON UPDATE no action ON DELETE no action,
	FOREIGN KEY (`individual_uuid`) REFERENCES `individual`(`uuid`) ON UPDATE no action ON DELETE no action,
	FOREIGN KEY (`program_enrolment_uuid`) REFERENCES `program_enrolment`(`uuid`) ON UPDATE no action ON DELETE no action
);
--> statement-breakpoint
CREATE INDEX `idx_identifier_assignment_identifier_source_uuid` ON `identifier_assignment` (`identifier_source_uuid`);--> statement-breakpoint
CREATE INDEX `idx_identifier_assignment_individual_uuid` ON `identifier_assignment` (`individual_uuid`);--> statement-breakpoint
CREATE INDEX `idx_identifier_assignment_program_enrolment_uuid` ON `identifier_assignment` (`program_enrolment_uuid`);--> statement-breakpoint
CREATE INDEX `idx_identifier_assignment_voided` ON `identifier_assignment` (`voided`);--> statement-breakpoint
CREATE TABLE `rule_failure_telemetry` (
	`uuid` text PRIMARY KEY NOT NULL,
	`rule_uuid` text,
	`individual_uuid` text,
	`error_message` text,
	`stacktrace` text,
	`closed` integer DEFAULT 0,
	`error_date_time` integer,
	`source_type` text,
	`source_id` text,
	`entity_type` text,
	`entity_id` text,
	`app_type` text
);
--> statement-breakpoint
CREATE TABLE `beneficiary_mode_pin` (
	`pin` integer
);
--> statement-breakpoint
CREATE TABLE `organisation_config` (
	`uuid` text PRIMARY KEY NOT NULL,
	`settings` text,
	`worklist_updation_rule` text
);
--> statement-breakpoint
CREATE TABLE `platform_translation` (
	`uuid` text PRIMARY KEY NOT NULL,
	`language` text,
	`platform_translations` text
);
--> statement-breakpoint
CREATE TABLE `translation` (
	`uuid` text PRIMARY KEY NOT NULL,
	`language` text,
	`translations` text
);
--> statement-breakpoint
CREATE TABLE `groups` (
	`uuid` text PRIMARY KEY NOT NULL,
	`name` text,
	`has_all_privileges` integer DEFAULT 0
);
--> statement-breakpoint
CREATE TABLE `my_groups` (
	`uuid` text PRIMARY KEY NOT NULL,
	`group_uuid` text,
	`group_name` text,
	`voided` integer DEFAULT 0
);
--> statement-breakpoint
CREATE INDEX `idx_my_groups_voided` ON `my_groups` (`voided`);--> statement-breakpoint
CREATE TABLE `group_privileges` (
	`uuid` text PRIMARY KEY NOT NULL,
	`group_uuid` text,
	`privilege_uuid` text,
	`subject_type_uuid` text,
	`program_uuid` text,
	`program_encounter_type_uuid` text,
	`encounter_type_uuid` text,
	`checklist_detail_uuid` text,
	`allow` integer DEFAULT 0,
	FOREIGN KEY (`group_uuid`) REFERENCES `groups`(`uuid`) ON UPDATE no action ON DELETE no action,
	FOREIGN KEY (`privilege_uuid`) REFERENCES `privilege`(`uuid`) ON UPDATE no action ON DELETE no action
);
--> statement-breakpoint
CREATE INDEX `idx_group_privileges_group_uuid` ON `group_privileges` (`group_uuid`);--> statement-breakpoint
CREATE INDEX `idx_group_privileges_privilege_uuid` ON `group_privileges` (`privilege_uuid`);--> statement-breakpoint
CREATE TABLE `privilege` (
	`uuid` text PRIMARY KEY NOT NULL,
	`name` text,
	`description` text,
	`entity_type` text
);
--> statement-breakpoint
CREATE TABLE `group_role` (
	`uuid` text PRIMARY KEY NOT NULL,
	`group_subject_type_uuid` text,
	`member_subject_type_uuid` text,
	`role` text,
	`primary` integer DEFAULT 0,
	`maximum_number_of_members` real,
	`minimum_number_of_members` real,
	`voided` integer DEFAULT 0,
	FOREIGN KEY (`group_subject_type_uuid`) REFERENCES `subject_type`(`uuid`) ON UPDATE no action ON DELETE no action,
	FOREIGN KEY (`member_subject_type_uuid`) REFERENCES `subject_type`(`uuid`) ON UPDATE no action ON DELETE no action
);
--> statement-breakpoint
CREATE INDEX `idx_group_role_group_subject_type_uuid` ON `group_role` (`group_subject_type_uuid`);--> statement-breakpoint
CREATE INDEX `idx_group_role_member_subject_type_uuid` ON `group_role` (`member_subject_type_uuid`);--> statement-breakpoint
CREATE INDEX `idx_group_role_voided` ON `group_role` (`voided`);--> statement-breakpoint
CREATE TABLE `group_subject` (
	`uuid` text PRIMARY KEY NOT NULL,
	`group_subject_uuid` text,
	`member_subject_uuid` text,
	`group_role_uuid` text,
	`membership_start_date` integer,
	`membership_end_date` integer,
	`voided` integer DEFAULT 0,
	`created_by` text,
	`created_by_uuid` text,
	`last_modified_by` text,
	`last_modified_by_uuid` text,
	FOREIGN KEY (`group_subject_uuid`) REFERENCES `individual`(`uuid`) ON UPDATE no action ON DELETE no action,
	FOREIGN KEY (`member_subject_uuid`) REFERENCES `individual`(`uuid`) ON UPDATE no action ON DELETE no action,
	FOREIGN KEY (`group_role_uuid`) REFERENCES `group_role`(`uuid`) ON UPDATE no action ON DELETE no action
);
--> statement-breakpoint
CREATE INDEX `idx_group_subject_group_subject_uuid` ON `group_subject` (`group_subject_uuid`);--> statement-breakpoint
CREATE INDEX `idx_group_subject_member_subject_uuid` ON `group_subject` (`member_subject_uuid`);--> statement-breakpoint
CREATE INDEX `idx_group_subject_group_role_uuid` ON `group_subject` (`group_role_uuid`);--> statement-breakpoint
CREATE INDEX `idx_group_subject_voided` ON `group_subject` (`voided`);--> statement-breakpoint
CREATE TABLE `dashboard_cache` (
	`uuid` text PRIMARY KEY NOT NULL,
	`card_json` text,
	`filter_json` text
);
--> statement-breakpoint
CREATE TABLE `custom_dashboard_cache` (
	`uuid` text PRIMARY KEY NOT NULL,
	`dashboard_uuid` text,
	`updated_at` integer,
	`selected_values_json` text,
	`filter_applied` integer,
	`dashboard_filters_hash` text,
	`report_card_results` text DEFAULT '[]',
	`nested_report_card_results` text DEFAULT '[]',
	FOREIGN KEY (`dashboard_uuid`) REFERENCES `dashboard`(`uuid`) ON UPDATE no action ON DELETE no action
);
--> statement-breakpoint
CREATE INDEX `idx_custom_dashboard_cache_dashboard_uuid` ON `custom_dashboard_cache` (`dashboard_uuid`);--> statement-breakpoint
CREATE TABLE `location_hierarchy` (
	`uuid` text PRIMARY KEY NOT NULL,
	`name` text,
	`type` text,
	`level` real,
	`parent_uuid` text,
	`title_lineage` text,
	`voided` integer DEFAULT 0,
	`type_uuid` text
);
--> statement-breakpoint
CREATE INDEX `idx_location_hierarchy_voided` ON `location_hierarchy` (`voided`);--> statement-breakpoint
CREATE TABLE `report_card` (
	`uuid` text PRIMARY KEY NOT NULL,
	`name` text,
	`query` text,
	`description` text,
	`standard_report_card_type_uuid` text,
	`colour` text,
	`voided` integer DEFAULT 0,
	`nested` integer DEFAULT 0,
	`count_of_cards` integer DEFAULT 1,
	`standard_report_card_input_recent_duration_json` text,
	FOREIGN KEY (`standard_report_card_type_uuid`) REFERENCES `standard_report_card_type`(`uuid`) ON UPDATE no action ON DELETE no action
);
--> statement-breakpoint
CREATE INDEX `idx_report_card_standard_report_card_type_uuid` ON `report_card` (`standard_report_card_type_uuid`);--> statement-breakpoint
CREATE INDEX `idx_report_card_voided` ON `report_card` (`voided`);--> statement-breakpoint
CREATE TABLE `dashboard` (
	`uuid` text PRIMARY KEY NOT NULL,
	`name` text,
	`description` text,
	`voided` integer DEFAULT 0
);
--> statement-breakpoint
CREATE INDEX `idx_dashboard_voided` ON `dashboard` (`voided`);--> statement-breakpoint
CREATE TABLE `dashboard_section_card_mapping` (
	`uuid` text PRIMARY KEY NOT NULL,
	`dashboard_section_uuid` text,
	`card_uuid` text,
	`display_order` real,
	`voided` integer DEFAULT 0,
	FOREIGN KEY (`dashboard_section_uuid`) REFERENCES `dashboard_section`(`uuid`) ON UPDATE no action ON DELETE no action,
	FOREIGN KEY (`card_uuid`) REFERENCES `report_card`(`uuid`) ON UPDATE no action ON DELETE no action
);
--> statement-breakpoint
CREATE INDEX `idx_dashboard_section_card_mapping_dashboard_section_uuid` ON `dashboard_section_card_mapping` (`dashboard_section_uuid`);--> statement-breakpoint
CREATE INDEX `idx_dashboard_section_card_mapping_card_uuid` ON `dashboard_section_card_mapping` (`card_uuid`);--> statement-breakpoint
CREATE INDEX `idx_dashboard_section_card_mapping_voided` ON `dashboard_section_card_mapping` (`voided`);--> statement-breakpoint
CREATE TABLE `draft_subject` (
	`uuid` text PRIMARY KEY NOT NULL,
	`subject_type_uuid` text,
	`first_name` text,
	`last_name` text,
	`profile_picture` text,
	`date_of_birth` integer,
	`date_of_birth_verified` integer,
	`gender_uuid` text,
	`registration_date` integer,
	`lowest_address_level_uuid` text,
	`observations` text DEFAULT '[]',
	`registration_location` text,
	`updated_on` integer,
	`total_members` text,
	FOREIGN KEY (`subject_type_uuid`) REFERENCES `subject_type`(`uuid`) ON UPDATE no action ON DELETE no action,
	FOREIGN KEY (`gender_uuid`) REFERENCES `gender`(`uuid`) ON UPDATE no action ON DELETE no action,
	FOREIGN KEY (`lowest_address_level_uuid`) REFERENCES `address_level`(`uuid`) ON UPDATE no action ON DELETE no action
);
--> statement-breakpoint
CREATE INDEX `idx_draft_subject_subject_type_uuid` ON `draft_subject` (`subject_type_uuid`);--> statement-breakpoint
CREATE INDEX `idx_draft_subject_gender_uuid` ON `draft_subject` (`gender_uuid`);--> statement-breakpoint
CREATE INDEX `idx_draft_subject_lowest_address_level_uuid` ON `draft_subject` (`lowest_address_level_uuid`);--> statement-breakpoint
CREATE TABLE `standard_report_card_type` (
	`uuid` text PRIMARY KEY NOT NULL,
	`name` text,
	`description` text,
	`type` text,
	`voided` integer DEFAULT 0
);
--> statement-breakpoint
CREATE INDEX `idx_standard_report_card_type_voided` ON `standard_report_card_type` (`voided`);--> statement-breakpoint
CREATE TABLE `approval_status` (
	`uuid` text PRIMARY KEY NOT NULL,
	`status` text,
	`voided` integer DEFAULT 0
);
--> statement-breakpoint
CREATE INDEX `idx_approval_status_voided` ON `approval_status` (`voided`);--> statement-breakpoint
CREATE TABLE `entity_approval_status` (
	`uuid` text PRIMARY KEY NOT NULL,
	`entity_uuid` text,
	`approval_status_uuid` text,
	`entity_type` text,
	`entity_type_uuid` text,
	`approval_status_comment` text,
	`status_date_time` integer,
	`auto_approved` integer DEFAULT 0,
	`voided` integer DEFAULT 0,
	`created_by` text,
	`created_by_uuid` text,
	`last_modified_by` text,
	`last_modified_by_uuid` text,
	FOREIGN KEY (`approval_status_uuid`) REFERENCES `approval_status`(`uuid`) ON UPDATE no action ON DELETE no action
);
--> statement-breakpoint
CREATE INDEX `idx_entity_approval_status_approval_status_uuid` ON `entity_approval_status` (`approval_status_uuid`);--> statement-breakpoint
CREATE INDEX `idx_entity_approval_status_voided` ON `entity_approval_status` (`voided`);--> statement-breakpoint
CREATE TABLE `group_dashboard` (
	`uuid` text PRIMARY KEY NOT NULL,
	`primary_dashboard` integer DEFAULT 0,
	`secondary_dashboard` integer DEFAULT 0,
	`group_uuid` text,
	`dashboard_uuid` text,
	`voided` integer DEFAULT 0,
	FOREIGN KEY (`group_uuid`) REFERENCES `groups`(`uuid`) ON UPDATE no action ON DELETE no action,
	FOREIGN KEY (`dashboard_uuid`) REFERENCES `dashboard`(`uuid`) ON UPDATE no action ON DELETE no action
);
--> statement-breakpoint
CREATE INDEX `idx_group_dashboard_group_uuid` ON `group_dashboard` (`group_uuid`);--> statement-breakpoint
CREATE INDEX `idx_group_dashboard_dashboard_uuid` ON `group_dashboard` (`dashboard_uuid`);--> statement-breakpoint
CREATE INDEX `idx_group_dashboard_voided` ON `group_dashboard` (`voided`);--> statement-breakpoint
CREATE TABLE `dashboard_section` (
	`uuid` text PRIMARY KEY NOT NULL,
	`dashboard_uuid` text,
	`name` text,
	`description` text,
	`view_type` text,
	`display_order` real,
	`voided` integer DEFAULT 0,
	FOREIGN KEY (`dashboard_uuid`) REFERENCES `dashboard`(`uuid`) ON UPDATE no action ON DELETE no action
);
--> statement-breakpoint
CREATE INDEX `idx_dashboard_section_dashboard_uuid` ON `dashboard_section` (`dashboard_uuid`);--> statement-breakpoint
CREATE INDEX `idx_dashboard_section_voided` ON `dashboard_section` (`voided`);--> statement-breakpoint
CREATE TABLE `news` (
	`uuid` text PRIMARY KEY NOT NULL,
	`title` text,
	`published_date` integer,
	`hero_image` text,
	`content` text,
	`content_html` text,
	`voided` integer DEFAULT 0,
	`read` integer DEFAULT 0,
	`last_modified_date_time` integer
);
--> statement-breakpoint
CREATE INDEX `idx_news_voided` ON `news` (`voided`);--> statement-breakpoint
CREATE TABLE `comment` (
	`uuid` text PRIMARY KEY NOT NULL,
	`text` text,
	`subject_uuid` text,
	`display_username` text,
	`created_by_username` text,
	`created_date_time` integer,
	`last_modified_date_time` integer,
	`comment_thread_uuid` text,
	`voided` integer DEFAULT 0,
	`created_by` text,
	`created_by_uuid` text,
	`last_modified_by` text,
	`last_modified_by_uuid` text,
	FOREIGN KEY (`subject_uuid`) REFERENCES `individual`(`uuid`) ON UPDATE no action ON DELETE no action,
	FOREIGN KEY (`comment_thread_uuid`) REFERENCES `comment_thread`(`uuid`) ON UPDATE no action ON DELETE no action
);
--> statement-breakpoint
CREATE INDEX `idx_comment_subject_uuid` ON `comment` (`subject_uuid`);--> statement-breakpoint
CREATE INDEX `idx_comment_comment_thread_uuid` ON `comment` (`comment_thread_uuid`);--> statement-breakpoint
CREATE INDEX `idx_comment_voided` ON `comment` (`voided`);--> statement-breakpoint
CREATE TABLE `comment_thread` (
	`uuid` text PRIMARY KEY NOT NULL,
	`status` text,
	`open_date_time` integer,
	`resolved_date_time` integer,
	`voided` integer DEFAULT 0
);
--> statement-breakpoint
CREATE INDEX `idx_comment_thread_voided` ON `comment_thread` (`voided`);--> statement-breakpoint
CREATE TABLE `extension` (
	`url` text PRIMARY KEY NOT NULL,
	`last_modified_date_time` integer
);
--> statement-breakpoint
CREATE TABLE `subject_migration` (
	`uuid` text PRIMARY KEY NOT NULL,
	`subject_uuid` text,
	`old_address_level_uuid` text,
	`new_address_level_uuid` text,
	`old_sync_concept1_value` text,
	`new_sync_concept1_value` text,
	`old_sync_concept2_value` text,
	`new_sync_concept2_value` text,
	`subject_type_uuid` text,
	`has_migrated` integer DEFAULT 0,
	`created_by` text,
	`created_by_uuid` text,
	`last_modified_by` text,
	`last_modified_by_uuid` text
);
--> statement-breakpoint
CREATE TABLE `reset_sync` (
	`uuid` text PRIMARY KEY NOT NULL,
	`subject_type_uuid` text,
	`has_migrated` integer DEFAULT 0,
	`voided` integer DEFAULT 0
);
--> statement-breakpoint
CREATE INDEX `idx_reset_sync_voided` ON `reset_sync` (`voided`);--> statement-breakpoint
CREATE TABLE `documentation` (
	`uuid` text PRIMARY KEY NOT NULL,
	`name` text,
	`voided` integer DEFAULT 0
);
--> statement-breakpoint
CREATE INDEX `idx_documentation_voided` ON `documentation` (`voided`);--> statement-breakpoint
CREATE TABLE `documentation_item` (
	`uuid` text PRIMARY KEY NOT NULL,
	`content` text,
	`language` text,
	`content_html` text,
	`documentation_uuid` text,
	`voided` integer DEFAULT 0,
	FOREIGN KEY (`documentation_uuid`) REFERENCES `documentation`(`uuid`) ON UPDATE no action ON DELETE no action
);
--> statement-breakpoint
CREATE INDEX `idx_documentation_item_documentation_uuid` ON `documentation_item` (`documentation_uuid`);--> statement-breakpoint
CREATE INDEX `idx_documentation_item_voided` ON `documentation_item` (`voided`);--> statement-breakpoint
CREATE TABLE `task_type` (
	`uuid` text PRIMARY KEY NOT NULL,
	`name` text,
	`type` text,
	`voided` integer DEFAULT 0
);
--> statement-breakpoint
CREATE INDEX `idx_task_type_voided` ON `task_type` (`voided`);--> statement-breakpoint
CREATE TABLE `task_status` (
	`uuid` text PRIMARY KEY NOT NULL,
	`name` text,
	`is_terminal` integer DEFAULT 0,
	`task_type_uuid` text,
	`voided` integer DEFAULT 0,
	FOREIGN KEY (`task_type_uuid`) REFERENCES `task_type`(`uuid`) ON UPDATE no action ON DELETE no action
);
--> statement-breakpoint
CREATE INDEX `idx_task_status_task_type_uuid` ON `task_status` (`task_type_uuid`);--> statement-breakpoint
CREATE INDEX `idx_task_status_voided` ON `task_status` (`voided`);--> statement-breakpoint
CREATE TABLE `task` (
	`uuid` text PRIMARY KEY NOT NULL,
	`name` text,
	`task_type_uuid` text,
	`task_status_uuid` text,
	`scheduled_on` integer,
	`completed_on` integer,
	`metadata` text DEFAULT '[]',
	`subject_uuid` text,
	`observations` text DEFAULT '[]',
	`voided` integer DEFAULT 0,
	`created_by` text,
	`created_by_uuid` text,
	`last_modified_by` text,
	`last_modified_by_uuid` text,
	FOREIGN KEY (`task_type_uuid`) REFERENCES `task_type`(`uuid`) ON UPDATE no action ON DELETE no action,
	FOREIGN KEY (`task_status_uuid`) REFERENCES `task_status`(`uuid`) ON UPDATE no action ON DELETE no action,
	FOREIGN KEY (`subject_uuid`) REFERENCES `individual`(`uuid`) ON UPDATE no action ON DELETE no action
);
--> statement-breakpoint
CREATE INDEX `idx_task_task_type_uuid` ON `task` (`task_type_uuid`);--> statement-breakpoint
CREATE INDEX `idx_task_task_status_uuid` ON `task` (`task_status_uuid`);--> statement-breakpoint
CREATE INDEX `idx_task_subject_uuid` ON `task` (`subject_uuid`);--> statement-breakpoint
CREATE INDEX `idx_task_voided` ON `task` (`voided`);--> statement-breakpoint
CREATE TABLE `task_un_assignment` (
	`uuid` text PRIMARY KEY NOT NULL,
	`task_uuid` text,
	`has_migrated` integer DEFAULT 0,
	`created_by` text,
	`created_by_uuid` text,
	`last_modified_by` text,
	`last_modified_by_uuid` text
);
--> statement-breakpoint
CREATE TABLE `draft_encounter` (
	`uuid` text PRIMARY KEY NOT NULL,
	`encounter_type_uuid` text,
	`encounter_date_time` integer,
	`individual_uuid` text,
	`observations` text DEFAULT '[]',
	`encounter_location` text,
	`name` text,
	`earliest_visit_date_time` integer,
	`max_visit_date_time` integer,
	`cancel_date_time` integer,
	`cancel_observations` text DEFAULT '[]',
	`cancel_location` text,
	`voided` integer DEFAULT 0,
	`updated_on` integer,
	FOREIGN KEY (`encounter_type_uuid`) REFERENCES `encounter_type`(`uuid`) ON UPDATE no action ON DELETE no action,
	FOREIGN KEY (`individual_uuid`) REFERENCES `individual`(`uuid`) ON UPDATE no action ON DELETE no action
);
--> statement-breakpoint
CREATE INDEX `idx_draft_encounter_encounter_type_uuid` ON `draft_encounter` (`encounter_type_uuid`);--> statement-breakpoint
CREATE INDEX `idx_draft_encounter_individual_uuid` ON `draft_encounter` (`individual_uuid`);--> statement-breakpoint
CREATE INDEX `idx_draft_encounter_voided` ON `draft_encounter` (`voided`);--> statement-breakpoint
CREATE TABLE `draft_enrolment` (
	`uuid` text PRIMARY KEY NOT NULL,
	`program_uuid` text,
	`enrolment_date_time` integer,
	`individual_uuid` text,
	`observations` text DEFAULT '[]',
	`enrolment_location` text,
	`program_exit_date_time` integer,
	`program_exit_observations` text DEFAULT '[]',
	`exit_location` text,
	`voided` integer DEFAULT 0,
	`updated_on` integer,
	FOREIGN KEY (`program_uuid`) REFERENCES `program`(`uuid`) ON UPDATE no action ON DELETE no action,
	FOREIGN KEY (`individual_uuid`) REFERENCES `individual`(`uuid`) ON UPDATE no action ON DELETE no action
);
--> statement-breakpoint
CREATE INDEX `idx_draft_enrolment_program_uuid` ON `draft_enrolment` (`program_uuid`);--> statement-breakpoint
CREATE INDEX `idx_draft_enrolment_individual_uuid` ON `draft_enrolment` (`individual_uuid`);--> statement-breakpoint
CREATE INDEX `idx_draft_enrolment_voided` ON `draft_enrolment` (`voided`);--> statement-breakpoint
CREATE TABLE `draft_program_encounter` (
	`uuid` text PRIMARY KEY NOT NULL,
	`name` text,
	`encounter_type_uuid` text,
	`earliest_visit_date_time` integer,
	`max_visit_date_time` integer,
	`encounter_date_time` integer,
	`program_enrolment_uuid` text,
	`observations` text DEFAULT '[]',
	`cancel_date_time` integer,
	`cancel_observations` text DEFAULT '[]',
	`encounter_location` text,
	`cancel_location` text,
	`voided` integer DEFAULT 0,
	`updated_on` integer,
	FOREIGN KEY (`encounter_type_uuid`) REFERENCES `encounter_type`(`uuid`) ON UPDATE no action ON DELETE no action,
	FOREIGN KEY (`program_enrolment_uuid`) REFERENCES `program_enrolment`(`uuid`) ON UPDATE no action ON DELETE no action
);
--> statement-breakpoint
CREATE INDEX `idx_draft_program_encounter_encounter_type_uuid` ON `draft_program_encounter` (`encounter_type_uuid`);--> statement-breakpoint
CREATE INDEX `idx_draft_program_encounter_program_enrolment_uuid` ON `draft_program_encounter` (`program_enrolment_uuid`);--> statement-breakpoint
CREATE INDEX `idx_draft_program_encounter_voided` ON `draft_program_encounter` (`voided`);--> statement-breakpoint
CREATE TABLE `subject_program_eligibility` (
	`uuid` text PRIMARY KEY NOT NULL,
	`subject_uuid` text,
	`program_uuid` text,
	`check_date` integer,
	`eligible` integer DEFAULT 0,
	`observations` text DEFAULT '[]',
	`voided` integer DEFAULT 0,
	`created_by` text,
	`created_by_uuid` text,
	`last_modified_by` text,
	`last_modified_by_uuid` text,
	FOREIGN KEY (`subject_uuid`) REFERENCES `individual`(`uuid`) ON UPDATE no action ON DELETE no action,
	FOREIGN KEY (`program_uuid`) REFERENCES `program`(`uuid`) ON UPDATE no action ON DELETE no action
);
--> statement-breakpoint
CREATE INDEX `idx_subject_program_eligibility_subject_uuid` ON `subject_program_eligibility` (`subject_uuid`);--> statement-breakpoint
CREATE INDEX `idx_subject_program_eligibility_program_uuid` ON `subject_program_eligibility` (`program_uuid`);--> statement-breakpoint
CREATE INDEX `idx_subject_program_eligibility_voided` ON `subject_program_eligibility` (`voided`);--> statement-breakpoint
CREATE TABLE `menu_item` (
	`uuid` text PRIMARY KEY NOT NULL,
	`display_key` text,
	`type` text,
	`icon` text,
	`group` text,
	`link_function` text,
	`voided` integer DEFAULT 0
);
--> statement-breakpoint
CREATE INDEX `idx_menu_item_voided` ON `menu_item` (`voided`);--> statement-breakpoint
CREATE TABLE `user_subject_assignment` (
	`uuid` text PRIMARY KEY NOT NULL,
	`subject_uuid` text,
	`created_by` text,
	`created_by_uuid` text,
	`last_modified_by` text,
	`last_modified_by_uuid` text
);
