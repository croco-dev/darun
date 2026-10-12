ALTER TABLE "product_description_jobs" ADD COLUMN "lease_token" text;--> statement-breakpoint
ALTER TABLE "product_description_jobs" ADD COLUMN "lease_until" timestamp;--> statement-breakpoint
ALTER TABLE "product_description_jobs" ADD COLUMN "attempt_count" integer DEFAULT 0 NOT NULL;--> statement-breakpoint
ALTER TABLE "translation_jobs" ADD COLUMN "lease_token" text;--> statement-breakpoint
ALTER TABLE "translation_jobs" ADD COLUMN "lease_until" timestamp;--> statement-breakpoint
ALTER TABLE "translation_jobs" ADD COLUMN "attempt_count" integer DEFAULT 0 NOT NULL;