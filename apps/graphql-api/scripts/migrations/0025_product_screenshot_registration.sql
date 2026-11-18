CREATE TABLE "product_screenshot_registrations" (
	"product_id" varchar(26) NOT NULL,
	"request_id" uuid NOT NULL,
	"screenshot_id" varchar(26) NOT NULL,
	"input_fingerprint" text NOT NULL,
	CONSTRAINT "product_screenshot_registrations_product_id_request_id_pk" PRIMARY KEY("product_id","request_id")
);
--> statement-breakpoint
ALTER TABLE "product_screenshot_registrations" ADD CONSTRAINT "product_screenshot_registrations_product_id_products_id_fk" FOREIGN KEY ("product_id") REFERENCES "public"."products"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
CREATE INDEX "product_screenshots_image_url_idx" ON "product_screenshots" USING hash ("image_url");