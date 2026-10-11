CREATE TABLE "product_screenshot_ui_elements" (
	"id" varchar(26) PRIMARY KEY NOT NULL,
	"screenshot_id" varchar(26) NOT NULL,
	"element" varchar(32) NOT NULL,
	"created_at" timestamp DEFAULT CURRENT_TIMESTAMP NOT NULL,
	CONSTRAINT "product_screenshot_ui_elements_element_check" CHECK ("product_screenshot_ui_elements"."element" IN ('AVATAR', 'BADGE', 'BOTTOM_SHEET', 'BUTTON', 'CALENDAR', 'CARD', 'CAROUSEL', 'DROPDOWN', 'INPUT', 'LIST', 'MAP', 'MODAL', 'NAVIGATION_BAR', 'PAGINATION', 'PROGRESS', 'SEARCH_BAR', 'STEPPER', 'TAB_BAR', 'TABLE', 'TOGGLE'))
);
--> statement-breakpoint
ALTER TABLE "product_screenshot_ui_elements" ADD CONSTRAINT "product_screenshot_ui_elements_screenshot_id_product_screenshots_id_fk" FOREIGN KEY ("screenshot_id") REFERENCES "public"."product_screenshots"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
CREATE UNIQUE INDEX "product_screenshot_ui_elements_screenshot_element_unique" ON "product_screenshot_ui_elements" USING btree ("screenshot_id","element");--> statement-breakpoint
CREATE INDEX "product_screenshot_ui_elements_element_idx" ON "product_screenshot_ui_elements" USING btree ("element");