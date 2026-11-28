CREATE TABLE "product_content_reviews" (
	"id" bigint PRIMARY KEY GENERATED ALWAYS AS IDENTITY (sequence name "product_content_reviews_id_seq" INCREMENT BY 1 MINVALUE 1 MAXVALUE 9223372036854775807 START WITH 1 CACHE 1),
	"product_id" varchar(26) NOT NULL,
	"reviewed_revision" bigint NOT NULL,
	"reviewer_id" text NOT NULL,
	"request_id" uuid NOT NULL,
	"reviewed_at" timestamp with time zone DEFAULT now() NOT NULL,
	"memo" text NOT NULL,
	"reference_url" text,
	"next_review_on" date,
	CONSTRAINT "product_content_reviews_request_unique" UNIQUE("product_id","reviewer_id","request_id")
);
--> statement-breakpoint
ALTER TABLE "product_content_reviews" ADD CONSTRAINT "product_content_reviews_product_id_products_id_fk" FOREIGN KEY ("product_id") REFERENCES "public"."products"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
CREATE INDEX "product_content_reviews_product_latest_idx" ON "product_content_reviews" USING btree ("product_id","id" DESC NULLS LAST);