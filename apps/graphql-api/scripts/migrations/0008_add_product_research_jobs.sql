CREATE TABLE "product_research_jobs" (
	"id" text PRIMARY KEY NOT NULL,
	"request_key" text NOT NULL,
	"official_url" text NOT NULL,
	"status" text DEFAULT 'pending' NOT NULL,
	"stage" text,
	"error_code" text,
	"error_message" text,
	"result_json" text,
	"source_snapshot_hash" text,
	"prompt_version" text,
	"model" text,
	"lease_token" text,
	"lease_until" timestamp,
	"attempt_count" integer DEFAULT 0 NOT NULL,
	"materialized_product_id" text,
	"applied_at" timestamp,
	"created_at" timestamp DEFAULT now() NOT NULL,
	"updated_at" timestamp DEFAULT now() NOT NULL,
	CONSTRAINT "product_research_jobs_request_key_unique" UNIQUE("request_key")
);
--> statement-breakpoint
CREATE INDEX "product_research_jobs_request_key_idx" ON "product_research_jobs" USING btree ("request_key");