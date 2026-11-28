ALTER TABLE "product_description_jobs" ADD COLUMN "usage_conditions_snapshot" jsonb;--> statement-breakpoint
ALTER TABLE "products" ADD COLUMN "usage_conditions" jsonb;