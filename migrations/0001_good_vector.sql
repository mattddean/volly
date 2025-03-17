CREATE TABLE `attendee_sets` (
	`id` integer PRIMARY KEY NOT NULL
);
--> statement-breakpoint
CREATE TABLE `attendee_sets_users` (
	`attendee_set_id` integer,
	`user_id` integer,
	FOREIGN KEY (`attendee_set_id`) REFERENCES `attendee_sets`(`id`) ON UPDATE no action ON DELETE no action,
	FOREIGN KEY (`user_id`) REFERENCES `users`(`id`) ON UPDATE no action ON DELETE no action
);
--> statement-breakpoint
CREATE TABLE `games` (
	`id` integer PRIMARY KEY NOT NULL,
	`matchups_id` integer,
	`team1_id` integer,
	`team2_id` integer,
	`team1_score` integer NOT NULL,
	`team2_score` integer NOT NULL,
	`date` text NOT NULL,
	FOREIGN KEY (`matchups_id`) REFERENCES `matchups`(`id`) ON UPDATE no action ON DELETE no action,
	FOREIGN KEY (`team1_id`) REFERENCES `teams`(`id`) ON UPDATE no action ON DELETE no action,
	FOREIGN KEY (`team2_id`) REFERENCES `teams`(`id`) ON UPDATE no action ON DELETE no action
);
--> statement-breakpoint
CREATE TABLE `matchups` (
	`id` integer PRIMARY KEY NOT NULL,
	`team1_id` integer,
	`team2_id` integer,
	FOREIGN KEY (`team1_id`) REFERENCES `teams`(`id`) ON UPDATE no action ON DELETE no action,
	FOREIGN KEY (`team2_id`) REFERENCES `teams`(`id`) ON UPDATE no action ON DELETE no action
);
--> statement-breakpoint
CREATE TABLE `teams` (
	`id` integer PRIMARY KEY NOT NULL,
	`name` text NOT NULL
);
--> statement-breakpoint
CREATE TABLE `teams_users` (
	`team_id` integer,
	`user_id` integer,
	FOREIGN KEY (`team_id`) REFERENCES `teams`(`id`) ON UPDATE no action ON DELETE no action,
	FOREIGN KEY (`user_id`) REFERENCES `users`(`id`) ON UPDATE no action ON DELETE no action
);
--> statement-breakpoint
DROP TABLE `posts`;