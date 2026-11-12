UPDATE `entity_sync_status` SET `loaded_since` = -2208988800000 WHERE `entity_name` = 'ReportCard';--> statement-breakpoint
ALTER TABLE `report_card` ADD `action_detail_approval_status` text;