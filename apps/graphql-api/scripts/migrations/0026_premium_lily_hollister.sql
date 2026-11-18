CREATE TYPE "public"."product_link_role" AS ENUM('official', 'download', 'documentation', 'social', 'other');--> statement-breakpoint
ALTER TABLE "product_links" ADD COLUMN "role" "product_link_role";--> statement-breakpoint
ALTER TABLE "product_links" ADD COLUMN "is_designated_primary" boolean DEFAULT false NOT NULL;--> statement-breakpoint
CREATE UNIQUE INDEX "product_links_designated_primary_unique" ON "product_links" USING btree ("product_id") WHERE "product_links"."is_designated_primary";