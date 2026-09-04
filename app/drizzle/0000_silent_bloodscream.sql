CREATE TABLE `customers` (
	`id` text PRIMARY KEY NOT NULL,
	`name` text NOT NULL,
	`active` integer DEFAULT true NOT NULL,
	`sort_order` integer DEFAULT 0 NOT NULL,
	`created_at` integer DEFAULT (unixepoch()) NOT NULL
);
--> statement-breakpoint
CREATE UNIQUE INDEX `customers_name_unique` ON `customers` (`name`);--> statement-breakpoint
CREATE TABLE `production_entries` (
	`id` text PRIMARY KEY NOT NULL,
	`day` text NOT NULL,
	`product_id` text NOT NULL,
	`quantity` integer NOT NULL,
	`note` text,
	FOREIGN KEY (`product_id`) REFERENCES `products`(`id`) ON UPDATE no action ON DELETE no action
);
--> statement-breakpoint
CREATE UNIQUE INDEX `production_entries_day_product_id` ON `production_entries` (`day`,`product_id`);--> statement-breakpoint
CREATE INDEX `production_entries_day` ON `production_entries` (`day`);--> statement-breakpoint
CREATE TABLE `products` (
	`id` text PRIMARY KEY NOT NULL,
	`name` text NOT NULL,
	`active` integer DEFAULT true NOT NULL,
	`sort_order` integer DEFAULT 0 NOT NULL,
	`created_at` integer DEFAULT (unixepoch()) NOT NULL
);
--> statement-breakpoint
CREATE UNIQUE INDEX `products_name_unique` ON `products` (`name`);--> statement-breakpoint
CREATE TABLE `receipt_lines` (
	`id` text PRIMARY KEY NOT NULL,
	`receipt_id` integer NOT NULL,
	`product_id` text NOT NULL,
	`quantity` integer NOT NULL,
	`unit_price_cents` integer NOT NULL,
	`line_total_cents` integer NOT NULL,
	FOREIGN KEY (`receipt_id`) REFERENCES `receipts`(`id`) ON UPDATE no action ON DELETE cascade,
	FOREIGN KEY (`product_id`) REFERENCES `products`(`id`) ON UPDATE no action ON DELETE no action
);
--> statement-breakpoint
CREATE INDEX `receipt_lines_receipt_id` ON `receipt_lines` (`receipt_id`);--> statement-breakpoint
CREATE TABLE `receipts` (
	`id` integer PRIMARY KEY AUTOINCREMENT NOT NULL,
	`day` text NOT NULL,
	`customer_id` text NOT NULL,
	`status` text DEFAULT 'DRAFT' NOT NULL,
	`total_cents` integer NOT NULL,
	`issued_at` integer,
	`created_at` integer DEFAULT (unixepoch()) NOT NULL,
	FOREIGN KEY (`customer_id`) REFERENCES `customers`(`id`) ON UPDATE no action ON DELETE no action
);
--> statement-breakpoint
CREATE UNIQUE INDEX `receipts_day_customer_id` ON `receipts` (`day`,`customer_id`);--> statement-breakpoint
CREATE INDEX `receipts_day` ON `receipts` (`day`);--> statement-breakpoint
CREATE TABLE `sale_entries` (
	`id` text PRIMARY KEY NOT NULL,
	`day` text NOT NULL,
	`product_id` text NOT NULL,
	`customer_id` text NOT NULL,
	`quantity` integer NOT NULL,
	`unit_price_cents` integer NOT NULL,
	FOREIGN KEY (`product_id`) REFERENCES `products`(`id`) ON UPDATE no action ON DELETE no action,
	FOREIGN KEY (`customer_id`) REFERENCES `customers`(`id`) ON UPDATE no action ON DELETE no action
);
--> statement-breakpoint
CREATE UNIQUE INDEX `sale_entries_day_product_id_customer_id` ON `sale_entries` (`day`,`product_id`,`customer_id`);--> statement-breakpoint
CREATE INDEX `sale_entries_day` ON `sale_entries` (`day`);--> statement-breakpoint
CREATE INDEX `sale_entries_day_customer_id` ON `sale_entries` (`day`,`customer_id`);--> statement-breakpoint
CREATE TABLE `stock_adjustments` (
	`id` text PRIMARY KEY NOT NULL,
	`day` text NOT NULL,
	`product_id` text NOT NULL,
	`counted_quantity` integer NOT NULL,
	`expected_quantity` integer NOT NULL,
	`delta_quantity` integer NOT NULL,
	`reason` text,
	`created_at` integer DEFAULT (unixepoch()) NOT NULL,
	FOREIGN KEY (`product_id`) REFERENCES `products`(`id`) ON UPDATE no action ON DELETE no action
);
--> statement-breakpoint
CREATE INDEX `stock_adjustments_day` ON `stock_adjustments` (`day`);--> statement-breakpoint
CREATE INDEX `stock_adjustments_product_id` ON `stock_adjustments` (`product_id`);