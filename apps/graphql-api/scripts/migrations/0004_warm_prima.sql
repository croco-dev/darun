CREATE TABLE "product_flow_steps" (
	"flow_id" varchar(26) NOT NULL,
	"screenshot_id" varchar(26) NOT NULL,
	"position" integer NOT NULL,
	"caption" varchar(300) DEFAULT '' NOT NULL,
	CONSTRAINT "product_flow_steps_flow_id_position_pk" PRIMARY KEY("flow_id","position"),
	CONSTRAINT "product_flow_steps_position_check" CHECK ("product_flow_steps"."position" >= 0)
);
--> statement-breakpoint
CREATE TABLE "product_flows" (
	"id" varchar(26) PRIMARY KEY NOT NULL,
	"product_id" varchar(26) NOT NULL,
	"title" varchar(100) NOT NULL,
	"description" text DEFAULT '' NOT NULL,
	"platform" varchar(16) NOT NULL,
	"flow_type" varchar(32) NOT NULL,
	"created_at" timestamp DEFAULT CURRENT_TIMESTAMP NOT NULL,
	"updated_at" timestamp DEFAULT CURRENT_TIMESTAMP NOT NULL,
	CONSTRAINT "product_flows_platform_check" CHECK ("product_flows"."platform" IN ('WEB', 'IOS', 'ANDROID')),
	CONSTRAINT "product_flows_flow_type_check" CHECK ("product_flows"."flow_type" IN ('ONBOARDING', 'SIGN_UP', 'SIGN_IN', 'SEARCH', 'CHECKOUT', 'SETTINGS', 'OTHER'))
);
--> statement-breakpoint
ALTER TABLE "product_screenshots" ADD COLUMN "title" varchar(100);--> statement-breakpoint
ALTER TABLE "product_screenshots" ADD COLUMN "platform" varchar(16);--> statement-breakpoint
ALTER TABLE "product_screenshots" ADD COLUMN "screen_type" varchar(32);--> statement-breakpoint
ALTER TABLE "product_flow_steps" ADD CONSTRAINT "product_flow_steps_flow_id_product_flows_id_fk" FOREIGN KEY ("flow_id") REFERENCES "public"."product_flows"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "product_flow_steps" ADD CONSTRAINT "product_flow_steps_screenshot_id_product_screenshots_id_fk" FOREIGN KEY ("screenshot_id") REFERENCES "public"."product_screenshots"("id") ON DELETE restrict ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "product_flows" ADD CONSTRAINT "product_flows_product_id_products_id_fk" FOREIGN KEY ("product_id") REFERENCES "public"."products"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
CREATE UNIQUE INDEX "product_flow_steps_flow_id_screenshot_id_key" ON "product_flow_steps" USING btree ("flow_id","screenshot_id");--> statement-breakpoint
CREATE INDEX "product_flow_steps_screenshot_id_idx" ON "product_flow_steps" USING btree ("screenshot_id");--> statement-breakpoint
CREATE INDEX "product_flows_product_id_idx" ON "product_flows" USING btree ("product_id");--> statement-breakpoint
ALTER TABLE "product_screenshots" ADD CONSTRAINT "product_screenshots_platform_check" CHECK ("product_screenshots"."platform" IS NULL OR "product_screenshots"."platform" IN ('WEB', 'IOS', 'ANDROID'));--> statement-breakpoint
ALTER TABLE "product_screenshots" ADD CONSTRAINT "product_screenshots_screen_type_check" CHECK ("product_screenshots"."screen_type" IS NULL OR "product_screenshots"."screen_type" IN ('HOME', 'ONBOARDING', 'SIGN_UP', 'SIGN_IN', 'SEARCH', 'LIST', 'DETAIL', 'CHECKOUT', 'SETTINGS', 'OTHER'));