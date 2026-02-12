CREATE TABLE "translations" (
	"id" text PRIMARY KEY NOT NULL,
	"entity_type" text NOT NULL,
	"entity_id" text NOT NULL,
	"locale" text NOT NULL,
	"field" text NOT NULL,
	"value" text NOT NULL,
	"created_at" timestamp DEFAULT now() NOT NULL,
	"updated_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE UNIQUE INDEX "unique_translation" ON "translations" USING btree ("entity_type","entity_id","locale","field");--> statement-breakpoint
CREATE INDEX "entity_locale_idx" ON "translations" USING btree ("entity_type","entity_id","locale");