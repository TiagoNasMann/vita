ALTER TABLE `events` ADD `sequence` integer DEFAULT 0 NOT NULL;--> statement-breakpoint
ALTER TABLE `messages` ADD `sequence` integer DEFAULT 0 NOT NULL;