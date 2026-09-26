ALTER TABLE "product_description_jobs" ADD COLUMN "evidence_hash" text;--> statement-breakpoint
ALTER TABLE "product_description_jobs" ADD COLUMN "base_description_hash" text;--> statement-breakpoint
ALTER TABLE "product_description_jobs" ADD COLUMN "candidate_document" text;--> statement-breakpoint
ALTER TABLE "product_description_jobs" ADD COLUMN "candidate_html" text;--> statement-breakpoint
ALTER TABLE "product_description_jobs" ADD COLUMN "writer_model" text;--> statement-breakpoint
ALTER TABLE "product_description_jobs" ADD COLUMN "reviewer_model" text;--> statement-breakpoint
ALTER TABLE "product_description_jobs" ADD COLUMN "writer_prompt_version" text;--> statement-breakpoint
ALTER TABLE "product_description_jobs" ADD COLUMN "reviewer_prompt_version" text;--> statement-breakpoint
ALTER TABLE "product_description_jobs" ADD COLUMN "renderer_version" text;--> statement-breakpoint
ALTER TABLE "product_description_jobs" ADD COLUMN "applied_at" timestamp;--> statement-breakpoint
ALTER TABLE "translation_jobs" ADD COLUMN "source_hash" text;--> statement-breakpoint
ALTER TABLE "translation_jobs" ADD COLUMN "model" text;--> statement-breakpoint
ALTER TABLE "translation_jobs" ADD COLUMN "prompt_version" text;--> statement-breakpoint
ALTER TABLE "translations" ADD COLUMN "source_hash" text;--> statement-breakpoint
ALTER TABLE "translations" ADD COLUMN "model" text;--> statement-breakpoint
ALTER TABLE "translations" ADD COLUMN "prompt_version" text;