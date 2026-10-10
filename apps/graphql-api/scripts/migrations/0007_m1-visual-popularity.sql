CREATE TABLE "visual_saves" (
	"id" varchar(26) PRIMARY KEY NOT NULL,
	"user_id" varchar(26) NOT NULL,
	"screenshot_id" varchar(26),
	"flow_id" varchar(26),
	"created_at" timestamp DEFAULT CURRENT_TIMESTAMP NOT NULL,
	CONSTRAINT "visual_saves_target_check" CHECK (num_nonnulls("visual_saves"."screenshot_id", "visual_saves"."flow_id") = 1)
);
--> statement-breakpoint
CREATE TABLE "visual_view_events" (
	"id" varchar(26) PRIMARY KEY NOT NULL,
	"screenshot_id" varchar(26),
	"flow_id" varchar(26),
	"viewer_hash" varchar(64) NOT NULL,
	"created_at" timestamp DEFAULT CURRENT_TIMESTAMP NOT NULL,
	CONSTRAINT "visual_view_events_target_check" CHECK (num_nonnulls("visual_view_events"."screenshot_id", "visual_view_events"."flow_id") = 1)
);
--> statement-breakpoint
ALTER TABLE "visual_saves" ADD CONSTRAINT "visual_saves_screenshot_id_product_screenshots_id_fk" FOREIGN KEY ("screenshot_id") REFERENCES "public"."product_screenshots"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "visual_saves" ADD CONSTRAINT "visual_saves_flow_id_product_flows_id_fk" FOREIGN KEY ("flow_id") REFERENCES "public"."product_flows"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "visual_view_events" ADD CONSTRAINT "visual_view_events_screenshot_id_product_screenshots_id_fk" FOREIGN KEY ("screenshot_id") REFERENCES "public"."product_screenshots"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "visual_view_events" ADD CONSTRAINT "visual_view_events_flow_id_product_flows_id_fk" FOREIGN KEY ("flow_id") REFERENCES "public"."product_flows"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
CREATE UNIQUE INDEX "visual_saves_user_screenshot_unique" ON "visual_saves" USING btree ("user_id","screenshot_id");--> statement-breakpoint
CREATE UNIQUE INDEX "visual_saves_user_flow_unique" ON "visual_saves" USING btree ("user_id","flow_id");--> statement-breakpoint
CREATE INDEX "visual_saves_screenshot_idx" ON "visual_saves" USING btree ("screenshot_id");--> statement-breakpoint
CREATE INDEX "visual_saves_flow_idx" ON "visual_saves" USING btree ("flow_id");--> statement-breakpoint
CREATE INDEX "visual_saves_user_idx" ON "visual_saves" USING btree ("user_id");--> statement-breakpoint
CREATE INDEX "visual_view_events_screenshot_time_idx" ON "visual_view_events" USING btree ("screenshot_id","created_at");--> statement-breakpoint
CREATE INDEX "visual_view_events_flow_time_idx" ON "visual_view_events" USING btree ("flow_id","created_at");