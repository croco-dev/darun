ALTER TABLE "product_description_jobs" ADD COLUMN "run_not_before" timestamp DEFAULT now() NOT NULL;--> statement-breakpoint
ALTER TABLE "product_description_jobs" ADD COLUMN "next_dispatch_at" timestamp DEFAULT now() NOT NULL;--> statement-breakpoint
ALTER TABLE "product_description_jobs" ADD COLUMN "retry_of_job_id" text;--> statement-breakpoint
ALTER TABLE "product_research_jobs" ADD COLUMN "run_not_before" timestamp DEFAULT now() NOT NULL;--> statement-breakpoint
ALTER TABLE "product_research_jobs" ADD COLUMN "next_dispatch_at" timestamp DEFAULT now() NOT NULL;--> statement-breakpoint
ALTER TABLE "product_research_jobs" ADD COLUMN "retry_of_job_id" text;--> statement-breakpoint
ALTER TABLE "translation_jobs" ADD COLUMN "run_not_before" timestamp DEFAULT now() NOT NULL;--> statement-breakpoint
ALTER TABLE "translation_jobs" ADD COLUMN "next_dispatch_at" timestamp DEFAULT now() NOT NULL;--> statement-breakpoint
ALTER TABLE "translation_jobs" ADD COLUMN "retry_of_job_id" text;