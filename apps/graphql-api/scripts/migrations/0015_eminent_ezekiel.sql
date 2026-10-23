CREATE TABLE "product_content_sync_intents" (
	"id" text PRIMARY KEY NOT NULL,
	"product_id" text NOT NULL,
	"source_revision" bigint NOT NULL,
	"kind" text NOT NULL,
	"status" text DEFAULT 'pending' NOT NULL,
	"attempt_count" integer DEFAULT 0 NOT NULL,
	"error" text,
	"translation_job_id" text,
	"lease_token" text,
	"lease_until" timestamp,
	"retry_after" timestamp DEFAULT now() NOT NULL,
	"created_at" timestamp DEFAULT now() NOT NULL,
	"dispatch_after" timestamp DEFAULT now() NOT NULL,
	"updated_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
ALTER TABLE "products" ADD COLUMN "content_revision" bigint DEFAULT 0 NOT NULL;--> statement-breakpoint
ALTER TABLE "translation_jobs" ADD COLUMN "idempotency_key" text;--> statement-breakpoint
ALTER TABLE "product_content_sync_intents" ADD CONSTRAINT "product_content_sync_intents_product_id_products_id_fk" FOREIGN KEY ("product_id") REFERENCES "public"."products"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
CREATE UNIQUE INDEX "product_content_sync_identity" ON "product_content_sync_intents" USING btree ("product_id","source_revision","kind");--> statement-breakpoint
CREATE INDEX "product_content_sync_recovery" ON "product_content_sync_intents" USING btree ("status","retry_after");--> statement-breakpoint
ALTER TABLE "translation_jobs" ADD CONSTRAINT "translation_jobs_idempotency_key_unique" UNIQUE("idempotency_key");