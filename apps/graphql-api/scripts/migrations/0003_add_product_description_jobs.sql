CREATE TABLE IF NOT EXISTS "product_description_jobs" (
	"id" text PRIMARY KEY NOT NULL,
	"product_id" text NOT NULL,
	"status" text DEFAULT 'pending' NOT NULL,
	"message" text,
	"error" text,
	"created_at" timestamp DEFAULT now() NOT NULL,
	"updated_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "product_description_jobs_product_idx" ON "product_description_jobs" USING btree ("product_id");
--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "product_description_jobs_status_idx" ON "product_description_jobs" USING btree ("status");
