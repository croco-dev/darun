CREATE TABLE "screenshot_cleanup_intents" (
	"id" text PRIMARY KEY NOT NULL,
	"screenshot_id" text NOT NULL,
	"image_url" text NOT NULL,
	"status" text DEFAULT 'pending' NOT NULL,
	"attempt_count" integer DEFAULT 0 NOT NULL,
	"error" text,
	"lease_token" text,
	"lease_until" timestamp,
	"retry_after" timestamp DEFAULT now() NOT NULL,
	"dispatch_after" timestamp DEFAULT now() NOT NULL,
	"created_at" timestamp DEFAULT now() NOT NULL,
	"updated_at" timestamp DEFAULT now() NOT NULL,
	CONSTRAINT "screenshot_cleanup_intents_screenshot_id_unique" UNIQUE("screenshot_id")
);
--> statement-breakpoint
CREATE INDEX "screenshot_cleanup_recovery" ON "screenshot_cleanup_intents" USING btree ("status","retry_after");